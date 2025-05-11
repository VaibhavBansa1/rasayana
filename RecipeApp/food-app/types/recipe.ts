// Basic type interfaces
interface BaseModel {
  id: string | number;
  name: string;
}

export interface Tag extends BaseModel {
  name: string;
}

export interface Diet extends BaseModel {
  name: string;
}

export interface DishType extends BaseModel {
  name: string;
}

export interface Cuisine extends BaseModel {
  name: string;
}

export interface Equipment extends BaseModel {
  localizedName: string;
  image: string;
}

// Instruction related types
export interface Step {
  number: number;
  step: string;
  equipment: Equipment[];
}

export interface Instruction {
  name: string;
  steps: Step[];
}

// Ingredient related types
export interface RecipeIngredient {
  id: number;
  aisle: string;
  name: string;
  nameClean: string | null;
  originalName: string;
  meta: string[];
  metric_amount: number;
  metric_unitShort: string;
  metric_unitLong: string;
}

// Nutrition related types
export interface Nutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds: number;
}

export interface Nutrition {
  nutrients: Nutrient[];
}

// Main Recipe type
export interface Recipe {
  id: number;
  title: string;
  description: string;
  instructions: string;
  analyzedInstructions: Instruction[];
  image: string | null;
  external_image: string;
  cook_time: number;
  cookingMinutes: number;
  preparationMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  nutrition: Nutrition;
  healthScore: number;
  aggregateLikes: number;
  pricePerServing: number | null;
  spoonacularScore: number;
  sourceUrl: string;
  imageType: string;
  youtubeVideoLink: string | null;
  
  // Dietary flags
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  veryHealthy: boolean;
  cheap: boolean;
  veryPopular: boolean;
  sustainable: boolean;
  lowFodmap: boolean;
  
  // Additional metadata
  weightWatcherSmartPoints: number;
  gaps: string;
  servings: number;
  
  // Arrays of related data
  cuisines: Cuisine[];
  dishTypes: DishType[];
  diets: Diet[];
  occasions: Tag[];
  tags: Tag[];
  recipe_ingredients: RecipeIngredient[];
  
  // User related data
  api_source: string | null;
  created_by_user: boolean;
  user: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  saved_count: number;
  is_liked: boolean;
  is_saved: boolean;
  total_view_count: number;
  availableForPurchase: boolean;
  is_paid?: boolean;
}