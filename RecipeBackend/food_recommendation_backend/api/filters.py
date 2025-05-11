import django_filters
from recipes.models import Recipe

class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass

class RecipeFilter(django_filters.FilterSet):
    # Allow filtering by multiple comma-separated values using the "in" lookup.
    diets__name = CharInFilter(field_name='diets__name', lookup_expr='in')
    cuisines__name = CharInFilter(field_name='cuisines__name', lookup_expr='in')
    dishTypes__name = CharInFilter(field_name='dishTypes__name', lookup_expr='in')
    occasions__name = CharInFilter(field_name='occasions__name', lookup_expr='in')

    class Meta:
        model = Recipe
        fields = {
            'vegetarian': ['exact'],
            'vegan': ['exact'],
            'glutenFree': ['exact'],
            'dairyFree': ['exact'],
            'veryHealthy': ['exact'],
            'cheap': ['exact'],
            'veryPopular': ['exact'],
            'sustainable': ['exact'],
            'lowFodmap': ['exact'],
            # The following allow passing comma-separated lists, e.g. diets__name=lacto ovo vegetarian,gluten free
            # 'cuisines__name': ['in'],
            # 'dishTypes__name': ['in'],
            # 'diets__name': ['in'],
            # 'occasions__name': ['in'],
        }
