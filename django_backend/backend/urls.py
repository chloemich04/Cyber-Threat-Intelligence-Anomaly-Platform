"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from cyberintel import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Test endpoints
    path('api/hello/', views.hello_world, name='hello'),
    path('api/test-db/', views.test_db_connection, name='test_db'),
    path('api/threats/', views.get_threats, name='get_threats'),
    path('api/threats/stats/', views.get_threat_stats, name='threat_stats'),
    
    # Dummy CVE data endpoints
    path('api/cve/data/', views.get_dummy_cve_data, name='get_dummy_cve_data'),
    path('api/cve/stats/', views.get_dummy_cve_stats, name='get_dummy_cve_stats'),
    path('api/cve/predictions/', views.get_threat_predictions, name='get_threat_predictions'),
    
    # Legacy prediction endpoint (for frontend compatibility)
    path('api/predictions/generate/', views.generate_predictions, name='generate_predictions'),
]
