import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import { Recipe } from '../types/profile';
import { useRouter } from 'expo-router';
import RecipeCard from './new-recipe-card';
import { Ionicons } from '@expo/vector-icons';

interface ProfileRecipesProps {
    title: string;
    type: 'recent' | 'liked' | 'saved';
    recipes: Recipe[];
    loading?: boolean;
}

export default function ProfileRecipes({ title, type, recipes, loading }: ProfileRecipesProps) {
    const router = useRouter();

    if (loading) {
        return (
            <View className="mb-6">
                <Text className="text-lg font-semibold mb-3">{title}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[1, 2, 3].map((item) => (
                        <View key={item} className="mr-4" style={{ width: 200 }}>
                            <View className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                            <View className="h-4 w-3/4 bg-gray-100 rounded mt-2 animate-pulse" />
                            <View className="h-4 w-1/2 bg-gray-100 rounded mt-2 animate-pulse" />
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    }

    if (!recipes?.length) {
        return null;
    }

    return (
        <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-semibold">{title}</Text>
                <TouchableOpacity 
                    onPress={() => router.push({
                        pathname: '/all-recipes',
                        params: { type }
                    })}
                    className="flex-row items-center"
                >
                    <Text className="text-amber-500 mr-1">Show All</Text>
                    <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recipes.slice(0, 5).map((recipe) => (
                    <View key={recipe.id} className="mr-4" style={{ width: 200 }}>
                        <RecipeCard recipe={recipe} />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}