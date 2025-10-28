from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import ThreatIndicator
from .llm_service import ThreatPredictionService
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


@api_view(['GET'])
def get_dummy_cve_data(request):
    """Get dummy CVE data from file"""
    try:
        prediction_service = ThreatPredictionService()
        cve_data = prediction_service.get_threat_data()
        
        return Response({
            "status": "success",
            "count": len(cve_data),
            "data": cve_data
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)


@api_view(['GET'])
def get_threat_predictions(request):
    """Get AI-generated threat predictions using dummy CVE data"""
    try:
        timeframe = request.GET.get('timeframe', '30 days')
        prediction_service = ThreatPredictionService()
        predictions = prediction_service.generate_predictions_from_dummy_data(timeframe)
        
        return Response({
            "status": "success",
            "predictions": predictions
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)


@api_view(['GET'])
def get_dummy_cve_stats(request):
    """Get statistics about dummy CVE data"""
    try:
        prediction_service = ThreatPredictionService()
        cve_data = prediction_service.get_threat_data()
        
        if not cve_data:
            return Response({
                "status": "error",
                "message": "No CVE data available"
            }, status=404)
        
        # Count by severity
        severity_stats = {}
        for severity in ['Critical', 'High', 'Medium', 'Low']:
            count = sum(1 for cve in cve_data if cve.get('severity') == severity)
            severity_stats[severity] = count
        
        # Count by threat type
        threat_type_stats = {}
        for cve in cve_data:
            threat_type = cve.get('threat_type', 'Unknown')
            threat_type_stats[threat_type] = threat_type_stats.get(threat_type, 0) + 1
        
        # Count by vendor
        vendor_stats = {}
        for cve in cve_data:
            vendor = cve.get('vendor', 'Unknown')
            vendor_stats[vendor] = vendor_stats.get(vendor, 0) + 1
        
        return Response({
            "status": "success",
            "total_cves": len(cve_data),
            "by_severity": severity_stats,
            "by_threat_type": threat_type_stats,
            "by_vendor": vendor_stats
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)


@api_view(['GET', 'POST'])
def generate_predictions(request):
    """Legacy endpoint - redirects to CVE-based predictions"""
    try:
        timeframe = request.GET.get('timeframe', '30 days')
        prediction_service = ThreatPredictionService()
        predictions = prediction_service.generate_predictions_from_dummy_data(timeframe)
        
        return Response({
            "status": "success",
            "success": True,
            "predictions": predictions
        })
    except Exception as e:
        return Response({
            "status": "error",
            "success": False,
            "error": str(e),
            "message": str(e)
        }, status=500)