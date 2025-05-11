import logging
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, action
from food_recommendation_backend.views import get_user_profile_picture
from django_filters.rest_framework import DjangoFilterBackend
from recipes.models import Recipe, RecipeInteraction, Cuisine, Order, Payment # , UserPreference, Ingredient
from recipes.serializers import *
from rest_framework import generics
from django.utils import timezone
from datetime import timedelta
from .filters import RecipeFilter
from django.shortcuts import get_object_or_404
from recipes.models import Notification
from .models import Developer, DownloadLink
from .serializers import DeveloperSerializer
from recipes.utils import send_notification, send_batch_notifications, check_recipe_milestone
from django.conf import settings
import razorpay
from decimal import Decimal

import os
import json
from django.db.models import Q
from langchain_core.messages import HumanMessage
from langchain_core.chat_history import BaseChatMessageHistory

from langchain_google_genai import ChatGoogleGenerativeAI
import base64

import getpass
from rest_framework.parsers import MultiPartParser, FormParser
import tempfile

logger = logging.getLogger(__name__)

# Helper function to safely parse JSON from LLM response
def safe_json_parse(content):
    """Parse JSON from LLM response, handling markdown code blocks."""
    logger.debug(f"Attempting to parse content")
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        logger.debug("Cleaned content for parsing")
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {str(e)}")
            return {"ingredients": ["tomato"], "error": "Failed to parse response"}

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    try:
        user = request.user
        if user.is_authenticated:
            user = request.user
            profile_picture_url = get_user_profile_picture(user)
            return Response({
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "profile_picture": profile_picture_url,
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if not refresh_token:
                return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

            refresh = RefreshToken(refresh_token)
            user_id = refresh.get("user_id")
            user = User.objects.get(id=user_id)
            new_access_token = refresh.access_token
            new_refresh_token = RefreshToken.for_user(user)

            logger.info(f"Generated new tokens for user {user_id}")
            return Response({
                "access_token": str(new_access_token),
                "refresh_token": str(new_refresh_token)
            })

        except User.DoesNotExist:
            logger.error(f"User not found for refresh token")
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_400_BAD_REQUEST)


class RecipeSearchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows recipes to be viewed with advanced filtering, searching,
    and ordering based on recipe flags, many-to-many relationships, and ingredients.
    """
    permission_classes = [AllowAny]
    queryset = Recipe.objects.all()
    serializer_class = RecipeSearchSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Use our custom filterset.
    filterset_class = RecipeFilter

    # Allow searching by recipe title, description, and ingredient name.
    search_fields = ['title', 'description', 'ingredients__originalName']

    # Allow ordering by these fields.
    ordering_fields = ['created_at', 'title', 'aggregateLikes', 'healthScore']
    ordering = ['-created_at']

    def get_queryset(self):
        # Use distinct() to avoid duplicate recipes due to many-to-many joins.
        return Recipe.objects.all().distinct()

class RecipeFilterOptionsView(APIView):
    """
    Endpoint to provide available filter options for recipes.
    """
    permission_classes = [AllowAny]

    def get(self, request, format=None):
        # Hardcode flags as they are fixed fields in the Recipe model.

        flags = [
            "vegetarian", "vegan",
            "glutenFree", "dairyFree",
            "veryHealthy", "cheap",
            "veryPopular", "sustainable",
            "lowFodmap"
        ]

        ordering = ['created_at', 'title', 'aggregateLikes', 'healthScore']

        # Get list of unique values for each many-to-many field.
        cuisines = list(Cuisine.objects.values_list('name', flat=True))
        dishTypes = list(DishType.objects.values_list('name', flat=True))
        diets = list(Diet.objects.values_list('name', flat=True))
        occasions = list(Occasion.objects.values_list('name', flat=True))

        data = {
            "flags": flags,
            "cuisines": cuisines,
            "dishTypes": dishTypes,
            "diets": diets,
            "occasions": occasions,
            'ordering': ordering
        }
        return Response(data)


class RecipeDetailView(generics.RetrieveAPIView):
    """
    Returns full details of a recipe.
    For authenticated users, update interaction:
      • Create if not exists with viewed_count=1 and current timestamps.
      • Always update last_viewed.
      • If more than a week has passed since last_viewed_count_updated, increment viewed_count and update that field.
    """
    queryset = Recipe.objects.all()
    serializer_class = RecipeDetailSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        recipe = super().get_object()
        request = self.request
        if request.user.is_authenticated:
            interaction, created = RecipeInteraction.objects.get_or_create(
                user=request.user,
                recipe=recipe,
                defaults={'viewed_count': 1,
                          'last_viewed': timezone.now(),
                          'last_viewed_count_updated': timezone.now()}
            )
            # Always update last_viewed
            interaction.last_viewed = timezone.now()
            if not created and timezone.now() - interaction.last_viewed_count_updated >= timedelta(weeks=1):
                interaction.viewed_count += 1
                interaction.last_viewed_count_updated = timezone.now()
            interaction.save()
        return recipe

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

class RecipeLikeView(APIView):
    def post(self, request, pk, format=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, 
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            recipe = get_object_or_404(Recipe, id=pk)
        except Recipe.DoesNotExist:
            return Response({"detail": "Recipe not found."}, 
                          status=status.HTTP_404_NOT_FOUND)

        interaction, created = RecipeInteraction.objects.get_or_create(
            user=request.user,
            recipe=recipe,
            defaults={'liked': True, 'time_when_liked': timezone.now()}
        )

        if not created:
            interaction.liked = not interaction.liked
            if interaction.liked:
                interaction.time_when_liked = timezone.now()
            else:
                interaction.time_when_liked = None
                # Remove the notification using exact match
                Notification.objects.filter(
                    user=recipe.user,
                    type='like',
                    related_recipe=recipe,
                    data={'type': 'like', 'userId': str(request.user.id)}
                ).delete()
            interaction.save()

        new_like_count = recipe.interactions.filter(liked=True).count()
        
        # Send notification to recipe owner if recipe was liked
        if recipe.user and recipe.user != request.user and interaction.liked:
            send_notification(
                user=recipe.user,
                title="New Like!",
                message=f"{request.user.username} liked your recipe '{recipe.title}'",
                notification_type='like',
                related_recipe=recipe,
                data={'type': 'like', 'userId': str(request.user.id)}
            )

        # Check for milestones
        milestone_reached, milestone_type, count = check_recipe_milestone(recipe)
        if milestone_reached and milestone_type == 'likes':
            # Send notification to all users
            send_batch_notifications(
                users=User.objects.all(),
                title="Recipe Milestone!",
                message=f"'{recipe.title}' just reached {count} likes! 🎉",
                notification_type='milestone',
                related_recipe=recipe,
                data={'type': 'milestone', 'milestone': count, 'milestoneType': 'likes'}
            )

        return Response({"like_count": new_like_count}, status=status.HTTP_200_OK)

class RecipeSaveView(APIView):
    """
    Toggle save status for a recipe. Updates time_when_saved when saved.
    """
    def post(self, request, pk, format=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            recipe = Recipe.objects.get(pk=pk)
        except Recipe.DoesNotExist:
            return Response({"detail": "Recipe not found."}, status=status.HTTP_404_NOT_FOUND)

        interaction, created = RecipeInteraction.objects.get_or_create(
            user=request.user,
            recipe=recipe,
            defaults={'saved': True, 'time_when_saved': timezone.now()}
        )
        if not created:
            interaction.saved = not interaction.saved
            if interaction.saved:
                interaction.time_when_saved = timezone.now()
            else:
                interaction.time_when_saved = None
            interaction.save()

        new_save_count = recipe.interactions.filter(saved=True).count()
        
        return Response({"save_count": new_save_count}, status=status.HTTP_200_OK)


class ProfileLikedRecipesView(generics.ListAPIView):
    """
    Returns the list of recipes liked by the authenticated user,
    ordered by the most recent like time.
    """
    serializer_class = RecipeSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Recipe.objects.filter(
            interactions__user=self.request.user,
            interactions__liked=True
        ).order_by('-interactions__time_when_liked').distinct()

class ProfileSavedRecipesView(generics.ListAPIView):
    """
    Returns the list of recipes saved by the authenticated user,
    ordered by the most recent save time.
    """
    serializer_class = RecipeSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Recipe.objects.filter(
            interactions__user=self.request.user,
            interactions__saved=True
        ).order_by('-interactions__time_when_saved').distinct()

class ProfileRecentlyVisitedRecipesView(generics.ListAPIView):
    """
    Returns the list of recipes recently visited by the authenticated user.
    Recipes are ordered by the last_viewed timestamp (most recent first).
    """
    serializer_class = RecipeSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Recipe.objects.filter(
            interactions__user=self.request.user
        ).order_by('-interactions__last_viewed').distinct()


# if "GOOGLE_API_KEY" not in os.environ:
os.environ["GOOGLE_API_KEY"] = settings.GOOGLE_API_KEY
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")

# In-memory storage for the message history
class InMemoryHistory(BaseChatMessageHistory):
    def __init__(self):
        self.messages = []

    def add_message(self, message):
        self.messages.append(message)

    def clear(self):
        self.messages = []

    @property
    def messages(self):
        return self._messages
    
    @messages.setter
    def messages(self, messages):
        self._messages = messages

# Message history store
message_histories = {}

# Function to get message history by session ID
def get_session_history(session_id):
    if session_id not in message_histories:
        message_histories[session_id] = InMemoryHistory()
    return message_histories[session_id]

# Helper function to classify intent
def classify_intent(user_query, context):
    """Classify the user's query into an intent: search, modify, find_similar, generate, or general."""
    logger.info(f"Classifying intent for query: {user_query[:50]}...")
    messages = [
        HumanMessage(content=f"""
    You are Rasayana Bot, a recipe assistant. Based on the conversation history and the current user query, classify the primary intent into one of the following categories: search, modify, find_similar, generate, general.

    - search: When the user wants to find recipes based on ingredients, cuisines, etc.
    - modify: When the user wants to change an existing recipe.
    - find_similar: When the user wants recipes similar to a specific one.
    - generate: When the user wants a new recipe created.
    - general: For any other questions, including about the app, the bot, greetings, or related topics to cooking and recipes.

    Conversation history:
    {context}

    Current query:
    {user_query}

    Respond with only the intent name.
    """)
    ]
    response = llm.invoke(messages)
    logger.info(f"Classified intent: {response.content.strip().lower()}")
    return response.content.strip().lower()

# Function to handle general queries
def handle_general_query(user_query, context):
    """Handle general queries about the app, bot, or other topics using the language model."""
    messages = [
        HumanMessage(content=f"""
    You are Rasayana Bot, a friendly recipe assistant. The user has asked a general question. Respond concisely and appropriately based on the following information:

    - What are you: Food Recipe Search and Recommendation App
    - App Name: Rasayana
    - Purpose: Personalized recipe recommendations
    - Platform: Cross-platform mobile app
    - Core Feature: Recipe recommendations and search, Recipe recognition from image or text
    - Filters: Ingredients, diets, difficulty value, regional cuisines
    - Special Categories: Indian regional, global, mood-based, festival
    - User Account: Find recipes, bookmark favorites, personalized notifications
    - Tech Stack: React Native, Expo, Django Rest Framework, SQLite
    - 3rd Party Integrations: Recipe APIs, Google reCAPTCHA, OTP services
    - Authentication: DRF, JWT tokens, Google OAuth
    - Hosting: Domain registration, Django backend, Google Play Store, 
    - Additional Costs: OTP, reCAPTCHA
    - Vaibhav Bansal/Developer College: Dr BR Ambedkar Polytechnic College
    - Mentor Name: Kirti Tomar
    - Roll Number: 22017C04069
    - Tag Line: Nourish Your Taste Buds with Home-Made Elixir
    - GitHub ID: https://github.com/VaibhavBansa1
    - Instagram ID: https://www.instagram.com/giga_vaibhav/
    - What are you expert at: I am expert at Food Recipes and dietary
    - Greet According to the user query: If user says Jai Shree Ram, respond with "Jai Shree Ram, Rasayana Bot Here." and Etc.

    If the query matches a greeting (e.g., "Hi", "Hello", "Greeting"), respond with "Hi, Rasayana Bot Here."
    For other questions, provide the exact answer if it matches a key above, or a friendly, helpful response if it's unclear.
    Keep the tone conversational and engaging and use Conversation history to answer user.
                     
    Conversation history:
    {context}

    User query: 
    {user_query}
    """)
    ]
    response = llm.invoke(messages)
    return {"message": response.content.strip()}

# Action for searching recipes
def search_recipes(user_query, context, user_preferences):
    """Search the database for recipes matching the user's query and preferences."""
    # Extract search criteria
    messages = [
        HumanMessage(content=f"""
    Extract search criteria from the user query and conversation history. Criteria can include ingredients, cuisines, dietary restrictions, etc.

    Conversation history:
    {context}

    User query:
    {user_query}

    Respond with a JSON object, e.g., {{"ingredients": ["tomato", "garlic"], "cuisines": ["Italian"], "dietary": ["vegan"]}}
    """)
    ]
    criteria = llm.invoke(messages)
    content = criteria.content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    criteria = json.loads(content)
    # Build ORM query
    recipes = Recipe.objects.all()

    if "ingredients" in criteria:
        for ingredient in criteria["ingredients"]:
            recipes = recipes.filter(ingredients__name__icontains=ingredient)

    if "cuisines" in criteria:
        recipes = recipes.filter(cuisines__name__in=criteria["cuisines"])

    # Apply user preferences
    if user_preferences:
        if user_preferences.preferred_cuisines.exists():
            recipes = recipes.filter(cuisines__in=user_preferences.preferred_cuisines.all())
        if user_preferences.disliked_ingredients.exists():
            recipes = recipes.exclude(ingredients__in=user_preferences.disliked_ingredients.all())
        if user_preferences.dietary_restrictions.exists():
            dietary_tags = [tag.name.lower() for tag in user_preferences.dietary_restrictions.all()]
            if "vegan" in dietary_tags:
                recipes = recipes.filter(vegan=True)
            if "gluten-free" in dietary_tags:
                recipes = recipes.filter(glutenFree=True)

    if recipes.exists():
        recipe_list = [
            {
                "id": r.id,
                "title": r.title,
                "ingredients": [i.name for i in r.ingredients.all()],
                "instructions": r.instructions or r.analyzedInstructions
            } for r in recipes[:5]  # Limit to top 5 results
        ]
        return {"message": f"Found {len(recipe_list)} matching recipes.", "recipes": recipe_list}
    else:
        return generate_recipe(user_query, context, user_preferences)

# Action for modifying a recipe
def modify_recipe(recipe_id, user_query, context):
    """Modify an existing recipe based on the user's request."""
    recipe = Recipe.objects.get(id=recipe_id)
    messages = [
        HumanMessage(content=f"""
    Modify the following recipe based on the user's query and conversation history.

    Recipe:
    Title: {recipe.title}
    Ingredients: {', '.join([i.name for i in recipe.ingredients.all()])}
    Instructions: {recipe.instructions or recipe.analyzedInstructions}

    Conversation history:
    {context}

    User query:
    {user_query}

    Return the modified recipe as a JSON object with "title", "ingredients" (list), and "instructions" (string or list) fields.
    """)
    ]
    modified_recipe = llm.invoke(messages)
    modified_recipe = safe_json_parse(modified_recipe.content)
    return {"message": "Here is the modified recipe you requested.", "recipe": modified_recipe}

# Action for finding similar recipes
def find_similar_recipes(recipe_id, context):
    """Find recipes similar to the one specified by recipe_id."""
    recipe = Recipe.objects.get(id=recipe_id)
    ingredients = recipe.ingredients.all()
    cuisines = recipe.cuisines.all()

    similar_recipes = Recipe.objects.filter(
        Q(ingredients__in=ingredients) | Q(cuisines__in=cuisines)
    ).exclude(id=recipe_id).distinct()

    recipe_list = [
        {
            "id": r.id,
            "title": r.title,
            "ingredients": [i.name for i in r.ingredients.all()],
            "instructions": r.instructions or r.analyzedInstructions
        } for r in similar_recipes[:5]  # Limit to top 5
    ]
    return {"message": f"Found {len(recipe_list)} similar recipes.", "recipes": recipe_list}

# Action for generating a new recipe
def generate_recipe(user_query, context, user_preferences):
    """Generate a new recipe based on the user's query and preferences."""
    messages = [
        HumanMessage(content=f"""
    Generate a new recipe based on the user's query, conversation history, and preferences.

    Conversation history:
    {context}

    User query:
    {user_query}

    User preferences:
    Preferred cuisines: {', '.join([c.name for c in user_preferences.preferred_cuisines.all()]) if user_preferences else 'None'}
    Dietary restrictions: {', '.join([d.name for d in user_preferences.dietary_restrictions.all()]) if user_preferences else 'None'}
    Disliked ingredients: {', '.join([i.name for i in user_preferences.disliked_ingredients.all()]) if user_preferences else 'None'}
    Preferred tags: {', '.join([t.name for t in user_preferences.preferred_tags.all()]) if user_preferences else 'None'}
    Min Calories: {user_preferences.calorie_range_min if user_preferences and user_preferences.calorie_range_min else 'None'}
    Max Calories: {user_preferences.calorie_range_min if user_preferences and user_preferences.calorie_range_min else 'None'}
    Max Cooking Time (mins): {user_preferences.cook_time_max if user_preferences and user_preferences.cook_time_max else 'None'}
    Difficulty Levels (Easy, Medium, Hard): {', '.join([l for l in user_preferences.difficulty_levels]) if user_preferences and user_preferences.difficulty_levels else 'None'}

    Return the recipe as a JSON object with "title", "ingredients" (list), and "instructions" (string) fields.
    """)
    ]
    new_recipe = llm.invoke(messages)
    new_recipe = safe_json_parse(new_recipe.content)
    return {"message": "Here's a newly generated recipe for you.", "recipe": new_recipe}

# Main LangChain function
def call_langchain(user_query, recipe_id=None, context=None, user_preferences=None, session_id="default"):
    """
    Process user queries using LangChain and return a JSON response.

    Args:
        user_query (str): The user's input query.
        recipe_id (int, optional): ID of an existing recipe to modify or find similar recipes for.
        context (str, optional): Previous conversation context.
        user_preferences (UserPreference, optional): User's preferences for personalization.
        session_id (str, optional): Unique identifier for the conversation session.

    Returns:
        dict: JSON response with 'message' and either 'recipes' (list) or 'recipe' (dict).
    """
    # Preprocess query if it starts with "input 2: "
    if user_query.lower().startswith("input 2: "):
        user_query = user_query[9:].trip()

    # Get or create message history for this session
    session_history = get_session_history(session_id)
    
    # Update message history with current query
    session_history.add_message(HumanMessage(content=user_query))
    
    # Use provided context or create context string from message history
    # if context is None:
    #     full_context = "\n".join([
    #         f"{'User' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}" 
    #         for msg in session_history.messages
    #     ])
    # else:
    full_context = context
    
    # Classify intent
    intent = classify_intent(user_query, full_context)

    if intent == "general":
        return handle_general_query(user_query, full_context)
    elif intent == "search":
        return search_recipes(user_query, full_context, user_preferences)
    elif intent == "modify" and recipe_id:
        return modify_recipe(recipe_id, user_query, full_context)
    elif intent == "find_similar" and recipe_id:
        return find_similar_recipes(recipe_id, full_context)
    elif intent == "generate":
        return generate_recipe(user_query, full_context, user_preferences)
    else:
        return {"message": "Sorry, I couldn't understand your request. How can I assist you?"}

# Updated RecipeChatView
class RecipeChatView(APIView):
    """
    Chat endpoint for recipes.

    Expects a POST payload with:
      - Mandatory: "user_query" (string)
      - Optional: "recipe_id" (integer) and "context" (any format)

    Requires the user to be authenticated.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        data = request.data
        logger.debug(f"Received chat request context: {data.get('context')}")
        # Extract mandatory user_query
        user_query = data.get("user_query", "").strip()
        if not user_query:
            return Response({"error": "user_query is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Optional parameters
        recipe_id = data.get("recipe_id")
        context = data.get("context")
        user_preferences = request.user.preferences if hasattr(request.user, 'preferences') else None

        # Validate recipe_id if provided
        if recipe_id:
            try:
                recipe_id = int(recipe_id)
                Recipe.objects.get(id=recipe_id)
            except (ValueError, Recipe.DoesNotExist):
                recipe_id = None

        # Call LangChain integration
        try:
            # Generate a session ID from the user ID
            session_id = f"user_{request.user.id}"
            result = call_langchain(user_query, recipe_id, context, user_preferences, session_id)
        except Exception as e:
            return Response({"error": f"Error processing AI query: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result, status=status.HTTP_200_OK)

class RecipeImageChatView(APIView):
    """Handle image-based recipe queries using Gemini Vision."""
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        try:
            # Get the uploaded image file
            image_file = request.FILES.get('image')
            if not image_file:
                return Response(
                    {"error": "No image file provided"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            user_query = request.data.get("user_query", "What's in this recipe image?")
            context = request.data.get("context", "")

            logger.info(f"Processing image analysis request for user {request.user.username}")
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
                for chunk in image_file.chunks():
                    tmp_file.write(chunk)
                tmp_file_path = tmp_file.name

            try:
                # Initialize Gemini Pro Vision with the updated model
                model = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",  # Updated model name
                )

                # Read the temporary file
                with open(tmp_file_path, 'rb') as f:
                    image_data = f.read()
                    base64_image = base64.b64encode(image_data).decode('utf-8')

                # Prepare the messages with a more specific prompt
                messages = [
                    HumanMessage(content=[
                        {
                            "type": "text",
                            "text": f"""You are a culinary expert. Analyze this recipe image and provide detailed insights.
                            
                            Context from conversation: {context}
                            Specific query: {user_query}
                            
                            Please provide a structured analysis including:
                            1. Dish Identification:
                               - Name or type of dish
                               - Cuisine origin if identifiable
                            
                            2. Ingredients Analysis:
                               - Main ingredients visible
                               - Estimated quantities
                               - Key spices or seasonings visible
                            
                            3. Cooking Assessment:
                               - Primary cooking methods used
                               - Special techniques visible
                               - Estimated cooking time
                               - Equipment needed
                            
                            4. Recipe Insights:
                               - Difficulty level (1-5)
                               - Serving size estimate
                               - Key preparation steps
                               - Potential variations
                            
                            5. Tips and Suggestions:
                               - Common mistakes to avoid
                               - Serving recommendations
                               - Storage suggestions if applicable
                            
                            Format your response in a clear, structured manner using headings and bullet points but no markdown.
                            """
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ])
                ]

                # Get response from Gemini
                response = model.invoke(messages)
                
                return Response({
                    "message": response.content,
                    "type": "image_analysis"
                })

            finally:
                # Clean up the temporary file
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)

        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            return Response(
                {"error": f"Error processing image: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications:
    - List all notifications for current user
    - Mark notifications as read
    - Delete notifications
    - Mark all notifications as read
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get notifications for current user, ordered by creation date"""
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """Ensure notification is created for current user"""
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Delete a notification"""
        notification = self.get_object()
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark single notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        self.get_queryset().update(is_read=True)
        return Response(status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_push_token(request):
    """Register a push notification token for the authenticated user."""
    user = request.user
    push_token = request.data.get('push_token')
    
    if not push_token:
        return Response(
            {"error": "Push token is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate Expo push token format
    if not push_token.startswith('ExponentPushToken['):
        return Response(
            {"error": "Invalid Expo push token format"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    logger.info(f"Registering push token for user {user.username}")
    user.push_token = push_token
    user.save()
    
    return Response({"message": "Push token registered successfully"})


# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        try:
            # Get recipe and validate it exists
            recipe = get_object_or_404(Recipe, id=request.data.get('recipe_id'))
            
            # Calculate total amount
            servings = int(request.data.get('servings', 1))
            total_amount = Decimal(str(recipe.pricePerServing * servings))

            # Create order
            order = Order.objects.create(
                user=request.user,
                recipe=recipe,
                quantity=servings,
                delivery_address=request.data.get('delivery_address'),
                contact_number=request.data.get('contact_number'),
                special_instructions=request.data.get('special_instructions'),
                total_amount=total_amount
            )

            # Create Razorpay order
            razorpay_order = razorpay_client.order.create({
                'amount': int(total_amount * 100),  # Convert to paise
                'currency': 'INR',
                'payment_capture': 1,
                'notes': {
                    'recipe_id': str(recipe.id),
                    'order_id': str(order.id),
                    'delivery_address': order.delivery_address,
                    'contact_number': order.contact_number
                }
            })

            # Create payment record
            payment = Payment.objects.create(
                order=order,
                razorpay_order_id=razorpay_order['id'],
                amount=total_amount,
                currency='INR'
            )

            # Return order details with Razorpay info
            return Response({
                'order_id': razorpay_order['id'],
                'amount': float(total_amount),
                'currency': 'INR',
                'key': settings.RAZORPAY_KEY_ID,
                'status': order.status,
                'delivery_address': order.delivery_address,
                'contact_number': order.contact_number,
                'special_instructions': order.special_instructions,
                'recipe': {
                    'id': recipe.id,
                    'title': recipe.title,
                    'image': recipe.image.url if recipe.image else recipe.external_image,
                }
            })

        except Recipe.DoesNotExist:
            return Response(
                {'error': 'Recipe not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user)

class PaymentVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        # Verify signature
        params_dict = {
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_order_id': razorpay_order_id,
            'razorpay_signature': razorpay_signature
        }
        
        try:
            razorpay_client.utility.verify_payment_signature(params_dict)
            
            # Update payment status
            payment = get_object_or_404(Payment, razorpay_order_id=razorpay_order_id)
            payment.razorpay_payment_id = razorpay_payment_id
            payment.razorpay_signature = razorpay_signature
            payment.status = 'completed'
            payment.save()
            
            # Update order status
            order = payment.order
            order.status = 'confirmed'
            order.save()
            
            # Send thank you notification
            send_notification(
                user=request.user,
                title="Thank You for Your Order!",
                message=f"Your payment for {order.recipe.title} was successful. Order ID: {order.id}",
                notification_type='confirmation',
                related_recipe=order.recipe,
                data={
                    'type': 'order_confirmation',
                    'orderId': str(order.id),
                    'amount': str(payment.amount)
                }
            )
            
            return Response({
                'status': 'success',
                'message': 'Payment verified successfully'
            })
            
        except Exception as e:
            return Response({
                'status': 'failed',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_razorpay_key(request):
    return Response({
        'key_id': settings.RAZORPAY_KEY_ID
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_orders(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    orders_data = []
    
    for order in orders:
        order_data = {
            'order_id': str(order.id),
            'recipe_title': order.recipe.title,
            'recipe_image': order.recipe.image.url if order.recipe.image else order.recipe.external_image,
            'amount': float(order.total_amount),
            'servings': order.quantity,
            'status': order.status,
            'ordered_at': order.created_at.isoformat(),
            'delivery_address': order.delivery_address,
            'contact_number': order.contact_number,
            'estimated_delivery_time': None,  # You can add logic for this
            'payment_status': order.payment.status if hasattr(order, 'payment') else 'pending'
        }
        orders_data.append(order_data)
    
    return Response(orders_data)


@api_view(['GET']) 
@permission_classes([AllowAny])
def get_dev_info(request):
    """
    Fetch developer information from database with all related data.
    Optimizes database queries using prefetch_related and select_related.
    """
    try:
        # Fetch developers with all related data in optimized queries
        developers = Developer.objects.prefetch_related(
            'contributions',
            'skills'
        ).select_related(
            'contact',
            'profile'
        ).all()
        
        # Serialize the data
        serializer = DeveloperSerializer(developers, many=True)
        
        # Log successful request
        logger.info(f"Successfully fetched information for {len(developers)} developers")
        
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        # Log the error with full details
        logger.error(f"Error fetching developer info: {str(e)}", exc_info=True)
        
        return Response(
            {
                "error": "Failed to fetch developer information",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET']) 
@permission_classes([AllowAny])
def get_download_link(request):
    """
    Fetch the download link for the app from the database.
    """
    try:
        # Fetch the download link from the database
        download_link = DownloadLink.objects.first()
        
        if not download_link:
            return Response(
                {"error": "Download link not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log successful request
        logger.info("Successfully fetched download link")
        
        return Response(
            {
                "download_link": download_link.url
            },
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        # Log the error with full details
        logger.error(f"Error fetching download link: {str(e)}", exc_info=True)
        
        return Response(
            {
                "error": "Failed to fetch download link",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )