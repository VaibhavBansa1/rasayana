from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Developer, DeveloperContribution, DeveloperSkill, DeveloperContact, DeveloperProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'password')
        extra_kwargs = { 'password': {'write_only': True} }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class DeveloperContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperContact
        fields = ['email', 'phone']

class DeveloperProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperProfile
        fields = ['linkedin', 'twitter', 'website']

class DeveloperSerializer(serializers.ModelSerializer):
    contributions = serializers.StringRelatedField(many=True)
    skills = serializers.StringRelatedField(many=True)
    contact = DeveloperContactSerializer()
    profile = DeveloperProfileSerializer()
    # Remove redundant source parameters
    githubUrl = serializers.URLField(source='github_url', allow_null=True)
    portfolioUrl = serializers.URLField(source='portfolio_url', allow_null=True)

    class Meta:
        model = Developer
        fields = [
            'name', 'role', 'image', 'bio', 'location', 'experience',
            'githubUrl', 'portfolioUrl', 'contributions', 'skills',
            'contact', 'profile'
        ]

class DownloadLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperContribution
        fields = ['download_link']