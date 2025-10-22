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