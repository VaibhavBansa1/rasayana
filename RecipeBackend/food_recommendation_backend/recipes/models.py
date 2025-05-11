from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

User = settings.AUTH_USER_MODEL

#################################
# 1. Models for Normalized Data #
#################################

class Cuisine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.name

class DishType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.name

class Diet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.name

class Occasion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.name

class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.name

# Ingredient model based on the trimmed extendedIngredients JSON snippet
class Ingredient(models.Model):
    # Using Spoonacular's ingredient id (an integer) as the primary key.
    id = models.IntegerField(primary_key=True)
    aisle = models.CharField(max_length=255, blank=True, null=True)
    name = models.CharField(max_length=255)
    nameClean = models.CharField(max_length=255, blank=True, null=True)
    originalName = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return self.name

#####################################
# 2. Primary Models for the App     #
#####################################

class Recipe(models.Model):
    # Use the Spoonacular recipe id (an integer) as the primary key.
    id = models.IntegerField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField()  # e.g., summary
    # Store analyzed instructions directly as JSON.
    analyzedInstructions = models.JSONField(
        null=True,
        blank=True,
        help_text="Analyzed instructions JSON data (as returned by Spoonacular)"
    )
    # Alternatively, you may keep plain instructions text if needed:
    instructions = models.TextField(null=True, blank=True)
    
    # For images, we support both an uploaded image and an external URL.
    image = models.ImageField(upload_to="recipe_images/", null=True, blank=True)
    external_image = models.URLField(null=True, blank=True)
    
    cook_time = models.PositiveIntegerField(null=True, blank=True, help_text="Cooking time in minutes")
    cookingMinutes = models.PositiveIntegerField(null=True, blank=True)  # Separate if needed
    
    difficulty = models.CharField(
        max_length=50,
        choices=[('Easy', 'Easy'), ('Medium', 'Medium'), ('Hard', 'Hard')],
        null=True,
        blank=True
    )
    
    nutrition = models.JSONField(null=True, blank=True)
    healthScore = models.FloatField(null=True, blank=True)
    aggregateLikes = models.IntegerField(null=True, blank=True)
    pricePerServing = models.FloatField(null=True, blank=True)
    spoonacularScore = models.FloatField(null=True, blank=True)
    sourceUrl = models.URLField(null=True, blank=True)
    imageType = models.CharField(max_length=10, null=True, blank=True)
    youtubeVideoLink = models.URLField(null=True, blank=True)
    
    # Recipe Flags
    vegetarian = models.BooleanField(default=False)
    vegan = models.BooleanField(default=False)
    glutenFree = models.BooleanField(default=False)
    dairyFree = models.BooleanField(default=False)
    veryHealthy = models.BooleanField(default=False)
    cheap = models.BooleanField(default=False)
    veryPopular = models.BooleanField(default=False)
    sustainable = models.BooleanField(default=False)
    lowFodmap = models.BooleanField(default=False)
    weightWatcherSmartPoints = models.FloatField(null=True, blank=True)
    gaps = models.CharField(max_length=10, blank=True, null=True)
    preparationMinutes = models.PositiveIntegerField(null=True, blank=True)
    
    servings = models.PositiveIntegerField(null=True, blank=True, help_text="Number of Servings")
    
    # Relationships to normalized data (Many-to-Many relationships)
    cuisines = models.ManyToManyField(Cuisine, blank=True, related_name="recipes")
    dishTypes = models.ManyToManyField(DishType, blank=True, related_name="recipes")
    diets = models.ManyToManyField(Diet, blank=True, related_name="recipes")
    occasions = models.ManyToManyField(Occasion, blank=True, related_name="recipes")
    tags = models.ManyToManyField(Tag, blank=True, related_name="recipes")
    # Ingredients are linked via a through model for recipe-specific quantities.
    ingredients = models.ManyToManyField(Ingredient, through="RecipeIngredient", related_name="recipes")
    
    # Source and user details
    api_source = models.CharField(max_length=100, null=True, blank=True, help_text="Source of the recipe (API name)")
    created_by_user = models.BooleanField(default=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="user_recipes")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title

