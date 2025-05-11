export interface Tag {
    id: string;
    name: string;
}

export interface Recipe {
    id: number;
    title: string;
    image: string | null;
    external_image: string;
    healthScore: number;
    imageType: string;
    tags: Tag[];
    created_by_user: boolean;
    user: null | number;
    created_at: string;
    updated_at: string;
}

export interface RecipeResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Recipe[];
}