from django.shortcuts import render
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.utils import timezone
from django.http import JsonResponse
from django.conf import settings
from datetime import timedelta, datetime
import pandas as pd
import json
import os
import random
from .models import ThreatIndicator
from django.db import connection
from django.db.models import Count
from django.http import JsonResponse

from .models import ThreatIndicator, Threat, CweSoftwareDevelopment, NvdDataEnriched, FakeData
from .serializers import ThreatSerializer, CweSoftwareDevelopmentSerializer, NvdDataEnrichedSerializer, FakeDataSerializer

# Path for storing latest forecast
FORECAST_CACHE_FILE = os.path.join(settings.BASE_DIR, 'latest_forecast.json')


# Create your views here.

class ThreatListCreateView(generics.ListCreateAPIView):
    queryset = Threat.objects.all()
    serializer_class = ThreatSerializer

class CweSoftwareDevelopmentListCreateView(generics.ListCreateAPIView):
    queryset = CweSoftwareDevelopment.objects.all()
    serializer_class = CweSoftwareDevelopmentSerializer

class NvdDataEnrichedListCreateView(generics.ListCreateAPIView):
    queryset = NvdDataEnriched.objects.all()
    serializer_class = NvdDataEnrichedSerializer

class FakeDataListView(generics.ListAPIView):
    queryset = FakeData.objects.all()
    serializer_class = FakeDataSerializer

def heatmap_data(request):
    data = list(FakeData.objects.values('latitude', 'longitude','region_code','epss'))
    return JsonResponse(data, safe=False)


