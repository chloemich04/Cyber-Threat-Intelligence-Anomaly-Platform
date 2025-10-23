from django.shortcuts import render
from rest_framework import viewsets, generics
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import ThreatIndicator
from django.db import connection

from .models import Threat, CweSoftwareDevelopment, NvdDataEnriched
from .serializers import ThreatSerializer, CweSoftwareDevelopmentSerializer, NvdDataEnrichedSerializer


# Create your views here.

class ThreatListCreateView(generics.ListCreateAPIView):
    queryset = Threat.objects.all()
    serializer_class = ThreatSerializer

class CweSoftwareDevelopmentListCreateView(generics.ListCreateAPIView):
    queryset = CweSoftwareDevelopment.objects.all()
    serializer_class = CweSoftwareDevelopmentSerializer

class NvdDataEnrichedListCreateView(generics.ListCreateAPIView):
    queryset = NvdDataEnriched.objects.all()
    serializer_class = NvdDataEnrichedSerializer
