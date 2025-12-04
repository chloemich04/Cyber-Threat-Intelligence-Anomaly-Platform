"""
Management command to create a compact forecast feed JSON that contains only the most important
CVE/CWE rows for LLM input. This avoids loading millions of rows into memory and gives the AI
a curated set of records (critical/high CVEs, recent CVEs, and top CWE categories).

Usage: python manage.py build_forecast_feed --limit 300
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from cyberintel.models import NvdDataLimited, CweSoftwareLimited
import json
import os
from collections import OrderedDict


FEED_FILE = os.path.join(settings.BASE_DIR, 'forecast_feed.json')


class Command(BaseCommand):
    help = 'Build a small, curated forecast feed JSON for LLM input (avoids millions of rows)'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=300, help='Maximum number of CVE rows to include')
        parser.add_argument('--recent-days', type=int, default=180, help='Prefer CVEs published in last N days')

    def handle(self, *args, **options):
        limit = options['limit']
        recent_days = options['recent_days']

        self.stdout.write(f"Building forecast feed (limit={limit}, recent_days={recent_days})")

        # Strategy: create a candidate pool then prefer rows with known EPSS or CVSS scores
        # to maximize signal per row. We avoid scanning the entire table by sampling a bounded pool.
        pool_size = max(limit * 8, 800)
        candidate_qs = NvdDataLimited.objects.filter(published__isnull=False).values(
            'id', 'published', 'vulnstatus', 'value', 'cwe_id', 'description'
        )[:pool_size]

        candidates = list(candidate_qs)

        # Helper to extract numeric CVSS/EPSS from text
        import re

        def extract_scores(rec):
            text = (rec.get('value') or '') + '\n' + (rec.get('description') or '')
            text = text.lower()
            epss = None
            cvss = None
            # EPSS patterns
            m = re.search(r'epss[^0-9]*([0-9]+\.?[0-9]*)', text)
            if m:
                try:
                    epss = float(m.group(1))
                except Exception:
                    epss = None
            # CVSS patterns
            m2 = re.search(r'cvss[^0-9]*([0-9]+\.?[0-9]*)', text)
            if m2:
                try:
                    cvss = float(m2.group(1))
                except Exception:
                    cvss = None
            return epss, cvss

        scored = []
        for rec in candidates:
            try:
                epss, cvss = extract_scores(rec)
            except Exception:
                epss, cvss = (None, None)
            scored.append({'rec': rec, 'epss': epss or 0.0, 'cvss': cvss or 0.0})

        # Sort by EPSS desc, then CVSS desc, then recent published date
        def parse_date(dt):
            try:
                return dt
            except Exception:
                return None

        scored.sort(key=lambda x: (x['epss'], x['cvss'], str(x['rec'].get('published'))), reverse=True)

        # Take top 'limit' rows
        cves = []
        for item in scored[:limit * 2]:
            rec = item['rec']
            cves.append(rec)

        # Deduplicate and trim to limit
        final_cves = []
        seen = set()
        for r in cves:
            cid = r.get('id')
            if not cid or cid in seen:
                continue
            seen.add(cid)
            final_cves.append(r)
            if len(final_cves) >= limit:
                break

        cves = final_cves
        self.stdout.write(f"  → Collected {len(cves)} CVE rows for forecast feed (prefer high EPSS/CVSS)")

        # Enrich with CWE names if possible
        cwe_ids = [r.get('cwe_id') for r in cves if r.get('cwe_id')]
        cwe_lookup = {}
        if cwe_ids:
            for cwe in CweSoftwareLimited.objects.filter(cwe_id__in=set(cwe_ids)):
                cwe_lookup[cwe.cwe_id] = {'name': cwe.name, 'weakness_abstraction': cwe.weakness_abstraction}

        enriched = []
        for r in cves:
            cwe_info = cwe_lookup.get(r.get('cwe_id'))
            enriched.append({
                'id': r.get('id'),
                'published': r.get('published'),
                'vulnstatus': r.get('vulnstatus'),
                'value': r.get('value'),
                'cwe_id': r.get('cwe_id'),
                'cwe_name': cwe_info.get('name') if cwe_info else '',
                'weakness_abstraction': cwe_info.get('weakness_abstraction') if cwe_info else '',
                'description': r.get('description')
            })

        # Deduplicate and limit again for safety
        final = []
        seen2 = set()
        for e in enriched:
            if e['id'] in seen2:
                continue
            seen2.add(e['id'])
            final.append(e)
            if len(final) >= limit:
                break

        feed = {
            'generated_at': None,
            'cve_rows': final,
            'count': len(final)
        }

        try:
            with open(FEED_FILE, 'w', encoding='utf-8') as f:
                json.dump(feed, f, default=str, indent=2)
            self.stdout.write(self.style.SUCCESS(f"Saved forecast feed to: {FEED_FILE}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to save forecast feed: {e}"))
