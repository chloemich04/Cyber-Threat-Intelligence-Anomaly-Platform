from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ThreatListCreateView, CweSoftwareDevelopmentListCreateView, NvdDataEnrichedListCreateView, \
    ThreatListCreateView

urlpatterns = [
    path('threat/', ThreatListCreateView.as_view(), name='threat-list'),
    path('cwe/', CweSoftwareDevelopmentListCreateView.as_view(), name='cwe-list'),
    path('nvd/', NvdDataEnrichedListCreateView.as_view(), name='nvd-list'),
]