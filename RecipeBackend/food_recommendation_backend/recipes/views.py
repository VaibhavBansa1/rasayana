# from django.shortcuts import render

# # Create your views here.
# views.py
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Recipe
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

