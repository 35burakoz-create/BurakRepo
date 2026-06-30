import os
from django.core.exceptions import ImproperlyConfigured
from pathlib import Path

from .env import env_bool, env_list, load_env_file

BASE_DIR = Path(__file__).resolve().parent.parent
load_env_file(BASE_DIR / '.env')

DATA_DIR = BASE_DIR / 'database'
UPLOADS_DIR = BASE_DIR / 'uploads'
REPORTS_DIR = BASE_DIR / 'reports'
for managed_dir in (DATA_DIR, UPLOADS_DIR, REPORTS_DIR):
    managed_dir.mkdir(exist_ok=True)

DJANGO_ENV = os.environ.get('DJANGO_ENV', 'local')
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'change-me-local-only')
if DJANGO_ENV == 'production' and SECRET_KEY == 'change-me-local-only':
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set in production.')
DEBUG = env_bool('DJANGO_DEBUG', default=DJANGO_ENV != 'production')
ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost,.local')
CSRF_TRUSTED_ORIGINS = env_list('DJANGO_CSRF_TRUSTED_ORIGINS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'inventory.apps.InventoryConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'nelamar_stock.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'inventory.context_processors.company_settings',
            ],
        },
    },
]

WSGI_APPLICATION = 'nelamar_stock.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.environ.get('SQLITE_PATH', str(DATA_DIR / 'db.sqlite3')),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'tr-tr'
TIME_ZONE = 'Europe/Istanbul'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = 'media/'
MEDIA_ROOT = UPLOADS_DIR
STATICFILES_DIRS = [BASE_DIR / 'static'] if (BASE_DIR / 'static').exists() else []
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LOGIN_REDIRECT_URL = 'product_list'
LOGOUT_REDIRECT_URL = 'login'
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = env_bool('DJANGO_SECURE_COOKIES', default=DJANGO_ENV == 'production')
CSRF_COOKIE_SECURE = env_bool('DJANGO_SECURE_COOKIES', default=DJANGO_ENV == 'production')
SECURE_SSL_REDIRECT = env_bool('DJANGO_SECURE_SSL_REDIRECT', default=False)
SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_HSTS_SECONDS', '0'))
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('MAX_UPLOAD_BYTES', str(5 * 1024 * 1024)))
DATA_UPLOAD_MAX_MEMORY_SIZE = FILE_UPLOAD_MAX_MEMORY_SIZE

COMPANY_NAME = 'Nelamar Stock'
COPYRIGHT_NOTICE = '© 2026 Burak ÖZ. All rights reserved.'

KROKI_ROWS = int(os.environ.get('KROKI_ROWS', '10'))
KROKI_A_SLOTS = ('Z', 'T', 'Y', 'X')
KROKI_B_SLOTS = ('X', 'Y', 'T', 'Z')
