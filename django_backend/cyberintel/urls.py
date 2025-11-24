from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    forecast_threats_api,
    forecast_chart_data,
    get_latest_forecast,
)

urlpatterns = [
    path('forecast/', forecast_threats_api, name='forecast-api'),
    path('forecast/latest/', get_latest_forecast, name='forecast-latest'),
    path('forecast/charts/', forecast_chart_data, name='forecast-charts'),
    path('heatmap_data/', views.heatmap_data, name='heatmap-data'),
    path('ranking_data/', views.ranking_bar_chart_data, name='ranking-data'),
    path('epss_chart/', views.epss_chart_data, name='epss-chart'),

]
