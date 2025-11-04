from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ThreatListCreateView, CweSoftwareDevelopmentListCreateView, NvdDataEnrichedListCreateView, \
    ThreatListCreateView
from . import views

urlpatterns = [
    path('threat/', ThreatListCreateView.as_view(), name='threat-list'), # show threats
    path('cwe/', CweSoftwareDevelopmentListCreateView.as_view(), name='cwe-list'), # show cwe's
    path('nvd/', NvdDataEnrichedListCreateView.as_view(), name='nvd-list'), # show nvd's
    path('threat/top-types/', views.top_threat_types, name='top-threat-types'), # show top threat types
]