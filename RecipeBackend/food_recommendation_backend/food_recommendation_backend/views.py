from django.contrib.auth.decorators import login_required, user_passes_test
from django.shortcuts import render, redirect

from recipes.serializers import NotificationSerializer
from .forms import ProfileForm, UserPreferenceForm
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta
from django.utils import timezone
from allauth.socialaccount.models import SocialAccount
from django.contrib import messages
from recipes.models import Recipe, UserPreference
from food_recommendation_backend.models import CustomUser
from recipes.utils import send_batch_notifications
from rest_framework.response import Response
from rest_framework import status
import json
from django.conf import settings
 
BASEURL = 'https://' + settings.BASEURL

def get_user_profile_picture(user):
    # Check for the uploaded profile picture
    if hasattr(user, 'profile_picture') and user.profile_picture:
        return BASEURL + user.profile_picture.url

    # Check for social accounts in priority order (e.g., GitHub, Google, Facebook)
    social_accounts = SocialAccount.objects.filter(user=user)
    if social_accounts.exists():
        for provider in ['github', 'google', 'facebook']:
            account = social_accounts.filter(provider=provider).first()
            if account and account.get_avatar_url():
                return account.get_avatar_url()

    # Fallback to default image
    return BASEURL + '/static/default_user.png'

@login_required
def user_personalization_view(request):
    """User personalization view for web interface"""
    # Get or create user preferences
    preference, created = UserPreference.objects.get_or_create(
        user=request.user,
        defaults={
            'difficulty_levels': ['Easy', 'Medium']  # Default value
        }
    )

    if request.method == 'POST':
        form = UserPreferenceForm(request.POST, instance=preference)
        if form.is_valid():
            # Convert difficulty levels to JSON format
            difficulty_levels = request.POST.getlist('difficulty_levels')
            
            # Handle calorie and cooking time validation
            calorie_min = form.cleaned_data.get('calorie_range_min')
            calorie_max = form.cleaned_data.get('calorie_range_max')
            cook_time_max = form.cleaned_data.get('cook_time_max')
            
            if calorie_min and calorie_max and calorie_min > calorie_max:
                messages.error(request, 'Minimum calories cannot be greater than maximum calories.')
                return redirect('user-personalization')
                
            if cook_time_max and cook_time_max <= 0:
                messages.error(request, 'Maximum cooking time must be greater than 0.')
                return redirect('user-personalization')

            form.instance.difficulty_levels = difficulty_levels
            form.save()
            messages.success(request, 'Preferences updated successfully!')
            return redirect('user-personalization')
    else:
        form = UserPreferenceForm(instance=preference)

    return render(request, 'user_personalization.html', { 'form': form })

@login_required
@user_passes_test(lambda u: u.is_staff, login_url='profile')
def admin_notification_view(request):
    """Admin notification view for web interface and API"""
    if not request.user.is_staff:
        return Response(
            {"error": "Staff access required"},
            status=status.HTTP_403_FORBIDDEN
        ) if request.content_type == 'application/json' else redirect('profile')

    if request.method == 'GET':
        # Render the notification form page
        context = {
            'users': CustomUser.objects.all().order_by('username'),
            'recipes': Recipe.objects.all().order_by('-created_at')[:100],
            'notification_types': [
                {'value': 'system', 'label': 'System Message'},
                {'value': 'like', 'label': 'Like Notification'},
                {'value': 'milestone', 'label': 'Achievement Milestone'},
                {'value': 'confirmation', 'label': 'Order Confirmation'},
            ]
        }
        return render(request, 'admin_notification.html', context)
    
    elif request.method == 'POST':
        try:
            # Determine if it's an API request
            is_api = request.content_type == 'application/json'
            
            # Parse data based on request type
            try:
                data = json.loads(request.body) if is_api else request.POST
            except json.JSONDecodeError:
                return Response(
                    {"error": "Invalid JSON data"},
                    status=status.HTTP_400_BAD_REQUEST
                ) if is_api else messages.error(request, "Invalid form data")

            # Validate required fields
            title = data.get('title', '').strip()
            message = data.get('message', '').strip()
            
            if not title or not message:
                return Response(
                    {"error": "Title and message are required"},
                    status=status.HTTP_400_BAD_REQUEST
                ) if is_api else messages.error(request, "Title and message are required")

            # Get user IDs and handle them properly
            user_ids = data.getlist('user_ids[]') if hasattr(data, 'getlist') else data.get('user_ids', [])
            all_users = data.get('all_users', 'false').lower() == 'true'

            # Validate user selection
            if not user_ids and not all_users:
                return Response(
                    {"error": "Please select specific users or 'All Users'"},
                    status=status.HTTP_400_BAD_REQUEST
                ) if is_api else messages.error(request, "Please select specific users or 'All Users'")

            # Get target users
            if all_users:
                users = CustomUser.objects.all()
            else:
                # Filter out empty strings and ensure it's a list
                user_ids = [str(uid) for uid in user_ids if uid and str(uid).strip()]
                if not user_ids:
                    return Response(
                        {"error": "No valid users selected"},
                        status=status.HTTP_400_BAD_REQUEST
                    ) if is_api else messages.error(request, "No valid users selected")
                users = CustomUser.objects.filter(id__in=user_ids)
                if not users.exists():
                    return Response(
                        {"error": "No valid users found"},
                        status=status.HTTP_404_NOT_FOUND
                    ) if is_api else messages.error(request, "No valid users found")

            # Get recipe if specified
            recipe_id = data.get('recipe_id')
            related_recipe = None
            if recipe_id:
                try:
                    related_recipe = Recipe.objects.get(id=recipe_id)
                except Recipe.DoesNotExist:
                    return Response(
                        {"error": "Recipe not found"},
                        status=status.HTTP_404_NOT_FOUND
                    ) if is_api else messages.error(request, "Recipe not found")

            # Get notification type
            notification_type = data.get('type', 'system')
            
            # Prepare notification data
            notification_data = {
                'type': notification_type,
                'sender': request.user.username,
                'timestamp': timezone.now().isoformat()
            }

            # Send notifications
            notifications = send_batch_notifications(
                users=users,
                title=title,
                message=message,
                notification_type=notification_type,
                related_recipe=related_recipe,
                data=notification_data
            )

            # Return appropriate response
            if is_api:
                return Response({
                    "status": "success",
                    "message": f"Sent notifications to {len(notifications)} users",
                    "notifications": NotificationSerializer(notifications, many=True).data
                })
            else:
                messages.success(
                    request, 
                    f"Successfully sent notifications to {len(notifications)} users"
                )
                return redirect('admin-notification')

        except Exception as e:
            error_msg = f"Error sending notifications: {str(e)}"
            if is_api:
                return Response(
                    {"error": error_msg},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            messages.error(request, error_msg)
            return redirect('admin-notification')

@login_required
def profile_view(request):
    user = request.user
    token = RefreshToken.for_user(user)
    token.set_exp(lifetime=timedelta(minutes=5))

    # Pass the token to the template
    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            return redirect('profile')
    else:
        form = ProfileForm(instance=request.user)
    context = {
        'token': str(token),
        'form': form,
        'user_profile_picture': get_user_profile_picture(user)
    }
    return render(request, 'profile.html', context )