class RecipeIngredient(models.Model):
    """
    Through model to connect Recipe and Ingredient with extra information like recipe-specific quantity.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="recipe_ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="recipe_ingredients")
    # Here, quantity is stored as a string (to accommodate values like "¾ cup")
    meta = models.JSONField(blank=True, null=True)
    # Store metric measures from the JSON (trimmed)
    metric_amount = models.FloatField(blank=True, null=True)
    metric_unitShort = models.CharField(max_length=50, blank=True, null=True)
    metric_unitLong = models.CharField(max_length=50, blank=True, null=True)
    
    class Meta:
        unique_together = ('recipe', 'ingredient')
    
    def __str__(self):
        return f"{self.ingredient.name} in {self.recipe.title}"

####################################
# 3. User Preferences and Tracking #
####################################

class Favorite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'recipe')
    
    def __str__(self):
        return f"{self.user} -> {self.recipe}"

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('like', 'Like'),
        ('system', 'System'),
        ('confirmation', 'Order Confirmation'),
        ('milestone', 'Milestone')
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # For storing additional data
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_recipe = models.ForeignKey(
        'Recipe',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} notification for {self.user.username}"

class APIMetadata(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    api_name = models.CharField(max_length=100)
    last_fetched = models.DateTimeField(null=True, blank=True)
    total_recipes = models.PositiveIntegerField(default=0)
    rate_limit = models.PositiveIntegerField(default=0)
    base_url = models.URLField()
    
    def __str__(self):
        return self.api_name

class UserPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    # Normalized preferences
    preferred_cuisines = models.ManyToManyField(Cuisine, blank=True, related_name="user_preferences")
    dietary_restrictions = models.ManyToManyField(Diet, blank=True, related_name="user_dietary_restrictions")
    disliked_ingredients = models.ManyToManyField(Ingredient, blank=True, related_name="users_disliked")
    preferred_tags = models.ManyToManyField(Tag, blank=True, related_name="user_preferred_tags")
    calorie_range_min = models.PositiveIntegerField(null=True, blank=True, help_text="Minimum calorie preference")
    calorie_range_max = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum calorie preference")
    cook_time_max = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum cooking time in minutes")
    # Keep difficulty_levels as JSON for flexibility
    difficulty_levels = models.JSONField(null=True, blank=True, help_text="Preferred difficulties (e.g., ['Easy', 'Medium'])")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user}"

class RecipeInteraction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recipe_interactions")
    recipe = models.ForeignKey('Recipe', on_delete=models.CASCADE, related_name="interactions")
    liked = models.BooleanField(default=False)
    saved = models.BooleanField(default=False)  # Saved but not necessarily favorited
    viewed_count = models.PositiveIntegerField(default=0)
    # Remove auto_now – update manually.
    last_viewed = models.DateTimeField(default=timezone.now)
    # New field: track last time the viewed_count was incremented.
    last_viewed_count_updated = models.DateTimeField(default=timezone.now)
    # New fields for time when the action occurred.
    time_when_saved = models.DateTimeField(null=True, blank=True)
    time_when_liked = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('user', 'recipe')
    
    def __str__(self):
        return f"{self.user} - {self.recipe} - {'Liked' if self.liked else 'Not Liked'}"

class Recommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recommendations")
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="recommended_to")
    score = models.FloatField(help_text="Recommendation score based on preferences and interactions")
    reason = models.TextField(null=True, blank=True, help_text="Why this recipe was recommended")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'recipe')
    
    def __str__(self):
        return f"Recommendation for {self.user}: {self.recipe} (Score: {self.score})"

class Order(models.Model):
    ORDER_STATUS = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='orders')
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='pending')
    special_instructions = models.TextField(blank=True, null=True)
    delivery_address = models.TextField()
    contact_number = models.CharField(max_length=15)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.id} - {self.recipe.title} by {self.user.username}"

    class Meta:
        ordering = ['-created_at']

class Payment(models.Model):
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    razorpay_order_id = models.CharField(max_length=200, unique=True)
    razorpay_payment_id = models.CharField(max_length=200, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=500, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment for Order {self.order.id} - {self.status}"

    class Meta:
        ordering = ['-created_at']