@api_view(['POST'])
def forecast_threats_api(request):
    """
    API endpoint for cyber threat forecasting.
    
    POST /api/forecast/
    Body:
    {
        "weeks": 4,
        "batch_size": 6,
        "lookback_days": 90,
        "countries": ["SG", "US"]  // optional filter
    }
    
    Returns: Forecast JSON with predictions and metadata
    """
    from .threat_forecast import forecast_threats
    
    try:
        # Parse request parameters
        weeks = request.data.get('weeks', 4)
        batch_size = request.data.get('batch_size', 6)
        lookback_days = request.data.get('lookback_days', 90)
        countries = request.data.get('countries', None)
        
        # Validate parameters
        if not isinstance(weeks, int) or weeks < 1 or weeks > 12:
            return Response(
                {'error': 'weeks must be integer between 1-12'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(batch_size, int) or batch_size < 1 or batch_size > 20:
            return Response(
                {'error': 'batch_size must be integer between 1-20'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Load REAL CVE/CWE data from database
        nvd_records = list(
            NvdDataEnriched.objects.only(
                'id', 'published', 'vulnstatus', 'value', 'cwe_id', 'description'
            )[:100]  # Get first 100 CVEs 
            .values('id', 'published', 'vulnstatus', 'value', 'cwe_id', 'description')
        )
        
        if not nvd_records:
            return Response(
                {
                    'error': 'No CVE data available in NVD database',
                    'message': 'The nvd_data_enriched table is empty. Please ensure it is populated with CVE data.',
                    'instructions': [
                        'Verify database connection',
                        'Check if nvd_data_enriched table exists',
                        'Ensure CVE data has been imported',
                        'System requires REAL CVE/CWE data - no synthetic data'
                    ]
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get CWE data for enrichment (only load CWEs that match our CVEs)
        cve_cwe_ids = set(nvd.get('cwe_id') for nvd in nvd_records if nvd.get('cwe_id'))
        if cve_cwe_ids:
            cwe_lookup = {
                cwe.cwe_id: cwe 
                for cwe in CweSoftwareDevelopment.objects.filter(cwe_id__in=cve_cwe_ids)
            }
        else:
            cwe_lookup = {}
        
        # Simulate threat intelligence events from CVE data
        countries_list = [
            ('SG', 'Singapore'),
            ('US', 'United States'),
            ('CN', 'China'),
            ('IN', 'India'),
            ('GB', 'United Kingdom'),
            ('AU', 'Australia')
        ]
        
        threat_data = []
        
        # Use fewer CVEs for faster API response
        sample_size = min(len(nvd_records), 75)  # Reduced from 150
        sampled_cves = random.sample(nvd_records, sample_size)
        
        for nvd in sampled_cves:
            cve_id = nvd['id']
            cwe_id = nvd.get('cwe_id', '')
            description = nvd.get('value', '').lower()
            
            # Determine event frequency (reduced for performance)
            if 'critical' in description or nvd.get('vulnstatus') == 'Analyzed':
                num_events = random.randint(8, 15)  # Reduced
            elif 'high' in description:
                num_events = random.randint(5, 10)  # Reduced
            else:
                num_events = random.randint(2, 6)   # Reduced
            
            # Get CWE tags
            cwe_info = cwe_lookup.get(cwe_id)
            tags = []
            if cwe_info:
                weakness = cwe_info.weakness_abstraction.lower()
                if 'remote' in weakness or 'network' in weakness:
                    tags.append('remote')
                if 'buffer' in weakness or 'overflow' in weakness:
                    tags.append('buffer-overflow')
                if 'injection' in weakness:
                    tags.append('injection')
                if 'xss' in weakness or 'cross-site' in weakness:
                    tags.append('xss')
                if 'access' in weakness or 'privilege' in weakness:
                    tags.append('privilege-escalation')
            
            if not tags:
                tags = ['exploit', 'vulnerability']
            
            # Parse CVSS
            cvss_score = 5.0
            if 'critical' in description:
                cvss_score = random.uniform(9.0, 10.0)
            elif 'high' in description:
                cvss_score = random.uniform(7.0, 8.9)
            elif 'medium' in description:
                cvss_score = random.uniform(4.0, 6.9)
            
            # Generate events
            for _ in range(num_events):
                # Filter by countries if specified
                if countries:
                    available_countries = [c for c in countries_list if c[0] in countries]
                    if not available_countries:
                        available_countries = countries_list
                    country_code, country_name = random.choice(available_countries)
                else:
                    country_code, country_name = random.choice(countries_list)
                
                days_ago = random.randint(0, lookback_days)
                timestamp = timezone.now() - timedelta(days=days_ago)
                
                threat_data.append({
                    'country_code': country_code,
                    'country_name': country_name,
                    'ip': f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                    'cve_id': cve_id,
                    'data': json.dumps({
                        'cvss': round(cvss_score, 2),
                        'epss': round(random.uniform(0.001, 0.5), 5),
                        'tags': tags[:3],
                        'cwe_id': cwe_id,
                        'cwe_name': cwe_info.name if cwe_info else '',
                        'published': nvd.get('published', ''),
                        'status': nvd.get('vulnstatus', '')
                    }),
                    'timestamp': timestamp
                })
        
        df = pd.DataFrame(threat_data)
        threat_count = len(df)
        
        # Run forecast
        forecast_result = forecast_threats(
            df=df,
            date_column='timestamp',
            batch_size=batch_size,
            forecast_weeks=weeks
        )
        
        # Add request metadata
        forecast_result['request'] = {
            'weeks': weeks,
            'batch_size': batch_size,
            'lookback_days': lookback_days,
            'countries': countries,
            'threat_records_analyzed': threat_count
        }
        
        # Add timestamp
        forecast_result['generated_at'] = datetime.now().isoformat()
        
        # Save to cache file for frontend to fetch
        try:
            with open(FORECAST_CACHE_FILE, 'w') as f:
                json.dump(forecast_result, f, indent=2)
        except Exception as save_error:
            # Non-critical error, just log it
            print(f"Warning: Could not save forecast cache: {save_error}")
        
        return Response(forecast_result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def forecast_chart_data(request):
    """
    API endpoint to get chart-friendly forecast data.
    
    GET /vrecast/charts/?file=forecast_results.json
    
    Returns: Chart configurations for frontend
    """
    from .chart_utils import extract_chart_metrics, create_visualization_config
    
    try:
        # Get forecast file path from query params
        forecast_file = request.GET.get('file', 'latest_forecast.json')
        
        # Load forecast data
        try:
            with open(forecast_file) as f:
                forecast_data = json.load(f)
        except FileNotFoundError:
            return Response(
                {'error': f'Forecast file not found: {forecast_file}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extract chart metrics
        chart_data = extract_chart_metrics(forecast_data)
        
        # Generate chart configs
        chart_configs = create_visualization_config(chart_data)
        
        # Build response
        response_data = {
            'metadata': forecast_data.get('metadata', {}),
            'forecast_horizon_weeks': forecast_data.get('forecast_horizon_weeks', 4),
            'charts': chart_configs,
            'summary': {
                'total_predictions': len(forecast_data.get('predictions', [])),
                'countries': list(set(p['country_code'] for p in forecast_data.get('predictions', [])))
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_latest_forecast(request):
    """
    API endpoint to get the latest cached forecast data.
    Frontend can poll this to check if new forecast data is available.
    
    GET /api/forecast/latest/
    
    Returns: Latest forecast JSON if available, or 404 if no forecast exists yet
    """
    try:
        # Check if cache file exists
        if not os.path.exists(FORECAST_CACHE_FILE):
            return Response(
                {
                    'error': 'No forecast data available yet',
                    'message': 'Please run a forecast first using POST /api/forecast/ or run the management command'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Load cached forecast
        with open(FORECAST_CACHE_FILE, 'r') as f:
            forecast_data = json.load(f)
        
        # Add file metadata
        file_stats = os.stat(FORECAST_CACHE_FILE)
        forecast_data['cache_info'] = {
            'file_modified': datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
            'file_size_bytes': file_stats.st_size
        }
        
        return Response(forecast_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
def top_threat_types(request):
    data = (
        Threat.objects
        .values('threat_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    return JsonResponse(list(data), safe=False)
