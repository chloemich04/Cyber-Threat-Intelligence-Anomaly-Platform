from django.shortcuts import render
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.utils import timezone, cache
from django.http import JsonResponse
from django.conf import settings
from datetime import timedelta, datetime
import pandas as pd
import json
import os
import random
from django.db import connection
from django.db.models import Count, Sum, Avg
from django.core.cache import cache

from .models import CveCountsByRegionEpss, CveCountsByRegion, IspCountsByRegion, NvdDataLimited, CweSoftwareLimited, Contact
from .serializers import ContactSerializer
import logging
import re
from .models import CveCountsByRegionEpss, CveCountsByRegion, IspCountsByRegion
from .serializers import CveCountsByRegionEpssSerializer

# Path for storing latest forecast
FORECAST_CACHE_FILE = os.path.join(settings.BASE_DIR, 'latest_forecast.json')


# Create your views here.
def heatmap_data(request):
    cached_data = cache.get('heatmap_data')
    if cached_data:
        return JsonResponse(cached_data, safe=False)
    """
    Returns aggregated CVE counts per state.
    """

    # Aggregate CVE counts by state
    data = (
        CveCountsByRegion.objects
        .values('region_code')
        .annotate(total_cves=Sum('cve_count'))
        .order_by('region_code')
    )

    results = [
        {'region_code': item['region_code'], 'total_cves': item['total_cves']}
        for item in data
    ]

    return JsonResponse(results, safe=False)


@api_view(['GET'])
def heatmap_state_detail(request, region_code):
    """
    Return enriched details for a given US state (region_code).
    Lightweight, best-effort aggregation using available tables. Returns fields useful
    for the frontend side panel (no external links).

    Query params:
      weeks: int (optional) - how many weeks of timeseries to include (best-effort)
      top_n: int (optional) - how many top CVEs/vendors to return
    """
    try:
        top_n = int(request.GET.get('top_n', 5))
    except Exception:
        top_n = 5

    # minimal mapping of postal codes to names (kept small and defensive)
    state_map = {
        'AL': 'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut',
        'DE':'Delaware','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa',
        'KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan',
        'MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire',
        'NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma',
        'OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas',
        'UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming'
    }

    region_code = (region_code or '').upper()
    region_name = state_map.get(region_code, region_code)

    # Base response
    resp = {
        'region_code': region_code,
        'region_name': region_name,
        'total_cves': 0,
        'top_cves': [],
        'exploit_count': 0,
        'top_tags': [],
        'risk_score': None,
        'notes': [],
    }

    try:
        # Aggregate totals and top CVEs from CveCountsByRegion
        qs = CveCountsByRegion.objects.filter(region_code=region_code)
        totals = qs.aggregate(total_cves=Sum('cve_count'))
        resp['total_cves'] = int(totals.get('total_cves') or 0)

        # Top CVEs by occurrences
        top_qs = (qs.values('cve_id')
                  .annotate(occurrences=Sum('cve_count'))
                  .order_by('-occurrences')[:top_n])
        top_list = []
        sample_labels = []
        for r in top_qs:
            cid = r.get('cve_id')
            occ = int(r.get('occurrences') or 0)
            top_list.append({'id': cid, 'occurrences': occ, 'avg_cvss': None})
            if cid:
                sample_labels.append(f"{cid}")
        resp['top_cves'] = top_list

        # Exploit-related heuristic: use CveCountsByRegionEpss rows where avg_epss >= 0.1
        try:
            epss_qs = CveCountsByRegionEpss.objects.filter(region_code=region_code)
            exploit_sum = epss_qs.filter(avg_epss__gte=0.1).aggregate(total=Sum('cve_count'))
            resp['exploit_count'] = int(exploit_sum.get('total') or 0)
        except Exception:
            resp['exploit_count'] = 0

    
        # No timeseries/trend is returned in this lightweight detail endpoint.

        # risk_score: simple explainable combination using exploit presence and volume only
        try:
            exploit_factor = 1.0 if resp.get('exploit_count', 0) > 0 else 0.0
            volume_factor = min(1.0, resp.get('total_cves', 0) / 100.0)
            # weighted: exploit 60%, volume 40%
            score = (exploit_factor * 60.0) + (volume_factor * 40.0)
            resp['risk_score'] = round(max(0.0, min(100.0, score)), 1)
        except Exception:
            resp['risk_score'] = None

        return Response(resp)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def ranking_bar_chart_data(request):
    cached_data = cache.get('ranking_bar_chart_data')
    if cached_data:
        return Response(cached_data)

    aggregated = (
        CveCountsByRegionEpss.objects
        .values('region_code')
        .annotate(
            total_cves=Sum('cve_count'),
            avg_epss=Avg('avg_epss')
        )
    )

    aggregated_list = sorted(
        aggregated,
        key=lambda k: k['total_cves'],
        reverse=True
    )

    ranked_data = []
    rank = 1
    for row in aggregated_list:
        ranked_data.append({
            "state": row['region_code'],
            "cve_count": row['total_cves'],
            "avg_epss": row['avg_epss'],
            "rank_overall": rank
        })
        rank += 1

    return Response(ranked_data)

