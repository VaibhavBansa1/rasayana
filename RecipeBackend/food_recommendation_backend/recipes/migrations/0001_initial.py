# Generated by Django 5.1.2 on 2025-02-18 18:28

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='APIMetadata',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('api_name', models.CharField(max_length=100)),
                ('last_fetched', models.DateTimeField(blank=True, null=True)),
                ('total_recipes', models.PositiveIntegerField(default=0)),
                ('rate_limit', models.PositiveIntegerField(default=0)),
                ('base_url', models.URLField()),
            ],
        ),
        migrations.CreateModel(
            name='Cuisine',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Diet',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='DishType',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Ingredient',
            fields=[
                ('id', models.IntegerField(primary_key=True, serialize=False)),
                ('aisle', models.CharField(blank=True, max_length=255, null=True)),
                ('name', models.CharField(max_length=255)),
                ('nameClean', models.CharField(blank=True, max_length=255, null=True)),
                ('originalName', models.CharField(blank=True, max_length=255, null=True)),
                ('meta', models.JSONField(blank=True, null=True)),
                ('metric_amount', models.FloatField(blank=True, null=True)),
                ('metric_unitShort', models.CharField(blank=True, max_length=50, null=True)),
                ('metric_unitLong', models.CharField(blank=True, max_length=50, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Occasion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=50, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Recipe',
            fields=[
                ('id', models.IntegerField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('analyzedInstructions', models.JSONField(blank=True, help_text='Analyzed instructions JSON data (as returned by Spoonacular)', null=True)),
                ('instructions', models.TextField(blank=True, null=True)),
                ('image', models.ImageField(blank=True, null=True, upload_to='recipe_images/')),
                ('external_image', models.URLField(blank=True, null=True)),
                ('cook_time', models.PositiveIntegerField(blank=True, help_text='Cooking time in minutes', null=True)),
                ('cookingMinutes', models.PositiveIntegerField(blank=True, null=True)),
                ('difficulty', models.CharField(blank=True, choices=[('Easy', 'Easy'), ('Medium', 'Medium'), ('Hard', 'Hard')], max_length=50, null=True)),
                ('nutrition', models.JSONField(blank=True, null=True)),
                ('healthScore', models.FloatField(blank=True, null=True)),
                ('aggregateLikes', models.IntegerField(blank=True, null=True)),
                ('pricePerServing', models.FloatField(blank=True, null=True)),
                ('spoonacularScore', models.FloatField(blank=True, null=True)),
                ('sourceUrl', models.URLField(blank=True, null=True)),
                ('imageType', models.CharField(blank=True, max_length=10, null=True)),
                ('youtubeVideoLink', models.URLField(blank=True, null=True)),
                ('vegetarian', models.BooleanField(default=False)),
                ('vegan', models.BooleanField(default=False)),
                ('glutenFree', models.BooleanField(default=False)),
                ('dairyFree', models.BooleanField(default=False)),
                ('veryHealthy', models.BooleanField(default=False)),
                ('cheap', models.BooleanField(default=False)),
                ('veryPopular', models.BooleanField(default=False)),
                ('sustainable', models.BooleanField(default=False)),
                ('lowFodmap', models.BooleanField(default=False)),
                ('weightWatcherSmartPoints', models.FloatField(blank=True, null=True)),
                ('gaps', models.CharField(blank=True, max_length=10, null=True)),
                ('preparationMinutes', models.PositiveIntegerField(blank=True, null=True)),
                ('servings', models.PositiveIntegerField(blank=True, help_text='Number of Servings', null=True)),
                ('api_source', models.CharField(blank=True, help_text='Source of the recipe (API name)', max_length=100, null=True)),
                ('created_by_user', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('cuisines', models.ManyToManyField(blank=True, related_name='recipes', to='recipes.cuisine')),
                ('diets', models.ManyToManyField(blank=True, related_name='recipes', to='recipes.diet')),
                ('dishTypes', models.ManyToManyField(blank=True, related_name='recipes', to='recipes.dishtype')),
                ('occasions', models.ManyToManyField(blank=True, related_name='recipes', to='recipes.occasion')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='user_recipes', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
                ('recipe', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='recipes.recipe')),
            ],
        ),
        migrations.CreateModel(
            name='RecipeIngredient',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('quantity', models.CharField(blank=True, max_length=50, null=True)),
                ('ingredient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recipe_ingredients', to='recipes.ingredient')),
                ('recipe', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recipe_ingredients', to='recipes.recipe')),
            ],
            options={
                'unique_together': {('recipe', 'ingredient')},
            },
        ),
        migrations.AddField(
            model_name='recipe',
            name='ingredients',
            field=models.ManyToManyField(related_name='recipes', through='recipes.RecipeIngredient', to='recipes.ingredient'),
        ),
        migrations.CreateModel(
            name='RecipeInteraction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('liked', models.BooleanField(default=False)),
                ('saved', models.BooleanField(default=False)),
                ('viewed_count', models.PositiveIntegerField(default=0)),
                ('last_viewed', models.DateTimeField(auto_now=True)),
                ('recipe', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interactions', to='recipes.recipe')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recipe_interactions', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='recipe',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='recipes', to='recipes.tag'),
        ),
        migrations.CreateModel(
            name='UserPreference',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('calorie_range_min', models.PositiveIntegerField(blank=True, help_text='Minimum calorie preference', null=True)),
                ('calorie_range_max', models.PositiveIntegerField(blank=True, help_text='Maximum calorie preference', null=True)),
                ('cook_time_max', models.PositiveIntegerField(blank=True, help_text='Maximum cooking time in minutes', null=True)),
                ('difficulty_levels', models.JSONField(blank=True, help_text="Preferred difficulties (e.g., ['Easy', 'Medium'])", null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('dietary_restrictions', models.ManyToManyField(blank=True, related_name='user_dietary_restrictions', to='recipes.tag')),
                ('disliked_ingredients', models.ManyToManyField(blank=True, related_name='users_disliked', to='recipes.ingredient')),
                ('preferred_cuisines', models.ManyToManyField(blank=True, related_name='user_preferences', to='recipes.cuisine')),
                ('preferred_tags', models.ManyToManyField(blank=True, related_name='user_preferred_tags', to='recipes.tag')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='preferences', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Favorite',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorites', to=settings.AUTH_USER_MODEL)),
                ('recipe', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorited_by', to='recipes.recipe')),
            ],
            options={
                'unique_together': {('user', 'recipe')},
            },
        ),
        migrations.CreateModel(
            name='Recommendation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('score', models.FloatField(help_text='Recommendation score based on preferences and interactions')),
                ('reason', models.TextField(blank=True, help_text='Why this recipe was recommended', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipe', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recommended_to', to='recipes.recipe')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recommendations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'recipe')},
            },
        ),
    ]
