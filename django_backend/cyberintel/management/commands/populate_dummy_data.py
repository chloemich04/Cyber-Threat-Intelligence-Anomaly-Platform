from django.core.management.base import BaseCommand
from cyberintel.models import ThreatIndicator

class Command(BaseCommand):
    help = 'Populate database with dummy threat data'

    def handle(self, *args, **kwargs):
        dummy_data = [
            {
                'indicator_type': 'IP',
                'value': '192.168.1.100',
                'severity': 'high',
                'description': 'Suspicious IP address detected in network scan'
            },
            {
                'indicator_type': 'IP',
                'value': '10.0.0.50',
                'severity': 'critical',
                'description': 'Known malicious actor IP from threat feed'
            },
            {
                'indicator_type': 'Domain',
                'value': 'malicious-site.com',
                'severity': 'critical',
                'description': 'Known phishing domain'
            },
            {
                'indicator_type': 'Domain',
                'value': 'suspicious-download.net',
                'severity': 'high',
                'description': 'Domain hosting malware'
            },
            {
                'indicator_type': 'Hash',
                'value': 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
                'severity': 'medium',
                'description': 'Suspicious file hash from malware analysis'
            },
            {
                'indicator_type': 'Hash',
                'value': 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
                'severity': 'high',
                'description': 'Ransomware payload hash'
            },
            {
                'indicator_type': 'Email',
                'value': 'phishing@scammer.com',
                'severity': 'medium',
                'description': 'Email address used in phishing campaign'
            },
        ]
        
        self.stdout.write(self.style.MIGRATE_HEADING('\nPopulating dummy threat data...\n'))
        
        created_count = 0
        existing_count = 0
        
        for data in dummy_data:
            indicator, created = ThreatIndicator.objects.get_or_create(
                value=data['value'],
                defaults=data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'[+] Created: {indicator}'))
                created_count += 1
            else:
                self.stdout.write(self.style.WARNING(f'[*] Already exists: {indicator}'))
                existing_count += 1
        
        total = ThreatIndicator.objects.count()
        
        self.stdout.write(self.style.MIGRATE_HEADING(f'\n=== Summary ==='))
        self.stdout.write(self.style.SUCCESS(f'Created: {created_count}'))
        self.stdout.write(self.style.WARNING(f'Already existed: {existing_count}'))
        self.stdout.write(self.style.SUCCESS(f'Total indicators in database: {total}\n'))

