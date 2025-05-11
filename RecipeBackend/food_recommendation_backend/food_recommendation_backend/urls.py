from django.contrib import admin
from django.urls import path, include, re_path
from api.views import *
from .views import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic.base import TemplateView
from allauth.account.decorators import secure_admin_login
from django.views.static import serve

admin.autodiscover()
# admin.site.login = secure_admin_login(admin.site.login)

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", TemplateView.as_view(template_name="index.html")),
    path("accounts/profile/", profile_view, name='profile'),
    path('accounts/', include('allauth.urls')),
    path('api/', include('api.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('send-notification/', admin_notification_view, name='admin-notification'),
    path('personalization/', user_personalization_view, name='user-personalization'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if not settings.DEBUG:
    urlpatterns += [re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT})]