import { View, Text, RefreshControl } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Recipe } from '../types/profile';
import { apiClient } from '../utils/Auth-Request';
import NewRecipes from '../components/new-recipe';
import Toast from 'react-native-toast-message';

export default function AllRecipes() {
    const { type } = useLocalSearchParams();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const getEndpoint = () => {
        switch(type) {
            case 'recent':
                return 'api/profile/recently-visited/';
            case 'liked':
                return 'api/profile/liked/';
            case 'saved':
                return 'api/profile/saved/';
            default:
                return '';
        }
    };

    const getTitle = () => {
        switch(type) {
            case 'recent':
                return 'Recently Viewed';
            case 'liked':
                return 'Liked Recipes';
            case 'saved':
                return 'Saved Recipes';
            default:
                return '';
        }
    };

    const fetchRecipes = async (pageNum: number) => {
        if (!hasMore && pageNum !== 1) return;
        
        try {
            const response = await apiClient.get(
                `${getEndpoint()}?page=${pageNum}`
            );
            if (pageNum === 1) {
                setRecipes(response.data.results);
            } else {
                setRecipes(prev => [...prev, ...response.data.results]);
            }
            setHasMore(!!response.data.next);
            setError(null);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch recipes';
            console.error('Error fetching recipes:', errorMessage);
            setError(errorMessage);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRecipes(1);
    }, [type]);

    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
            fetchRecipes(page + 1);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchRecipes(1);
    };

    return (
        <View className="flex-1 bg-white">
            <View className="px-4 py-6 border-b border-gray-200">
                <Text className="text-2xl font-bold text-gray-800">{getTitle()}</Text>
            </View>
            <NewRecipes
                data={recipes}
                isLoading={loading}
                onLoadMore={loadMore}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                error={error}
                ListEmptyComponent={() => (
                    <View className="flex-1 items-center justify-center py-20">
                        <Text className="text-gray-500 text-lg">
                            No {type} recipes found
                        </Text>
                    </View>
                )}
            />
            <Toast />
        </View>
    );
}