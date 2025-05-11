import { View, Text, ScrollView, TextInput, Pressable, TouchableOpacity, Platform } from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { MagnifyingGlassIcon } from 'react-native-heroicons/outline';
import { useRouter } from 'expo-router';
import { apiClient } from '../../utils/Auth-Request';
import { getFilteredRecipes } from '../../utils/recipe-filters';
import NewRecipes from '../../components/new-recipe';
import { Recipe } from '../../types/profile';
import { useFocusEffect } from 'expo-router';
import { responsive } from '../../utils/responsive';
import * as Notifications from 'expo-notifications';

interface RecipeSection {
    id: string;
    title: string;
    subtitle?: string;
    filters: any;
    data: Recipe[];
}

export default function Home() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'vegetarian' | 'vegan'>('vegetarian');
    const [sections, setSections] = useState<RecipeSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        // Skip notification setup on web platform
        if (Platform.OS === 'web') return;

        // Handle notifications when app is in foreground (do nothing, or show a toast if you want)
        const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
            // Optionally show a toast or badge, but do NOT navigate
        });
        
        // Handle notification when app is launched by clicking on notification
        const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.recipeId) {
                router.push({
                    pathname: "/recipeDetail",
                    params: { recipeId: data.recipeId }
                });
            }
        });

        // Check if app was opened from a notification
        const checkInitialNotification = async () => {
            try {
                const response = await Notifications.getLastNotificationResponseAsync();
                if (response) {
                    const data = response.notification.request.content.data;
                    if (data?.recipeId) {
                        router.push({
                            pathname: "/recipeDetail",
                            params: { recipeId: data.recipeId }
                        });
                    }
                }
            } catch (error) {
                console.log('Error checking initial notification:', error);
            }
        };
        checkInitialNotification();

        return () => {
            foregroundSubscription.remove();
            backgroundSubscription.remove();
        };
    }, []);

    const fetchRecipeSections = async () => {
        setLoading(true);
        try {
            const sectionsToFetch: RecipeSection[] = [
                {
                    id: 'trending',
                    title: 'Trending Now',
                    subtitle: 'Popular recipes this week',
                    filters: {
                        ordering: '-aggregateLikes',
                        ...(dietaryFilter !== 'all' && { [dietaryFilter]: true })
                    },
                    data: []
                },
                {
                    id: 'healthy',
                    title: 'Healthy Choices',
                    subtitle: 'Nutritious and delicious',
                    filters: {
                        veryHealthy: true,
                        ...(dietaryFilter !== 'all' && { [dietaryFilter]: true })
                    },
                    data: []
                },
                {
                    id: 'easy',
                    title: 'Quick & Easy',
                    subtitle: 'Ready in no time',
                    filters: {
                        difficulty: 'Easy',
                        ...(dietaryFilter !== 'all' && { [dietaryFilter]: true })
                    },
                    data: []
                },
                {
                    id: 'latest',
                    title: 'Latest Additions',
                    subtitle: 'Fresh new recipes',
                    filters: {
                        ordering: '-created_at',
                        ...(dietaryFilter !== 'all' && { [dietaryFilter]: true })
                    },
                    data: []
                }
            ];

            // If logged in, add personalized sections
            if (isLoggedIn) {
                sectionsToFetch.unshift(
                    {
                        id: 'recent',
                        title: 'Recently Viewed',
                        filters: {},
                        data: []
                    },
                    {
                        id: 'recommended',
                        title: 'Recommended for You',
                        subtitle: 'Based on your preferences',
                        filters: { recommended: true },
                        data: []
                    }
                );
            }

            // Fetch all sections in parallel
            const updatedSections = await Promise.all(
                sectionsToFetch.map(async (section) => {
                    try {
                        let data;
                        if (section.id === 'recent') {
                            const response = await apiClient.get('api/profile/recently-visited/');
                            data = response.data.results;
                        } else {
                            const response = await getFilteredRecipes(apiClient, section.filters);
                            data = response.results;
                        }
                        return { ...section, data };
                    } catch (error) {
                        console.error(`Error fetching ${section.title}:`, error);
                        return section;
                    }
                })
            );

            setSections(updatedSections.filter(section => section.data.length > 0));
        } catch (error) {
            console.error('Error fetching sections:', error);
        } finally {
            setLoading(false);
        }
    };

    // Check auth status and fetch data on focus
    useFocusEffect(
        useCallback(() => {
            const checkAuth = async () => {
                try {
                    await apiClient.get('api/user/profile/');
                    setIsLoggedIn(true);
                } catch {
                    setIsLoggedIn(false);
                }
            };
            checkAuth();
            fetchRecipeSections();
        }, [dietaryFilter])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchRecipeSections();
        setRefreshing(false);
    };

    return (
        <ScrollView 
            className="flex-1 bg-white"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50 }}
        >
            {/* Header Section */}
            <View className="mx-4 mt-4 mb-6">
                <Text className="font-semibold text-neutral-600" style={{ fontSize: responsive.hp(3.8) }}>
                    Savor the Flavor:
                </Text>
                <Text className="font-semibold text-neutral-600" style={{ fontSize: responsive.hp(3.8) }}>
                    <Text className="text-amber-500">Home-Made Elixir</Text> Awaits!
                </Text>
            </View>

            {/* Search Bar */}
            <Pressable 
                onPress={() => router.push('/search')}
                className="mx-4 flex-row items-center rounded-full bg-black/5 p-[6px]"
            >
                <TextInput
                    placeholder="Search Any Flavor Fusion"
                    placeholderTextColor="gray"
                    className="flex-1 text-base mb-1 pl-3 tracking-wider"
                    editable={false}
                />
                <View className="bg-white rounded-full p-3">
                    <MagnifyingGlassIcon size={responsive.hp(2.5)} strokeWidth={3} color="gray" />
                </View>
            </Pressable>

            {/* Dietary Filter Buttons */}
            <View className="flex-row justify-center my-4">
                {['all', 'vegetarian', 'vegan'].map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        onPress={() => setDietaryFilter(filter as any)}
                        className={`px-6 mx-2 py-2 rounded-full ${
                            dietaryFilter === filter ? 'bg-amber-500' : 'bg-gray-200'
                        }`}
                    >
                        <Text className={`capitalize ${
                            dietaryFilter === filter ? 'text-white' : 'text-gray-600'
                        }`}>
                            {filter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Recipe Sections */}
            {sections.map((section) => (
                <View key={section.id} className="mb-6">
                    <View className="mx-4 mb-4">
                        <Text className="text-lg font-bold text-gray-800">{section.title}</Text>
                        {section.subtitle && (
                            <Text className="text-sm text-gray-500">{section.subtitle}</Text>
                        )}
                    </View>
                    <NewRecipes
                        data={section.data}
                        isLoading={loading}
                        onLoadMore={() => {}}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        error={null}
                    />
                </View>
            ))}
        </ScrollView>
    );
}