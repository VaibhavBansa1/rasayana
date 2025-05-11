from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum
from .models import (
    Cuisine, DishType, Diet, Occasion, Tag, Ingredient,
    Recipe, RecipeIngredient, Favorite, Notification,
    APIMetadata, UserPreference, RecipeInteraction, Recommendation,
    Order, Payment
)

User = get_user_model()

# --------------------------
# Normalized Models Serializers
# --------------------------

class CuisineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuisine
        fields = ('id', 'name')

class DishTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DishType
        fields = ('id', 'name')

class DietSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diet
        fields = ('id', 'name')

class OccasionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Occasion
        fields = ('id', 'name')

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name')

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = (
            'id', 'aisle', 'name', 'nameClean', 'originalName'
        )

# ---------------------------
# RecipeIngredient (Through Model) Serializer
# ---------------------------
class RecipeIngredientSerializer(serializers.ModelSerializer):
    # For read-only display, nest Ingredient details
    ingredient_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingredient.objects.all(), source='ingredient', write_only=True
    )

    class Meta:
        model = RecipeIngredient
        fields = (
            'ingredient__nameClean', 'meta', 'metric_amount', 'metric_unitShort', 'metric_unitLong'
        )
    
    def to_representation(self, instance):
        # Get the ingredient's representation using the IngredientSerializer.
        ingredient_data = IngredientSerializer(instance.ingredient).data
        # Add the extra fields from RecipeIngredient.
        ingredient_data.update({
            'meta': instance.meta,
            'metric_amount': instance.metric_amount,
            'metric_unitShort': instance.metric_unitShort,
            'metric_unitLong': instance.metric_unitLong,
        })
        return ingredient_data


