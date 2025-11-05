from rest_framework import serializers
from .models import Threat, CweSoftwareDevelopment, NvdDataEnriched, FakeData


class ThreatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Threat
        fields = '__all__'

class CweSoftwareDevelopmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CweSoftwareDevelopment
        fields = '__all__'

class NvdDataEnrichedSerializer(serializers.ModelSerializer):
    class Meta:
        model = NvdDataEnriched
        fields = '__all__'

class FakeDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FakeData
        fields = '__all__'