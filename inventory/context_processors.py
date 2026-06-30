from django.conf import settings


def company_settings(request):
    return {
        'company_name': settings.COMPANY_NAME,
        'copyright_notice': settings.COPYRIGHT_NOTICE,
    }
