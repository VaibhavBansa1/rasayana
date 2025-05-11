import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from recipes.models import (
    Recipe, Ingredient, RecipeIngredient, Cuisine,
    DishType, Diet, Occasion, Tag
)

def process_nutrition(nutrition_data):
    """
    Extract only the 'nutrients' key from the nutrition data.
    Expected format:
        { "nutrients": [ ... ] }
    """
    if nutrition_data and "nutrients" in nutrition_data:
        return {"nutrients": nutrition_data["nutrients"]}
    return None

def process_analyzed_instructions(instructions):
    """
    Process the analyzedInstructions field to only keep:
      - 'name'
      - for each step: 'number', 'step', and only the required equipment fields.
    Returns a list of dictionaries like:
    [
        {
            "name": "",
            "steps": [
                {
                    "number": 1,
                    "step": "Some instructions",
                    "equipment": [
                        {"id": 405895, "name": "paper towels", "localizedName": "paper towels", "image": "https://spoonacular.com/cdn/equipment_100x100/paper-towels.jpg"},
                        { ... }
                    ]
                },
                ...
            ]
        },
        ...
    ]
    """
    if not instructions:
        return None
    processed = []
    for inst in instructions:
        processed_inst = {
            "name": inst.get("name", ""),
            "steps": []
        }
        for step in inst.get("steps", []):
            step_data = {
                "number": step.get("number"),
                "step": step.get("step", ""),
                "equipment": []
            }
            for eq in step.get("equipment", []):
                eq_data = {
                    "id": eq.get("id"),
                    "name": eq.get("name"),
                    "localizedName": eq.get("localizedName"),
                    "image": eq.get("image")
                }
                step_data["equipment"].append(eq_data)
            processed_inst["steps"].append(step_data)
        processed.append(processed_inst)
    return processed

