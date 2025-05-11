from django.contrib import admin
from .models import (
    Cuisine, DishType, Diet, Occasion, Tag, Ingredient,
    Recipe, RecipeIngredient, Favorite, Notification,
    APIMetadata, UserPreference, RecipeInteraction, Recommendation
)

#########################
# Normalized Data Admin #
#########################

@admin.register(Cuisine)
class CuisineAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(DishType)
class DishTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Diet)
class DietAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Occasion)
class OccasionAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'aisle')
    search_fields = ('name', 'nameClean', 'originalName')
    ordering = ('name',)

##############################
# Recipe and Related Inlines #
##############################

class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'cook_time', 'cookingMinutes', 'servings',
        'vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'veryHealthy',
        'aggregateLikes', 'spoonacularScore', 'created_at'
    )
    search_fields = ('title', 'description', 'instructions', 'sourceUrl')
    list_filter = (
        'vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'veryHealthy',
        'cuisines__name', 'dishTypes__name', 'diets__name', 'occasions__name'
    )
    ordering = ('-created_at', 'title')
    date_hierarchy = 'created_at'
    inlines = [RecipeIngredientInline]
    readonly_fields = ('created_at', 'updated_at')

#############################
# Other Models Administration #
#############################

@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'recipe', 'created_at')
    list_filter = ('user', 'recipe')
    ordering = ('-created_at',)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'title', 'is_read', 'created_at']
    list_filter = ['type', 'is_read', 'created_at']
    search_fields = ['user__username', 'title', 'message']
    readonly_fields = ['created_at']
    raw_id_fields = ['user', 'related_recipe']

@admin.register(APIMetadata)
class APIMetadataAdmin(admin.ModelAdmin):
    list_display = ('api_name', 'total_recipes', 'rate_limit', 'last_fetched')
    search_fields = ('api_name',)
    ordering = ('api_name',)

@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at')
    filter_horizontal = ('preferred_cuisines', 'dietary_restrictions', 'disliked_ingredients', 'preferred_tags')
    ordering = ('user',)

@admin.register(RecipeInteraction)
class RecipeInteractionAdmin(admin.ModelAdmin):
    list_display = ('user', 'recipe', 'liked', 'saved', 'viewed_count', 'last_viewed')
    list_filter = ('liked', 'saved')
    ordering = ('-last_viewed',)

@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ('user', 'recipe', 'score', 'created_at')
    search_fields = ('user__username', 'recipe__title')
    ordering = ('-score',)
