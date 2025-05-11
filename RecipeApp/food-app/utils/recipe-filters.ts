export interface FilterOptions {
    vegetarian?: boolean;
    vegan?: boolean;
    veryHealthy?: boolean;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    ordering?: '-created_at' | '-aggregateLikes' | '-healthScore';
    limit?: number;
}

export const getFilteredRecipes = async (apiClient: any, filters: FilterOptions) => {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
        }
    });

    // Always limit results unless specified
    if (!filters.limit) {
        queryParams.append('limit', '10');
    }

    try {
        const response = await apiClient.get(`api/search/?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching filtered recipes:', error);
        return { results: [] };
    }
};