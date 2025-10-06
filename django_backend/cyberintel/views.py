from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view

# Create your views here.

# A "fake" API example
@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, Cyber Threat Intelligence API!"})