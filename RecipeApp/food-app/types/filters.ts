export interface Filters {
    flags: string[];
    cuisines: string[];
    dishTypes: string[];
    diets: string[];
    occasions: string[];
    ordering: string[];
}

export interface ActiveFilters {
    vegetarian?: boolean | 'unknown';
    vegan?: boolean | 'unknown';
    glutenFree?: boolean | 'unknown';
    dairyFree?: boolean | 'unknown';
    veryHealthy?: boolean | 'unknown';
    cheap?: boolean | 'unknown';
    veryPopular?: boolean | 'unknown';
    sustainable?: boolean | 'unknown';
    lowFodmap?: boolean | 'unknown';
    cuisines__name?: string;
    dishTypes__name?: string;
    diets__name?: string;
    occasions__name?: string;
    ordering?: string;
}