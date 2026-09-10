from django.contrib.auth import get_user_model
from django.contrib.auth.views import LoginView


class InitialSetupLoginView(LoginView):
    template_name = 'registration/login.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['no_users_exist'] = not get_user_model().objects.exists()
        return context
