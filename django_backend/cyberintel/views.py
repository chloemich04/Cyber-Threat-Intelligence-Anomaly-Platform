from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import ThreatIndicator
from django.db import connection

# Create your views here.

# A "fake" API example
@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, Cyber Threat Intelligence API!"})


@api_view(['GET'])
def test_db_connection(request):
    """Test database connection and return basic stats"""
    try:
        # Test connection
        connection.ensure_connection()
        
        # Get count of records
        count = ThreatIndicator.objects.count()
        
        # Get all indicators
        indicators = ThreatIndicator.objects.all().values()
        
        return Response({
            "status": "connected",
            "message": "Database connection successful!",
            "database": connection.settings_dict['NAME'],
            "host": connection.settings_dict['HOST'],
            "port": connection.settings_dict['PORT'],
            "total_indicators": count,
            "indicators": list(indicators)
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)


@api_view(['GET'])
def get_threats(request):
    """Get all threat indicators with filtering options"""
    
    # Get query parameters
    severity = request.GET.get('severity', None)
    indicator_type = request.GET.get('type', None)
    
    # Start with all indicators
    queryset = ThreatIndicator.objects.all()
    
    # Apply filters if provided
    if severity:
        queryset = queryset.filter(severity=severity)
    if indicator_type:
        queryset = queryset.filter(indicator_type=indicator_type)
    
    indicators = queryset.values()
    
    return Response({
        "count": len(indicators),
        "filters_applied": {
            "severity": severity,
            "type": indicator_type
        },
        "data": list(indicators)
    })


@api_view(['GET'])
def get_threat_stats(request):
    """Get statistics about threat indicators"""
    try:
        total = ThreatIndicator.objects.count()
        
        # Count by severity
        severity_stats = {}
        for severity in ['low', 'medium', 'high', 'critical']:
            count = ThreatIndicator.objects.filter(severity=severity).count()
            severity_stats[severity] = count
        
        # Count by type
        type_stats = {}
        for indicator_type in ['IP', 'Domain', 'Hash', 'Email']:
            count = ThreatIndicator.objects.filter(indicator_type=indicator_type).count()
            type_stats[indicator_type] = count
        
        return Response({
            "total_threats": total,
            "by_severity": severity_stats,
            "by_type": type_stats
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)