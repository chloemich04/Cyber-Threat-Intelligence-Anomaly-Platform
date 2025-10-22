from django.db import models


# Create your models here.
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
