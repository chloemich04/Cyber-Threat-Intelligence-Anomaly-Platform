from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ThreatListCreateView, 
    CweSoftwareDevelopmentListCreateView, 
    NvdDataEnrichedListCreateView,
    forecast_threats_api,
    forecast_chart_data,
    get_latest_forecast,
    top_threat_types,
    FakeDataListView,
    heatmap_data
)

urlpatterns = [
    path('threat/', ThreatListCreateView.as_view(), name='threat-list'),
    path('cwe/', CweSoftwareDevelopmentListCreateView.as_view(), name='cwe-list'),
    path('nvd/', NvdDataEnrichedListCreateView.as_view(), name='nvd-list'),
    path('forecast/', forecast_threats_api, name='forecast-api'),
    path('forecast/latest/', get_latest_forecast, name='forecast-latest'),
    path('forecast/charts/', forecast_chart_data, name='forecast-charts'),
    path('threat/top-types/', top_threat_types, name='top-threat-types'), # show top threat types
    path('fake-data/', FakeDataListView.as_view(), name='fake-data-list'),
    path('fake-data/heatmap-data/', heatmap_data, name='heatmap-data'),

]
