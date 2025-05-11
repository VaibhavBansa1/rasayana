from django.contrib import admin
from django.urls import path, include
from .views import *
from recipes.views import *
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from rest_framework.routers import DefaultRouter

urlpatterns = [    
    # Authentication
    path('get/refresh/', GetRefreshView.as_view(), name='get_refresh'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('user/profile/', user_profile, name='user_profile'),
    
    # Search and Filters
    path('search/', RecipeSearchViewSet.as_view({'get': 'list'}), name='search'),
    path('search/filters/', RecipeFilterOptionsView.as_view(), name='search-filters'),

    # Profile endpoints
    path('profile/liked/', ProfileLikedRecipesView.as_view(), name='profile-liked'),
    path('profile/saved/', ProfileSavedRecipesView.as_view(), name='profile-saved'),
    path('profile/recently-visited/', ProfileRecentlyVisitedRecipesView.as_view(), name='profile-recently-visited'),

    # Recipe endpoints
    path('recipes/<int:pk>/', RecipeDetailView.as_view(), name='recipe-detail'),
    path('recipes/<int:pk>/like/', RecipeLikeView.as_view(), name='recipe-like'),
    path('recipes/<int:pk>/save/', RecipeSaveView.as_view(), name='recipe-save'),

    # Chat endpoints
    path('chat/', RecipeChatView.as_view(), name='recipe-chat'),
    path('chat/image/', RecipeImageChatView.as_view(), name='recipe-image-chat'),

    # Notifications
    path('notifications/', NotificationViewSet.as_view({'get': 'list'}), name='notification-list'),
    path('notifications/mark-all-read/', NotificationViewSet.as_view({'post': 'mark_all_read'}), name='notification-mark-all-read'),
    path('notifications/<uuid:pk>/mark-read/', NotificationViewSet.as_view({'post': 'mark_read'}), name='notification-mark-read'),
    path('notifications/<uuid:pk>/', NotificationViewSet.as_view({'delete': 'destroy'}), name='notification-mark-read'),
    path('notifications/register-push-token/', register_push_token, name='register-push-token'),

    # Payment endpoints
    path('payments/create-order/', OrderViewSet.as_view({'post': 'create_order'}), name='create-order'),
    path('payments/verify-payment/', PaymentVerificationView.as_view(), name='verify-payment'),
    path('payments/key/', get_razorpay_key, name='razorpay-key'),
    path('payments/orders/', get_orders, name='get-orders'),

    # About Devlopers

    path('developers/', get_dev_info, name='get-dev-info'),
    path('download-link/', get_download_link, name='download-app'),
]
