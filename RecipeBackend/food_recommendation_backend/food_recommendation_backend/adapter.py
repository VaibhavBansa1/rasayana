from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.forms import ValidationError
from recipes.utils import send_notification
import logging

logger = logging.getLogger(__name__)

class CustomAccountAdapter(DefaultAccountAdapter):
    def clean_email(self, email):
        # Restrict certain emails or domains
        restricted_list = ['restricted@example.com', 'blocked@example.com']
        if email in restricted_list:
            raise ValidationError("You are restricted from registering. Please contact admin.")
        # Restrict certain domains
        restricted_domains = ['temporarymail.com', 'disposablemail.com']
        domain = email.split('@')[-1]
        if domain in restricted_domains:
            raise ValidationError("Email domain is not allowed for registration.")
        return email

    def clean_username(self, username, *args, **kwargs):
        max_length = 20  # Define your maximum username length
        if len(username) > max_length:
            raise ValidationError(f"Username cannot be longer than {max_length} characters.")
        # Call the default validations
        return super().clean_username(username, *args, **kwargs)

    def save_user(self, request, user, form, commit=True):
        """Save user and send welcome notification after successful save"""
        try:
            # Save first name, last name, and profile picture
            user = super().save_user(request, user, form, commit=False)
            user.first_name = form.cleaned_data.get('first_name', '')
            user.last_name = form.cleaned_data.get('last_name', '')

            # Handle profile picture
            profile_picture = form.cleaned_data.get('profile_picture', None)
            if profile_picture:
                user.profile_picture = profile_picture

            if commit:
                # First save the user
                user.save()
                
                # Then send welcome notification using the newly created user object
                try:
                    send_notification(
                        user=user,  # Changed from request.user to user
                        title="Welcome to Rasāyana!",
                        message=f"Welcome {user.first_name or user.username}! Start exploring delicious recipes and create your own culinary masterpieces.",
                        notification_type='system',
                        data={
                            'action': 'welcome',
                            'type': 'system',
                            'registration_type': 'form'
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to send welcome notification to user {user.id}: {str(e)}")

            return user
        except Exception as e:
            logger.error(f"Error in save_user: {str(e)}")
            raise

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        """Handle social login user creation and welcome notification"""
        try:
            user = super().save_user(request, sociallogin, form)
            
            # Send welcome notification for social login users
            try:
                provider = sociallogin.account.provider
                send_notification(
                    user=user,
                    title="Welcome to Rasāyana!",
                    message=f"Welcome {user.first_name or user.username}! Thanks for joining with {provider.title()}.",
                    notification_type='system',
                    data={
                        'action': 'welcome',
                        'type': 'system',
                        'registration_type': 'social',
                        'provider': provider
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send social welcome notification to user {user.id}: {str(e)}")
            
            return user
        except Exception as e:
            logger.error(f"Error in social save_user: {str(e)}")
            raise
