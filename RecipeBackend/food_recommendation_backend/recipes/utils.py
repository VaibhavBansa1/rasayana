from recipes.models import Notification, RecipeInteraction, User
from django.utils import timezone
from exponent_server_sdk import PushClient, PushMessage, PushServerError
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

def send_notification(user, title, message, notification_type='system', related_recipe=None, data=None):
    """
    Send both in-app and push notification to a user.
    
    Args:
        user: User object
        title: Notification title
        message: Notification message
        notification_type: One of ('like', 'save', 'follow', 'system', 'local')
        related_recipe: Optional Recipe object
        data: Optional additional data to send with push notification
    """
    try:
        # Create in-app notification
        notification = Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            related_recipe=related_recipe,
            data=data or {}
        )

        # Send push notification if user has push token
        if hasattr(user, 'push_token') and user.push_token:
            push_data = {
                'type': notification_type,
                'notificationId': str(notification.id),
                'recipeId': str(related_recipe.id) if related_recipe else None,
            }
            if data:
                push_data.update(data)
                
            push_message = PushMessage(
                to=user.push_token,
                title=title,
                body=message,
                data=push_data,
                sound="notification.wav",
                priority="high",
                channel_id="default"
            )
            
            push_client = PushClient()
            response = push_client.publish(push_message)
            logger.info(f"Push notification sent to {user.username}: {response}")
            
            return notification
            
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        return None

def send_batch_notifications(users, title, message, notification_type='system', related_recipe=None, data=None):
    """
Send notifications to multiple users efficiently.
    
    Args:
        users: Queryset or list of User objects
        title: Notification title
        message: Notification message
        notification_type: Notification type
        related_recipe: Optional Recipe object
        data: Optional additional data
"""
    notifications = []
    
    try:
        # Create base notification data
        base_notification_data = {
            'type': notification_type,
            'timestamp': timezone.now().isoformat(),
        }
        if related_recipe:
            base_notification_data['recipeId'] = str(related_recipe.id)
        if data:
            base_notification_data.update(data)

        # Create notifications for each specified user
        with transaction.atomic():
            # Bulk create notifications
            notifications = [
                Notification.objects.create(
                    user=user,
                    title=title,
                    message=message,
                    type=notification_type,
                    related_recipe=related_recipe,
                    data=base_notification_data
                ) for user in users
            ]

            # Send push notifications
            push_client = PushClient()
            for user in users:
                if hasattr(user, 'push_token') and user.push_token:
                    try:
                        push_message = PushMessage(
                            to=user.push_token,
                            title=title,
                            body=message,
                            data=base_notification_data,
                            sound="notification.wav",
                            priority="high",
                            channel_id="default"

                        )
                        push_client.publish(push_message)
                    except Exception as e:
                        logger.error(f"Push notification failed for user {user.id}: {str(e)}")
                        continue

        return notifications

    except Exception as e:
        logger.error(f"Batch notification error: {str(e)}")
        return []

def check_recipe_milestone(recipe):
    """
    Check and handle recipe milestones for likes/saves
    Returns tuple: (milestone_reached: bool, milestone_type: str, count: int)
    """
    MILESTONES = [10, 100, 500, 1000]
    
    likes_count = RecipeInteraction.objects.filter(recipe=recipe, liked=True).count()
    saves_count = RecipeInteraction.objects.filter(recipe=recipe, saved=True).count()
    
    for milestone in MILESTONES:
        # Check if likes just crossed a milestone
        if likes_count == milestone:
            return True, 'likes', milestone
            
        # Check if saves just crossed a milestone    
        if saves_count == milestone:
            return True, 'saves', milestone
            
    return False, None, 0