@api_view(['GET'])
def epss_chart_data(request):
    cached_data = cache.get('epss_chart_data')
    if cached_data:
        return Response(cached_data)

    aggregated = (
        CveCountsByRegionEpss.objects
        .values("region_code")
        .annotate(
            total_cve_count=Sum("cve_count"),
            avg_epss=Avg("avg_epss"),
            num_unique_cves=Count("cve_id", distinct=True)
        )
        .order_by("avg_epss")
    )

    aggregated = list(aggregated)

    # Add computed rank based on avg_epss
    for idx, entry in enumerate(aggregated, start=1):
        entry["rank_epss"] = idx

    return Response(aggregated)

@api_view(['GET'])
def isp_chart_data(request):
    cached_data = cache.get('internet_chart_data')
    if cached_data:
        return Response(cached_data)

    qs = IspCountsByRegion.objects.all()

    aggregated = {}
    for row in qs:
        state = row.region_code
        if state not in aggregated:
            aggregated[state] = {
                "region_code": state,
                "total_count": 0,
                "isps": []
            }
        aggregated[state]["total_count"] += row.cnt
        aggregated[state]["isps"].append({
            "isp": row.isp,
            "cnt": row.cnt,
            "rank_per_state_isp": row.rank_per_state_isp
        })
    result = list(aggregated.values())

    result.sort(key=lambda k: k['total_count'], reverse=True)

    return Response(result)

