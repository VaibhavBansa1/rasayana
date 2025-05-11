from django.contrib import admin
from .models import Developer, DeveloperContribution, DeveloperSkill, DeveloperContact, DeveloperProfile, DownloadLink

class DeveloperContributionInline(admin.TabularInline):
    model = DeveloperContribution
    extra = 1
    verbose_name = "Contribution"
    verbose_name_plural = "Contributions"

class DeveloperSkillInline(admin.TabularInline):
    model = DeveloperSkill
    extra = 1
    verbose_name = "Skill"
    verbose_name_plural = "Skills"

class DeveloperContactInline(admin.StackedInline):
    model = DeveloperContact
    can_delete = False
    max_num = 1
    verbose_name = "Contact Information"
    verbose_name_plural = "Contact Information"

class DeveloperProfileInline(admin.StackedInline):
    model = DeveloperProfile
    can_delete = False
    max_num = 1
    verbose_name = "Social Profile"
    verbose_name_plural = "Social Profile"

@admin.register(Developer)
class DeveloperAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'location', 'experience', 'has_contact', 'has_profile')
    list_filter = ('role', 'location')
    search_fields = ('name', 'role', 'bio')
    ordering = ('name',)
    inlines = [
        DeveloperContactInline,
        DeveloperProfileInline,
        DeveloperContributionInline,
        DeveloperSkillInline
    ]

    def has_contact(self, obj):
        return hasattr(obj, 'contact')
    has_contact.boolean = True
    has_contact.short_description = 'Has Contact Info'

    def has_profile(self, obj):
        return hasattr(obj, 'profile')
    has_profile.boolean = True
    has_profile.short_description = 'Has Social Profile'

@admin.register(DeveloperContribution)
class DeveloperContributionAdmin(admin.ModelAdmin):
    list_display = ('developer', 'description')
    search_fields = ('developer__name', 'description')
    list_filter = ('developer',)
    ordering = ('developer', 'id')

@admin.register(DeveloperSkill)
class DeveloperSkillAdmin(admin.ModelAdmin):
    list_display = ('developer', 'name')
    list_filter = ('name', 'developer')
    search_fields = ('developer__name', 'name')
    ordering = ('developer', 'name')

@admin.register(DeveloperContact)
class DeveloperContactAdmin(admin.ModelAdmin):
    list_display = ('developer', 'email', 'phone')
    search_fields = ('developer__name', 'email', 'phone')
    ordering = ('developer',)

@admin.register(DeveloperProfile)
class DeveloperProfileAdmin(admin.ModelAdmin):
    list_display = ('developer', 'linkedin', 'twitter', 'website')
    search_fields = ('developer__name',)
    ordering = ('developer',)

@admin.register(DownloadLink)
class DownloadLinkAdmin(admin.ModelAdmin):
    list_display = ('title', 'url', 'created_at')
    search_fields = ('title', 'url')
    ordering = ('created_at',)