# ---------------------------
# Recipe Serializer
# ---------------------------
class RecipeDetailSerializer(serializers.ModelSerializer):
    # Nested many-to-many relationships (read-only) and write-only for updating
    cuisines = CuisineSerializer(many=True, read_only=True)
    dishTypes = DishTypeSerializer(many=True, read_only=True)
    diets = DietSerializer(many=True, read_only=True)
    occasions = OccasionSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    
    cuisine_ids = serializers.PrimaryKeyRelatedField(
        queryset=Cuisine.objects.all(), many=True, write_only=True, source='cuisines'
    )
    dishtype_ids = serializers.PrimaryKeyRelatedField(
        queryset=DishType.objects.all(), many=True, write_only=True, source='dishTypes'
    )
    diet_ids = serializers.PrimaryKeyRelatedField(
        queryset=Diet.objects.all(), many=True, write_only=True, source='diets'
    )
    occasion_ids = serializers.PrimaryKeyRelatedField(
        queryset=Occasion.objects.all(), many=True, write_only=True, source='occasions'
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, write_only=True, source='tags'
    )
    
    recipe_ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    
    # Store analyzed instructions as JSON directly on the Recipe model.
    analyzedInstructions = serializers.JSONField(required=False)
    
    user = serializers.StringRelatedField(read_only=True)
    
    # Aggregated fields: number of likes and saved counts.
    like_count = serializers.SerializerMethodField()
    saved_count = serializers.SerializerMethodField()
    total_view_count = serializers.SerializerMethodField()

    # These two fields are conditionally added based on authentication.
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = (
            'id', 'title', 'description', 'instructions', 'analyzedInstructions',
            'image', 'external_image', 'cook_time', 'cookingMinutes', 'difficulty',
            'nutrition', 'healthScore', 'aggregateLikes', 'pricePerServing', 'spoonacularScore',
            'sourceUrl', 'imageType', 'youtubeVideoLink',
            'vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'veryHealthy', 'cheap',
            'veryPopular', 'sustainable', 'lowFodmap', 'weightWatcherSmartPoints', 'gaps',
            'preparationMinutes', 'servings',
            'cuisines', 'cuisine_ids',
            'dishTypes', 'dishtype_ids',
            'diets', 'diet_ids',
            'occasions', 'occasion_ids',
            'tags', 'tag_ids',
            'recipe_ingredients',
            'api_source', 'created_by_user', 'user',
            'created_at', 'updated_at',
            'like_count', 'saved_count',
            'is_liked', 'is_saved', 'total_view_count'
        )
        read_only_fields = ('created_at', 'updated_at')

    def get_like_count(self, obj):
        return obj.interactions.filter(liked=True).count()

    def get_saved_count(self, obj):
        return obj.interactions.filter(saved=True).count()
    
    def get_total_view_count(self, obj):
        total = obj.interactions.aggregate(total=Sum('viewed_count'))['total']
        return total if total is not None else 0

    def __init__(self, *args, **kwargs):
        super(RecipeDetailSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if not (request and request.user and request.user.is_authenticated):
            # Remove fields if the user is not authenticated.
            self.fields.pop('is_liked', None)
            self.fields.pop('is_saved', None)

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check RecipeInteraction or any logic to determine if liked.
            # Assuming you have a RecipeInteraction model where liked is stored:
            interaction = obj.interactions.filter(user=request.user).first()
            if interaction:
                return interaction.liked
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            interaction = obj.interactions.filter(user=request.user).first()
            if interaction:
                return interaction.saved
        return False


# ---------------------------
# Other Models Serializers
# ---------------------------

class FavoriteSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    recipe = RecipeDetailSerializer(read_only=True)
    
    class Meta:
        model = Favorite
        fields = ('id', 'user', 'recipe', 'created_at')

class RecipeMinimalSerializer(serializers.ModelSerializer):
    """Minimal recipe serializer for notifications"""
    class Meta:
        model = Recipe
        fields = ['id', 'title', 'image', 'external_image']

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model with related recipe data"""
    related_recipe = RecipeMinimalSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 
            'type', 
            'title', 
            'message', 
            'data', 
            'is_read', 
            'created_at',
            'related_recipe'
        ]
        read_only_fields = ['id', 'created_at', 'user']

class APIMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = APIMetadata
        fields = ('id', 'api_name', 'last_fetched', 'total_recipes', 'rate_limit', 'base_url')

class UserPreferenceSerializer(serializers.ModelSerializer):
    preferred_cuisines = CuisineSerializer(many=True, read_only=True)
    dietary_restrictions = TagSerializer(many=True, read_only=True)
    disliked_ingredients = IngredientSerializer(many=True, read_only=True)
    preferred_tags = TagSerializer(many=True, read_only=True)
    
    class Meta:
        model = UserPreference
        fields = (
            'id', 'user', 'preferred_cuisines', 'dietary_restrictions',
            'disliked_ingredients', 'preferred_tags', 'calorie_range_min', 'calorie_range_max',
            'cook_time_max', 'difficulty_levels', 'created_at', 'updated_at'
        )

class RecipeInteractionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    recipe = RecipeDetailSerializer(read_only=True)
    
    class Meta:
        model = RecipeInteraction
        fields = (
            'id', 'user', 'recipe', 
            'liked', 'saved', 'viewed_count', 
            'last_viewed', 'last_viewed_count_updated',
            'time_when_saved', 'time_when_liked'
        )

class RecommendationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    recipe = RecipeDetailSerializer(read_only=True)
    
    class Meta:
        model = Recommendation
        fields = ('id', 'user', 'recipe', 'score', 'reason', 'created_at')

class RecipeSearchSerializer(serializers.ModelSerializer):
    # Many-to-many relationships: include nested read-only representations
    tags = TagSerializer(many=True, read_only=True)
    
    # For user, show a read-only representation
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Recipe
        fields = (
            'id', 'title', 'image',
            'external_image', 'healthScore',
            'imageType', 'tags',
            'created_by_user', 'user',
            'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at')

class OrderSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    recipe = RecipeDetailSerializer(read_only=True)
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.all(), write_only=True, source='recipe'
    )
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id', 'user', 'recipe', 'recipe_id', 'quantity', 'status',
            'special_instructions', 'delivery_address', 'contact_number',
            'total_amount', 'created_at', 'updated_at', 'payment_status'
        )
        read_only_fields = ('created_at', 'updated_at', 'payment_status')

    def get_payment_status(self, obj):
        try:
            return obj.payment.status
        except:
            return None

class PaymentSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    order_id = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(), write_only=True, source='order'
    )

    class Meta:
        model = Payment
        fields = (
            'id', 'order', 'order_id', 'razorpay_order_id',
            'razorpay_payment_id', 'razorpay_signature',
            'amount', 'currency', 'status', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at', 'razorpay_order_id',
                           'razorpay_payment_id', 'razorpay_signature')