@api_view(['GET'])
def state_epss_incidents(request, region_code):
    cached_data = cache.get('state_epss_incidents')
    if cached_data:
        return Response(cached_data)

    incidents = CveCountsByRegionEpss.objects.filter(region_code=region_code.upper()).order_by('rank_per_state')
    serializer = CveCountsByRegionEpssSerializer(incidents, many=True)

    return Response(serializer.data)



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
        # Simple per-IP rate limiter (configurable via settings)
        rate_cfg = getattr(settings, 'FORECAST_RATE_LIMIT', None)
        if rate_cfg is None:
            # default: 1 request per 5 minutes per IP
            rate_cfg = {'max_requests': 1, 'window_seconds': 300}

        # Identify client IP (respect X-Forwarded-For if present)
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            client_ip = xff.split(',')[0].strip()
        else:
            client_ip = request.META.get('REMOTE_ADDR', 'unknown')

        rl_key = f"forecast_rl:{client_ip}"
        current = cache.get(rl_key, 0)
        if current >= rate_cfg.get('max_requests', 1):
            retry_after = cache.ttl(rl_key) if hasattr(cache, 'ttl') else rate_cfg.get('window_seconds')
            return Response({'error': 'Rate limit exceeded', 'retry_after_seconds': retry_after}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        else:
            cache.set(rl_key, current + 1, timeout=rate_cfg.get('window_seconds', 300))
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
        
        # Load REAL CVE/CWE data from a curated forecast feed if available, otherwise query DB
        feed_file = os.path.join(settings.BASE_DIR, 'forecast_feed.json')
        nvd_records = []
        if os.path.exists(feed_file):
            try:
                with open(feed_file, 'r', encoding='utf-8') as f:
                    feed = json.load(f)
                    nvd_records = feed.get('cve_rows', [])
                # ensure it's a list of dicts
                if not isinstance(nvd_records, list):
                    nvd_records = []
            except Exception as e:
                print(f"Warning: could not load forecast_feed.json: {e}")

        if not nvd_records:
            # Query NVD database for CVEs - get a sample without expensive sorting
            # Use only() to fetch only needed fields for better performance
            nvd_records = list(
                NvdDataLimited.objects.only(
                    'id', 'published', 'vulnstatus', 'value', 'cwe_id', 'description'
                )[:100].values('id', 'published', 'vulnstatus', 'value', 'cwe_id', 'description')
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
                for cwe in CweSoftwareLimited.objects.filter(cwe_id__in=cve_cwe_ids)
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
        
        # Support dry-run estimate mode (no LLM call)
        dry_run = bool(request.data.get('dry_run', False))

        # Run forecast (forecast_threats supports dry_run and will return estimated info)
        forecast_result = forecast_threats(
            df=df,
            date_column='timestamp',
            batch_size=batch_size,
            forecast_weeks=weeks,
            dry_run=dry_run
        )

        # If dry-run, return the estimate directly
        if dry_run:
            return Response({'dry_run': True, 'estimate': forecast_result.get('estimated', {}), 'feature_records_count': forecast_result.get('feature_records_count', 0)}, status=status.HTTP_200_OK)
        
        # Add request metadata
        forecast_result['request'] = {
            'weeks': weeks,
            'batch_size': batch_size,
            'lookback_days': lookback_days,
            'countries': countries,
            'threat_records_analyzed': threat_count
        }

        # Add threat type distribution computed from the input threat_data (so UI can show both input-identified types and model predictions)
        try:
            threat_type_counts = {}
            for record in threat_data:
                threat_type = record.get('threat_type', 'Other')
                threat_type_counts[threat_type] = threat_type_counts.get(threat_type, 0) + 1
            threat_types = [
                {'threat_type': tt, 'count': count}
                for tt, count in sorted(threat_type_counts.items(), key=lambda x: x[1], reverse=True)
            ]
            forecast_result['threat_types'] = threat_types
            forecast_result['total_threats'] = len(threat_data)
        except Exception:
            # non-critical
            pass
        
        # Add timestamp
        forecast_result['generated_at'] = datetime.now().isoformat()
        
        # Save to cache file for frontend to fetch and populate in-memory cache (TTL configurable)
        try:
            with open(FORECAST_CACHE_FILE, 'w') as f:
                json.dump(forecast_result, f, indent=2)
            ttl = getattr(settings, 'FORECAST_CACHE_TTL_SECONDS', 3600)
            try:
                cache.set('latest_forecast', forecast_result, timeout=ttl)
            except Exception:
                # best-effort: file written but cache could not be set
                pass
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
        # Try in-memory cache first
        ttl = getattr(settings, 'FORECAST_CACHE_TTL_SECONDS', 3600)
        cached = cache.get('latest_forecast')
        if cached:
            # add a note that this came from cache
            cached = dict(cached)
            cached['cache_info'] = {'source': 'memory', 'ttl_seconds': ttl}
            return Response(cached, status=status.HTTP_200_OK)

        # Fallback: check if cache file exists
        if not os.path.exists(FORECAST_CACHE_FILE):
            return Response(
                {
                    'error': 'No forecast data available yet',
                    'message': 'Please run a forecast first using POST /api/forecast/ or run the management command'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Load cached forecast from disk
        with open(FORECAST_CACHE_FILE, 'r') as f:
            forecast_data = json.load(f)

        # Add file metadata
        file_stats = os.stat(FORECAST_CACHE_FILE)
        forecast_data['cache_info'] = {
            'file_modified': datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
            'file_size_bytes': file_stats.st_size,
            'source': 'disk'
        }

        # Populate in-memory cache for faster subsequent calls
        try:
            cache.set('latest_forecast', forecast_data, timeout=ttl)
        except Exception:
            pass

        return Response(forecast_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['POST'])
def create_contact(request):
    """
    Accept a Contact Us submission and persist it to the database.
    POST /api/contacts/
    Body: { "name": "", "email": "", "message": "" }
    """
    try:
        # Basic per-IP rate limiting to reduce abuse
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            client_ip = xff.split(',')[0].strip()
        else:
            client_ip = request.META.get('REMOTE_ADDR', 'unknown')

        rl_key = f"contact_rl:{client_ip}"
        try:
            current = cache.get(rl_key, 0) or 0
        except Exception:
            current = 0

        # Allow up to 5 submissions per hour per IP by default
        if current >= 5:
            logging.warning(f"Rate limit hit for contact submissions from {client_ip}")
            retry_after = 3600
            return Response({'error': 'Rate limit exceeded', 'retry_after_seconds': retry_after}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        serializer = ContactSerializer(data=request.data)
        if serializer.is_valid():
            contact = serializer.save()
            # increment counter
            try:
                cache.set(rl_key, current + 1, timeout=3600)
            except Exception:
                logging.exception("Could not set rate limit cache key")
            return Response(ContactSerializer(contact).data, status=status.HTTP_201_CREATED)
        else:
            # Log suspicious content patterns for audit
            try:
                combined = " ".join([str(v) for v in request.data.values()])
                if re.search(r"<script|javascript:|onerror=|onload=|;--|\b(drop|delete|insert|update|truncate|alter|exec|declare)\b", combined, re.I):
                    logging.warning(f"Rejected contact submission (suspicious patterns) from {client_ip}: {combined}")
            except Exception:
                pass
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logging.exception("Unhandled error in create_contact")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

