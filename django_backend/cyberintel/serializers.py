from rest_framework import serializers

from . import models
from .models import CveCountsByRegionEpss

class CveCountsByRegionEpssSerializer(serializers.ModelSerializer):
    class Meta:
        model = CveCountsByRegionEpss
        fields = [
            'region_code',
            'cve_id',
            'avg_epss',
            'name',
            'rank_per_state',
            'rank_overall'
        ]
