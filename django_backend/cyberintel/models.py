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


class CveCountsByRegion(models.Model):
    region_code = models.TextField(blank=True, null=True)
    cve_id = models.TextField(blank=True, null=True)
    cve_count = models.BigIntegerField()
    name = models.TextField(blank=True, null=True)

    class Meta:
        #managed = False
        db_table = 'cve_counts_by_region'


class CveCountsByRegionEpss(models.Model):
    region_code = models.TextField(blank=True, null=True)
    cve_id = models.TextField(blank=True, null=False, primary_key=True)
    cve_count = models.BigIntegerField()
    avg_epss = models.FloatField(blank=True, null=True)
    name = models.TextField(blank=True, null=True)
    rank_per_state = models.IntegerField()
    rank_overall = models.IntegerField()
    rank_per_state_count = models.IntegerField()
    rank_overall_count = models.IntegerField()

    class Meta:
        #managed = False
        db_table = 'cve_counts_by_region_epss'

class IspCountsByRegion(models.Model):
    id = models.BigAutoField(primary_key=True)
    region_code = models.TextField(blank=True, null=True)
    isp = models.TextField(blank=True, null=True)
    cnt = models.BigIntegerField()
    rank_per_state_isp = models.IntegerField()

    class Meta:
        #managed = False
        db_table = 'isp_counts_by_region'
