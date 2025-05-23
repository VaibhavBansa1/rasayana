"""
Django settings for food_recommendation_backend project.

Generated by 'django-admin startproject' using Django 5.1.2.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

import os
from pathlib import Path

from datetime import timedelta
from corsheaders.defaults import default_headers
from environ import Env

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
env = Env()
Env.read_env(os.path.join(BASE_DIR, '.env'))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('DJANGO_SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool("DEBUG", default=False)

BASEURL = env("NGROK_BASE_URL") if env("DEBUG") else env("PROD_BASE_URL")

ALLOWED_HOSTS = [
    BASEURL,
    'localhost',
    '127.0.0.1',
]

CSRF_TRUSTED_ORIGINS = [
    "https://" + BASEURL,
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'django_filters',

    'food_recommendation_backend',
    'recipes',
    'api',

    'corsheaders',
    'rest_framework',

    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.facebook',
    'allauth.socialaccount.providers.github',
    'allauth.socialaccount.providers.amazon',
    'django.contrib.humanize',
    'allauth.usersessions',

    'rest_framework.authtoken',
    'django.contrib.sites',  # Required by allauth
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this after SecurityMiddleware
    'corsheaders.middleware.CorsMiddleware',
    'allauth.usersessions.middleware.UserSessionsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

EMAIL_HOST = 'smtp.gmail.com'
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

ROOT_URLCONF = 'food_recommendation_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.normpath(os.path.join(BASE_DIR, 'templates')),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'food_recommendation_backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'food_recommendation_db',
#         'USER': 'django_user',
#         'PASSWORD': "{{your_password}}",  # Use the password you set in the previous step
#         'HOST': 'localhost',
#         'PORT': '5432',
#     }
# }

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

AUTH_USER_MODEL = 'food_recommendation_backend.CustomUser'

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES" : (
        # 'rest_framework.authentication.BasicAuthentication',
        # 'rest_framework.authentication.SessionAuthentication',
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES" : (
        "rest_framework.permissions.IsAuthenticated",
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,  # Adjust the page size as needed.

}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=10),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30)
}

# CORS_ORIGIN_ALLOW_ALL = True  # Unsafe! Do not use in production.

CORS_ALLOWED_ORIGINS = [
    "https://rasayana.expo.app",
    "https://" + BASEURL,  # Allow your own app's domain
]

# CORS_ORIGIN_ALLOW_ALL = True  # Disabled for security
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers) + [
    "ngrok-skip-browser-warning",
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

AUTHENTICATION_BACKENDS = {
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
}

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Create directories if they don't exist
DIRS_TO_CREATE = [STATIC_ROOT, MEDIA_ROOT]
for dir_path in DIRS_TO_CREATE:
    os.makedirs(dir_path, exist_ok=True)

# Enable WhiteNoise compression and caching
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Security settings for production
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# settings related to allauth

SOCIALACCOUNT_PROVIDERS = {
    'amazon': {
        'SCOPE' : ['profile'],
    },
    'github': {
        'SCOPE': [
            'user',
            'read:org',
        ],
    },
    'google' : {
        'SCOPE' : ['email', 'profile'],
        'AUTH_PARAMS':{'access_type': 'online'},
        'OAUTH_PKCE_ENABLED': True,
        'FETCH_USERINFO': True,
    },
    'facebook': {
        'METHOD': 'oauth2',  # Set to 'js_sdk' to use the Facebook connect SDK
        # 'SDK_URL': '//connect.facebook.net/{locale}/sdk.js',
        'SCOPE': [
            'email',
            'public_profile'
            ],
        'AUTH_PARAMS': {'auth_type': 'reauthenticate'},
        'INIT_PARAMS': {'cookie': True},
        'FIELDS': [
            'id',
            'first_name',
            'last_name',
            'middle_name',
            'name',
            'name_format',
            'picture',
            'short_name',
            'email',
        ],
        'EXCHANGE_TOKEN': True,
        # 'LOCALE_FUNC': 'path.to.callable',
        'VERIFIED_EMAIL': False,
        'VERSION': 'v21.0',
        'GRAPH_API_URL': 'https://graph.facebook.com/v21.0',
    }
}

SOCIALACCOUNT_STORE_TOKENS = True

SITE_ID = 1

ACCOUNT_RATE_LIMITS = {
    # Number of failed login attempts allowed within the `cooldown` period.
    "login_failed": "5/10m",  # 5 attempts per 10 minutes
    # You can configure rate limits for other actions as well, if needed.
    "password_reset": "5/10m",
    "email_verification": "5/h",
}

ACCOUNT_AUTHENTICATION_METHOD = "username_email"
ACCOUNT_CHANGE_EMAIL = True
LOGIN_URL = '/accounts/login/'
# LOGIN_REDIRECT_URL = '/redirect/'
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS=1
ACCOUNT_EMAIL_NOTIFICATIONS = True
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_LOGIN_ON_PASSWORD_RESET = True
ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE = True
ACCOUNT_LOGOUT_REDIRECT_URL = '/accounts/login/'
ACCOUNT_PRESERVE_USERNAME_CASING = False
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_USERNAME_MIN_LENGTH = 2

# Custom adapter
ACCOUNT_ADAPTER = 'food_recommendation_backend.adapter.CustomAccountAdapter'
SOCIALACCOUNT_ADAPTER = 'food_recommendation_backend.adapter.CustomSocialAccountAdapter'

# Custom signup form
# ACCOUNT_SIGNUP_FORM_CLASS = 'food_recommendation_backend.forms.CustomSignupForm'

ACCOUNT_FORMS = {'signup': 'food_recommendation_backend.forms.CustomSignupForm',}
# ACCOUNT_SIGNUP_FORM_CLASS = 'myapp.forms.SignupForm'

RAZORPAY_KEY_ID = env("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = env("RAZORPAY_KEY_SECRET", default="")

GOOGLE_API_KEY = env("GOOGLE_API_KEY", default="")

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        '': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}