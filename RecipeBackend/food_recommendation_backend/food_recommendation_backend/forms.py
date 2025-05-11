from django import forms
from allauth.account.forms import SignupForm
from .models import CustomUser
from recipes.models import Diet, UserPreference, Cuisine, Tag, Ingredient

class CustomSignupForm(SignupForm):
    """
    Custom signup form extending AllAuth's SignupForm.
    """
    first_name = forms.CharField(
        max_length=40, 
        label="First Name", 
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )
    last_name = forms.CharField(
        max_length=40, 
        label="Last Name", 
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )
    profile_picture = forms.ImageField(
        label="Profile Picture", 
        required=False,
        widget=forms.ClearableFileInput(attrs={'class': 'form-control', 'onchange': 'previewImage(event)'})
    )

    def save(self, request):
        """
        Save method to handle additional custom logic if necessary.
        """
        user = super().save(request)
        # You can add custom save logic for the user here.
        return user


class ProfileForm(forms.ModelForm):
    """
    Form for updating user profile information.
    """
    profile_picture = forms.ImageField(
        required=False,
        widget=forms.ClearableFileInput(attrs={'onchange': 'previewImage(event)', 'class': 'form-control'})
    )

    class Meta:
        model = CustomUser
        fields = ['username', 'first_name', 'last_name', 'profile_picture']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'maxlength': '20'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'maxlength': '40'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'maxlength': '40'}),
        }


class UserPreferenceForm(forms.ModelForm):
    preferred_cuisines = forms.ModelMultipleChoiceField(
        queryset=Cuisine.objects.all(),
        widget=forms.SelectMultiple(attrs={
            'class': 'select2-multi form-control',
            'data-placeholder': 'Search cuisines...',
        }),
        required=False,
        help_text="Select your favorite cuisines to get personalized recommendations."
    )
    
    dietary_restrictions = forms.ModelMultipleChoiceField(
        queryset=Diet.objects.all(),
        widget=forms.SelectMultiple(attrs={
            'class': 'select2-multi form-control',
            'data-placeholder': 'Search restrictions...',
        }),
        required=False,
        help_text="Add any dietary restrictions or preferences."
    )
    
    disliked_ingredients = forms.ModelMultipleChoiceField(
        queryset=Ingredient.objects.all(),
        widget=forms.SelectMultiple(attrs={
            'class': 'select2-multi form-control',
            'data-placeholder': 'Search ingredients...',
        }),
        required=False,
        help_text="Select ingredients you want to avoid in recipes."
    )
    
    preferred_tags = forms.ModelMultipleChoiceField(
        queryset=Tag.objects.all(),
        widget=forms.SelectMultiple(attrs={
            'class': 'select2-multi form-control',
            'data-placeholder': 'Search tags...',
        }),
        required=False,
        help_text="Add tags to better customize your recipe suggestions."
    )
    
    calorie_range_min = forms.IntegerField(
        min_value=0,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Min calories'}),
        help_text="Minimum calories per serving."
    )
    
    calorie_range_max = forms.IntegerField(
        min_value=0,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Max calories'}),
        help_text="Maximum calories per serving."
    )
    
    cook_time_max = forms.IntegerField(
        min_value=1,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Max minutes'}),
        help_text="Maximum cooking time in minutes."
    )
    
    difficulty_levels = forms.MultipleChoiceField(
        choices=[('Easy', 'Easy'), ('Medium', 'Medium'), ('Hard', 'Hard')],
        widget=forms.CheckboxSelectMultiple(attrs={'class': ''}),
        required=False,
        help_text="Select your preferred cooking difficulty levels."
    )

    class Meta:
        model = UserPreference
        fields = [
            'preferred_cuisines',
            'dietary_restrictions',
            'disliked_ingredients',
            'preferred_tags',
            'calorie_range_min',
            'calorie_range_max',
            'cook_time_max',
            'difficulty_levels'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.difficulty_levels:
            self.fields['difficulty_levels'].initial = self.instance.difficulty_levels

    def clean(self):
        cleaned_data = super().clean()
        min_cal = cleaned_data.get('calorie_range_min')
        max_cal = cleaned_data.get('calorie_range_max')
        cook_time = cleaned_data.get('cook_time_max')

        if min_cal and max_cal and min_cal > max_cal:
            raise forms.ValidationError("Minimum calories cannot exceed maximum calories.")
        if cook_time is not None and cook_time < 1:
            raise forms.ValidationError("Maximum cooking time must be at least 1 minute.")
        
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.difficulty_levels = self.cleaned_data['difficulty_levels']
        if commit:
            instance.save()
            self.save_m2m()
        return instance