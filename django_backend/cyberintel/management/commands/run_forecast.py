"""
Django management command to run cyber threat forecasting.
Usage: python manage.py run_forecast --weeks 4 --batch-size 6
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
import pandas as pd
import json
import os
from datetime import datetime, timedelta
from cyberintel.models import NvdDataLimited, CweSoftwareLimited
from cyberintel.threat_forecast import forecast_threats, save_forecast_results
import random

# Path for storing latest forecast (same as in views.py)
FORECAST_CACHE_FILE = os.path.join(settings.BASE_DIR, 'latest_forecast.json')


def classify_threat_type(cwe_name, weakness, description, cve_description):
    """
    Classify threat type based on CWE and CVE data.
    Uses keyword matching to determine threat category.
    """
    # Define threat type keywords for classification
    threat_keywords = {
        'Injection': ['injection', 'sql', 'command', 'code injection', 'ldap', 'xpath', 'expression language'],
        'Cross-Site Scripting (XSS)': ['xss', 'cross-site scripting', 'script injection'],
        'Buffer Overflow': ['buffer overflow', 'buffer', 'overflow', 'memory corruption', 'stack overflow', 'heap overflow'],
        'Authentication': ['authentication', 'credential', 'password', 'login', 'session', 'authorization'],
        'Cryptographic': ['cryptographic', 'encryption', 'crypto', 'weak cipher', 'hash', 'key management'],
        'Path Traversal': ['path traversal', 'directory traversal', '../', 'file access'],
        'Information Disclosure': ['information disclosure', 'sensitive data', 'exposure', 'information leak'],
        'Denial of Service': ['denial of service', 'dos', 'resource exhaustion', 'infinite loop', 'uncontrolled'],
        'Remote Code Execution': ['remote code execution', 'rce', 'arbitrary code', 'execute'],
        'Privilege Escalation': ['privilege escalation', 'privilege', 'elevated', 'permission'],
        'Resource Management': ['resource', 'memory leak', 'resource exhaustion', 'allocation'],
        'Input Validation': ['input validation', 'validation', 'sanitization', 'untrusted input'],
        'Race Condition': ['race condition', 'toctou', 'concurrent', 'synchronization'],
        'Cross-Site Request Forgery': ['csrf', 'cross-site request forgery', 'request forgery'],
        'Deserialization': ['deserialization', 'untrusted data', 'serialize'],
    }
    
    # Combine all text fields for matching (convert to lowercase)
    combined_text = f"{cwe_name} {weakness} {description} {cve_description}".lower()
    
    # Try to categorize based on keywords
    for category, keywords in threat_keywords.items():
        if any(keyword in combined_text for keyword in keywords):
            return category
    
    # If no category matched, use CWE name or return "Other"
    if cwe_name and cwe_name.strip() and cwe_name.lower() != 'nan':
        return cwe_name[:50].title()
    
    return 'Other'


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            '--weeks',
            type=int,
            default=4,
            help='Number of weeks to forecast (default: 4)'
        )
        parser.add_argument(
            '--history-weeks',
            type=int,
            default=20,
            help='Number of historical weeks to analyze (default: 20, more = better predictions)'
        )
        parser.add_argument(
            '--lookback-days',
            type=int,
            default=90,
            help='Days of historical data to load (default: 90)'
        )
        parser.add_argument(
            '--output',
            type=str,
            default=None,
            help='Output JSON file path (default: auto-generated)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without calling the API'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('US Cyber Threat Forecasting'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        weeks = options['weeks']
        history_weeks = options['history_weeks']
        lookback_days = options['lookback_days']
        dry_run = options['dry_run']
        
        self.stdout.write(f"\nConfiguration:")
        self.stdout.write(f"  Forecast Horizon: {weeks} weeks")
        self.stdout.write(f"  Historical Data: {history_weeks} weeks")
        self.stdout.write(f"  Lookback Period: {lookback_days} days")
        self.stdout.write(f"  Analysis Scope: US ONLY")
        self.stdout.write(f"  Dry Run: {dry_run}")
        
        # Step 1: Load REAL CVE/CWE data from a curated forecast feed if available, otherwise query DB
        self.stdout.write(f"\n{self.style.WARNING('Step 1:')} Loading CVE and CWE data (using forecast feed if available)...")

        feed_file = os.path.join(settings.BASE_DIR, 'forecast_feed.json')
        nvd_records = []
        if os.path.exists(feed_file):
            try:
                with open(feed_file, 'r', encoding='utf-8') as f:
                    feed = json.load(f)
                    nvd_records = feed.get('cve_rows', [])
                self.stdout.write(f"  → Loaded {len(nvd_records)} curated CVE rows from forecast_feed.json")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  → Failed to load forecast_feed.json: {e}. Falling back to DB query."))

        if not nvd_records:
            # Query NVD database for CVEs - use the lightweight proxy model
            # and fetch only the fields we need for forecasting.
            nvd_records = list(
                NvdDataLimited.objects.only(
                    'id', 'published', 'vulnstatus', 'value', 'cwe_id', 'description'
                )[:100].values('id', 'published', 'vulnstatus', 'value', 'cwe_id', 'description')
            )
        
        if not nvd_records:
            self.stdout.write(self.style.ERROR("=" * 70))
            self.stdout.write(self.style.ERROR("NO CVE DATA AVAILABLE"))
            self.stdout.write(self.style.ERROR("=" * 70))
            self.stdout.write(self.style.ERROR("The NVD database is empty!"))
            self.stdout.write("")
            self.stdout.write("The system requires REAL CVE vulnerability data.")
            self.stdout.write("Please ensure the nvd_data_enriched table is populated.")
            self.stdout.write("")
            self.stdout.write(self.style.ERROR("Cannot proceed without real CVE data."))
            return
        
        # Show info about the data
        self.stdout.write(f"  → Loaded {len(nvd_records)} CVEs from NVD database")
        if nvd_records and nvd_records[0].get('published'):
            self.stdout.write(f"  → Sample date: {nvd_records[0].get('published', 'Unknown')}")
        
        # Get CWE data for enrichment (only load CWEs that match our CVEs)
        cve_cwe_ids = set(nvd.get('cwe_id') for nvd in nvd_records if nvd.get('cwe_id'))
        if cve_cwe_ids:
            cwe_lookup = {
                cwe.cwe_id: cwe 
                for cwe in CweSoftwareLimited.objects.filter(cwe_id__in=cve_cwe_ids)
            }
            self.stdout.write(f"  → Loaded {len(cwe_lookup)} CWE weakness records (matched to CVEs)")
        else:
            cwe_lookup = {}
            self.stdout.write(f"  → No CWE data needed (CVEs don't have CWE IDs)")
        
        # Simulate threat intelligence events from CVE data
        # Each CVE represents an actual threat with real published date
        # ONLY US DATA
        countries = [
            ('US', 'United States')
        ]
        
        # Use real CVE data from database
        
        # Use real CVE data from database
        # Each CVE record represents an actual threat with real published date
        threat_data = []
        
        self.stdout.write(f"  → Processing {len(nvd_records)} CVEs from database...")
        
        for nvd in nvd_records:
            cve_id = nvd['id']
            cwe_id = nvd.get('cwe_id', '')
            description = nvd.get('value', '').lower()
            published_date = nvd.get('published', '')
            
            # Parse the published date from the CVE data
            try:
                if published_date:
                    # Handle different date formats (ISO format, etc.)
                    timestamp = pd.to_datetime(published_date)
                else:
                    # If no date, skip this record
                    continue
            except Exception:
                # Skip records with invalid dates
                continue
            
            # Get CWE details for threat tags
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
                if 'denial' in weakness or 'dos' in weakness:
                    tags.append('dos')
            
            if not tags:
                tags = ['exploit', 'vulnerability']
            
            # Classify threat type based on CWE and CVE data
            cwe_name = cwe_info.name if cwe_info else ''
            weakness = cwe_info.weakness_abstraction if cwe_info else ''
            threat_type = classify_threat_type(
                cwe_name=cwe_name,
                weakness=weakness,
                description=nvd.get('description', ''),
                cve_description=nvd.get('value', '')
            )
            
            # Parse CVSS score from description or default
            cvss_score = 5.0
            if 'critical' in description:
                cvss_score = 9.5
            elif 'high' in description:
                cvss_score = 7.5
            elif 'medium' in description:
                cvss_score = 5.5
            elif 'low' in description:
                cvss_score = 3.0
            
            # Use real CVE data with actual published timestamp
            threat_data.append({
                'country_code': 'US',
                'country_name': 'United States',
                'cve_id': cve_id,
                'threat_type': threat_type,  # Add threat type classification
                'data': json.dumps({
                    'cvss': cvss_score,
                    'tags': tags[:3],
                    'cwe_id': cwe_id,
                    'cwe_name': cwe_name,
                    'threat_type': threat_type,  # Include in data JSON as well
                    'published': published_date,
                    'status': nvd.get('vulnstatus', ''),
                    'description': nvd.get('value', '')
                }),
                'timestamp': timestamp
            })
        
        df = pd.DataFrame(threat_data)
        threat_count = len(df)
        
        self.stdout.write(f"  → Generated {threat_count} threat intelligence events from CVE data")
        
        # Show data summary
        unique_countries = df['country_code'].nunique()
        unique_cves = df['cve_id'].nunique()
        date_range = f"{df['timestamp'].min().date()} to {df['timestamp'].max().date()}"
        self.stdout.write(f"  → Analyzing US data only")
        self.stdout.write(f"  → {unique_cves} unique CVEs tracked")
        self.stdout.write(f"  → Date range: {date_range}")
        self.stdout.write(self.style.SUCCESS("  → Using 100% REAL CVE/CWE data from your database"))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] Estimating prompt tokens and cost (no LLM call)"))
            try:
                forecast_result = forecast_threats(
                    df=df,
                    date_column='timestamp',
                    weeks_of_history=history_weeks,
                    forecast_weeks=weeks,
                    dry_run=True
                )
                est = forecast_result.get('estimated', {})
                self.stdout.write(f"  → Feature records prepared: {forecast_result.get('feature_records_count')}")
                self.stdout.write(f"  → Estimated input tokens: {est.get('estimated_input_tokens')}")
                self.stdout.write(f"  → Estimated output tokens: {est.get('estimated_output_tokens')}")
                self.stdout.write(f"  → Estimated total tokens: {est.get('estimated_total_tokens')}")
                self.stdout.write(f"  → Estimated cost (USD): ${est.get('estimated_cost_usd')}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Dry-run estimate failed: {e}"))
            return
        
        # Step 2: Run US forecast
        self.stdout.write(f"\n{self.style.WARNING('Step 2:')} Running US forecast...")
        
        try:
            forecast_result = forecast_threats(
                df=df,
                date_column='timestamp',
                weeks_of_history=history_weeks,
                forecast_weeks=weeks
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Forecast failed: {str(e)}"))
            import traceback
            self.stdout.write(traceback.format_exc())
            return
        
        # Step 3: Display results
        self.stdout.write(f"\n{self.style.WARNING('Step 3:')} US Forecast Results")
        
        predictions = forecast_result.get('predictions', [])
        self.stdout.write(f"  → Generated {len(predictions)} weekly predictions (US ONLY)")

        # Surface new LLM summary fields if present
        predicted_types = forecast_result.get('predicted_threat_types', [])
        monthly_attacks = forecast_result.get('monthly_predicted_attacks', None)
        if predicted_types:
            self.stdout.write(f"  → Model predicted {len(predicted_types)} threat type entries")
            for pt in predicted_types[:5]:
                self.stdout.write(f"    - {pt.get('threat_type')}: {pt.get('probability')}")
        if monthly_attacks is not None:
            self.stdout.write(f"  → Monthly predicted attacks (next ~4 weeks): {monthly_attacks}")
        
        if predictions:
            self.stdout.write("\n  Predictions by Week:")
            for i, pred in enumerate(predictions, 1):
                region = pred.get('region', 'US')
                week = pred.get('week_start')
                expected = pred.get('expected_count', 'N/A')
                spike_prob = pred.get('spike_probability', 0)
                confidence = pred.get('confidence', 0)
                
                self.stdout.write(
                    f"    Week {i} ({week}): "
                    f"{expected} threats in US (spike: {spike_prob:.0%}, conf: {confidence:.0%})"
                )
        
        # Add threat type distribution to forecast results
        self.stdout.write(f"\n{self.style.WARNING('Step 3.5:')} Adding threat type analysis...")
        threat_type_counts = {}
        for record in threat_data:
            threat_type = record.get('threat_type', 'Other')
            threat_type_counts[threat_type] = threat_type_counts.get(threat_type, 0) + 1
        
        # Sort by count and convert to list
        threat_types = [
            {'threat_type': tt, 'count': count}
            for tt, count in sorted(threat_type_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        forecast_result['threat_types'] = threat_types
        forecast_result['total_threats'] = len(threat_data)
        
        self.stdout.write(f"  → Added {len(threat_types)} threat type categories")
        self.stdout.write(f"  → Top 3 threat types:")
        for tt in threat_types[:3]:
            self.stdout.write(f"    - {tt['threat_type']}: {tt['count']} threats")
        
        # Step 4: Save results
        output_path = options['output']
        if not output_path:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = f"forecast_results_{timestamp}.json"
        
        # Add timestamp to forecast data
        forecast_result['generated_at'] = datetime.now().isoformat()
        
        self.stdout.write(f"\n{self.style.WARNING('Step 4:')} Saving results...")
        
        # Save to timestamped file
        save_forecast_results(forecast_result, output_path)
        
        # Also save to cache file for frontend
        try:
            with open(FORECAST_CACHE_FILE, 'w') as f:
                json.dump(forecast_result, f, indent=2)
            self.stdout.write(f"  → Saved to cache: {FORECAST_CACHE_FILE}")
            # Also populate Django in-memory cache if available
            try:
                from django.core.cache import cache
                ttl = getattr(settings, 'FORECAST_CACHE_TTL_SECONDS', 3600)
                cache.set('latest_forecast', forecast_result, timeout=ttl)
            except Exception:
                pass
        except Exception as cache_error:
            self.stdout.write(self.style.WARNING(f"  → Cache save failed: {cache_error}"))
        
        self.stdout.write(self.style.SUCCESS(f"\n✓ Forecast complete!"))
        self.stdout.write(f"  Timestamped output: {output_path}")
        self.stdout.write(f"  Frontend will auto-load from: {FORECAST_CACHE_FILE}")
