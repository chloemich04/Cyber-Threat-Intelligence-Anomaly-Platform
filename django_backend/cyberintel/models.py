from django.db import models


# Create your models here.

# Test model for cyber threat intelligence
class ThreatIndicator(models.Model):
    indicator_type = models.CharField(max_length=50)  # e.g., IP, domain, hash
    value = models.CharField(max_length=255)
    severity = models.CharField(max_length=20)  # low, medium, high, critical
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.indicator_type}: {self.value}"
    
    class Meta:
        ordering = ['-created_at']


# Alternative model for more detailed threat data
class Threat(models.Model):
    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    source = models.CharField(max_length=255)
    threat_type = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='Low')
    detected_at = models.DateTimeField(auto_now_add=True)
    confidence_level = models.IntegerField(null=True, blank=True)
    link = models.URLField(null=True, blank=True)

    def __str__(self):
        return f"{self.threat_type} from {self.source}"

# Created model made for .csv file of data for heatmap
class FakeData(models.Model):
    latitude = models.FloatField()
    longitude = models.FloatField()
    country_name = models.CharField(max_length=100)
    country_code = models.CharField(max_length=10)
    region_code = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    cve_id = models.CharField(max_length=50)
    epss = models.FloatField()
    cvss_version = models.FloatField()

    def __str__(self):
        return f"{self.city}, {self.country_name} ({self.cve_id})"

class CweSoftwareDevelopment(models.Model):
    cwe_id = models.TextField(blank=True, null=False,primary_key=True)
    name = models.TextField(blank=True, null=False)
    weakness_abstraction = models.TextField(blank=True, null=False)
    status = models.TextField(blank=True, null=False)
    description = models.TextField(blank=True, null=False)
    extended_description = models.TextField(blank=True, null=False)
    related_weaknesses = models.TextField(blank=True, null=False)
    weakness_ordinalities = models.TextField(blank=True, null=False)
    applicable_platforms = models.TextField(blank=True, null=False)
    background_details = models.TextField(blank=True, null=False)
    alternate_terms = models.TextField(blank=True, null=False)
    modes_of_introduction = models.TextField(blank=True, null=False)
    exploitation_factors = models.TextField(blank=True, null=False)
    likelihood_of_exploit = models.TextField(blank=True, null=False)
    common_consequences = models.TextField(blank=True, null=False)
    detection_methods = models.TextField(blank=True, null=False)
    potential_mitigations = models.TextField(blank=True, null=False)
    observed_examples = models.TextField(blank=True, null=False)
    functional_areas = models.TextField(blank=True, null=False)
    affected_resources = models.TextField(blank=True, null=False)
    taxonomy_mappings = models.TextField(blank=True, null=False)
    related_attack_patterns = models.TextField(blank=True, null=False)
    notes = models.TextField(blank=True, null=False)

    class Meta:
        #managed = False
        db_table = 'cwe_software_development'

class NvdDataEnriched(models.Model):
    id = models.TextField(blank=True, null=False,primary_key=True)
    published = models.TextField(blank=True, null=False)
    vulnstatus = models.TextField(db_column='vulnStatus', blank=True, null=False)  # Field name made lowercase.
    lang = models.TextField(blank=True, null=False)
    value = models.TextField(blank=True, null=False)
    source = models.TextField(blank=True, null=False)
    type = models.TextField(blank=True, null=False)
    url = models.TextField(blank=True, null=False)
    cwe_id = models.TextField(blank=True, null=False)
    name = models.TextField(blank=True, null=False)
    weakness_abstraction = models.TextField(blank=True, null=False)
    status = models.TextField(blank=True, null=False)
    description = models.TextField(blank=True, null=False)
    extended_description = models.TextField(blank=True, null=False)
    alternate_terms = models.TextField(blank=True, null=False)
    modes_of_introduction = models.TextField(blank=True, null=False)
    common_consequences = models.TextField(blank=True, null=False)
    detection_methods = models.TextField(blank=True, null=False)
    potential_mitigations = models.TextField(blank=True, null=False)
    observed_examples = models.TextField(blank=True, null=False)
    functional_areas = models.TextField(blank=True, null=False)
    affected_resources = models.TextField(blank=True, null=False)
    taxonomy_mappings = models.TextField(blank=True, null=False)
    related_attack_patterns = models.TextField(blank=True, null=False)
    notes = models.TextField(blank=True, null=False)
    cwe_source = models.TextField(blank=True, null=False)

    class Meta:
        #managed = False
        db_table = 'nvd_data_enriched'