class Command(BaseCommand):
    help = "Import recipes from a JSON file, including extendedIngredients, m2m fields, and auto-generating tags/difficulty. Avoids duplicates."

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON file containing recipes.')

    def handle(self, *args, **options):
        file_path = options['json_file']
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            raise CommandError(f"Error reading JSON file: {e}")

        if not isinstance(data, list):
            raise CommandError("Expected the JSON file to contain a list of recipes.")

        imported_count = 0
        updated_count = 0

        with transaction.atomic():
            for recipe_data in data:
                recipe_id = recipe_data.get("id")
                if not recipe_id:
                    self.stdout.write(self.style.WARNING("Skipping recipe without an 'id' field."))
                    continue

                # Calculate total time.
                cook_time = recipe_data.get("readyInMinutes") or 0
                cooking_minutes = recipe_data.get("cookingMinutes") or 0
                preparation_minutes = recipe_data.get("preparationMinutes") or 0
                total_time = cook_time + cooking_minutes + preparation_minutes

                # Count ingredients from extendedIngredients.
                extended_ingredients = recipe_data.get("extendedIngredients", [])
                num_ingredients = len(extended_ingredients)

                # Calculate difficulty based on heuristic:
                if num_ingredients <= 5 and total_time <= 30:
                    difficulty_calc = "Easy"
                elif num_ingredients <= 10 and total_time <= 60:
                    difficulty_calc = "Medium"
                else:
                    difficulty_calc = "Hard"

                # Process nutrition and analyzedInstructions.
                nutrition_processed = process_nutrition(recipe_data.get("nutrition"))
                instructions_processed = process_analyzed_instructions(recipe_data.get("analyzedInstructions"))

                # Prepare Recipe defaults.
                recipe_defaults = {
                    "title": recipe_data.get("title", ""),
                    "description": recipe_data.get("summary", ""),  # using 'summary' as description
                    # Save processed analyzed instructions as JSON.
                    "analyzedInstructions": instructions_processed,
                    # Also keep plain instructions if provided:
                    "instructions": recipe_data.get("instructions", ""),
                    "external_image": recipe_data.get("image", ""),
                    "cook_time": cook_time,
                    "cookingMinutes": cooking_minutes,
                    "preparationMinutes": preparation_minutes,
                    # Use calculated difficulty, ignoring any provided difficulty
                    "difficulty": difficulty_calc,
                    "nutrition": nutrition_processed,
                    "healthScore": recipe_data.get("healthScore"),
                    "aggregateLikes": recipe_data.get("aggregateLikes"),
                    # Skip pricePerServing because it's in USD
                    "spoonacularScore": recipe_data.get("spoonacularScore"),
                    "sourceUrl": recipe_data.get("sourceUrl"),
                    "imageType": recipe_data.get("imageType"),
                    "youtubeVideoLink": None,  # to be added manually later
                    # Recipe flags:
                    "vegetarian": recipe_data.get("vegetarian", False),
                    "vegan": recipe_data.get("vegan", False),
                    "glutenFree": recipe_data.get("glutenFree", False),
                    "dairyFree": recipe_data.get("dairyFree", False),
                    "veryHealthy": recipe_data.get("veryHealthy", False),
                    "cheap": recipe_data.get("cheap", False),
                    "veryPopular": recipe_data.get("veryPopular", False),
                    "sustainable": recipe_data.get("sustainable", False),
                    "lowFodmap": recipe_data.get("lowFodmap", False),
                    "weightWatcherSmartPoints": recipe_data.get("weightWatcherSmartPoints"),
                    "gaps": recipe_data.get("gaps"),
                    "servings": recipe_data.get("servings"),
                }

                recipe, created = Recipe.objects.update_or_create(
                    id=recipe_id,
                    defaults=recipe_defaults
                )

                if created:
                    imported_count += 1
                else:
                    updated_count += 1

                # Process extendedIngredients: Update Ingredient and RecipeIngredient.
                for ing_data in extended_ingredients:
                    ing_id = ing_data.get("id")
                    if not ing_id:
                        self.stdout.write(self.style.WARNING("Skipping an ingredient without 'id'."))
                        continue

                    defaults_ing = {
                        "aisle": ing_data.get("aisle"),
                        "name": ing_data.get("name"),
                        "nameClean": ing_data.get("nameClean"),
                        "originalName": ing_data.get("originalName"),
                    }
                    ingredient, _ = Ingredient.objects.update_or_create(
                        id=ing_id,
                        defaults=defaults_ing
                    )

                    
                    RecipeIngredient.objects.update_or_create(
                        recipe=recipe,
                        ingredient=ingredient,
                        defaults={
                            "meta": ing_data.get("meta"),
                            "metric_amount": ing_data.get("measures", {}).get("metric", {}).get("amount"),
                            "metric_unitShort": ing_data.get("measures", {}).get("metric", {}).get("unitShort"),
                            "metric_unitLong": ing_data.get("measures", {}).get("metric", {}).get("unitLong"),
                        }
                    )

                # Update many-to-many relationships for cuisines, dishTypes, diets, occasions.
                cuisines_list = recipe_data.get("cuisines", [])
                if cuisines_list:
                    recipe.cuisines.clear()
                    for cuisine_name in cuisines_list:
                        cuisine_obj, _ = Cuisine.objects.get_or_create(
                            name__iexact=cuisine_name,
                            defaults={'name': cuisine_name}
                        )
                        recipe.cuisines.add(cuisine_obj)

                dish_types_list = recipe_data.get("dishTypes", [])
                if dish_types_list:
                    recipe.dishTypes.clear()
                    for dish_name in dish_types_list:
                        dishtype_obj, _ = DishType.objects.get_or_create(
                            name__iexact=dish_name,
                            defaults={'name': dish_name}
                        )
                        recipe.dishTypes.add(dishtype_obj)

                diets_list = recipe_data.get("diets", [])
                if diets_list:
                    recipe.diets.clear()
                    for diet_name in diets_list:
                        diet_obj, _ = Diet.objects.get_or_create(
                            name__iexact=diet_name,
                            defaults={'name': diet_name}
                        )
                        recipe.diets.add(diet_obj)
                else:
                    recipe.diets.clear()

                occasions_list = recipe_data.get("occasions", [])
                if occasions_list:
                    recipe.occasions.clear()
                    for occasion_name in occasions_list:
                        occasion_obj, _ = Occasion.objects.get_or_create(
                            name__iexact=occasion_name,
                            defaults={'name': occasion_name}
                        )
                        recipe.occasions.add(occasion_obj)

                # Process tags: auto-generate tags from recipe flags, calculated difficulty, and cuisines.
                tags_to_add = set()
                if recipe_data.get("vegetarian", False): tags_to_add.add("Vegetarian")
                if recipe_data.get("vegan", False): tags_to_add.add("Vegan")
                if recipe_data.get("glutenFree", False): tags_to_add.add("Gluten-Free")
                if recipe_data.get("dairyFree", False): tags_to_add.add("Dairy-Free")
                if recipe_data.get("veryHealthy", False): tags_to_add.add("Healthy")
                if recipe_data.get("cheap", False): tags_to_add.add("Cheap")
                if recipe_data.get("veryPopular", False): tags_to_add.add("Popular")
                if recipe_data.get("sustainable", False): tags_to_add.add("Sustainable")
                if recipe_data.get("lowFodmap", False): tags_to_add.add("Low-Fodmap")
                tags_to_add.add(difficulty_calc)
                for cuisine in cuisines_list:
                    tags_to_add.add(cuisine)
                    
                recipe.tags.clear()
                for tag_name in tags_to_add:
                    tag_obj, _ = Tag.objects.get_or_create(
                        name__iexact=tag_name,
                        defaults={'name': tag_name}
                    )
                    recipe.tags.add(tag_obj)

        self.stdout.write(self.style.SUCCESS(
            f"Import complete: {imported_count} new recipes, {updated_count} updated."
        ))
