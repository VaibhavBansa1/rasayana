from django.db import models
from django.conf import settings

BASEURL = 'https://' + settings.BASEURL

class Developer(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    image = models.URLField(default=BASEURL+"/static/default_user.png")
    bio = models.TextField()
    location = models.CharField(max_length=100, blank=True, null=True)
    experience = models.CharField(max_length=50, blank=True, null=True)
    github_url = models.URLField(blank=True, null=True, verbose_name="GitHub URL")
    portfolio_url = models.URLField(blank=True, null=True, verbose_name="Portfolio URL")

    def __str__(self):
        return f"{self.name} - {self.role}"

    class Meta:
        verbose_name = "Developer"
        verbose_name_plural = "Developers"

class DeveloperContribution(models.Model):
    developer = models.ForeignKey(
        Developer, 
        on_delete=models.CASCADE,
        related_name='contributions'
    )
    description = models.TextField()

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.description

class DeveloperSkill(models.Model):
    developer = models.ForeignKey(
        Developer, 
        on_delete=models.CASCADE,
        related_name='skills'
    )
    name = models.CharField(max_length=50)

    class Meta:
        unique_together = ['developer', 'name']
        ordering = ['name']

    def __str__(self):
        return self.name

class DeveloperContact(models.Model):
    developer = models.OneToOneField(
        Developer,
        on_delete=models.CASCADE,
        related_name='contact'
    )
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"Contact for {self.developer.name}"

class DeveloperProfile(models.Model):
    developer = models.OneToOneField(
        Developer,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    linkedin = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"Profile for {self.developer.name}"

class DownloadLink(models.Model):
    title = models.CharField(max_length=100)
    url = models.URLField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Download Link"