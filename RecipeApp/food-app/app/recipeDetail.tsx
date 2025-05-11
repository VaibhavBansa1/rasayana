import { View, Text, ScrollView, Image, TouchableOpacity, Platform, Dimensions, Linking, Share } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, router, useFocusEffect, Tabs } from 'expo-router';
import { HeartIcon, BookmarkIcon, ClockIcon, SpeakerWaveIcon, MinusIcon, PlusIcon, ChevronDownIcon, BeakerIcon, CalendarIcon, UserIcon, EyeIcon, StarIcon } from 'react-native-heroicons/outline';
import { HeartIcon as HeartSolid, BookmarkIcon as BookmarkSolid, ChatBubbleLeftIcon } from 'react-native-heroicons/solid';
import * as Speech from 'expo-speech';
import Toast from 'react-native-toast-message';
import { Recipe } from '../types/recipe';
import { apiClient, AuthenticationError } from '../utils/Auth-Request';
import RecipeDetailSkeleton from '../components/RecipeDetailSkeleton';
import { cleanHtmlTags, truncateText, formatIngredient } from '../utils/text-helpers';
import { formatDistanceToNow } from 'date-fns';
import { VideoPlayer } from '../components/VideoPlayer';
import { MaterialIcons } from '@expo/vector-icons';
import '../global.css';
const { width: windowWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const isAndroid = () => {
    if (!isWeb) return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /android/.test(userAgent);
}

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    }).format(new Date(dateString));
};

export default function RecipeDetail() {
    const { recipeId } = useLocalSearchParams();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [servings, setServings] = useState(1);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(windowWidth >= 768);

    // Handle screen size changes for responsive layout
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setIsLargeScreen(window.width >= 768);
        });
        return () => subscription?.remove();
    }, []);

    // Fetch recipe details and cleanup speech on unmount
    useEffect(() => {
        if (!recipeId) {
            router.back();
            return;
        }
        fetchRecipeDetails();
        return () => {
            Speech.stop();
        };
    }, [recipeId]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                Speech.stop();
            };
        }, [])
    );

    const handleOpenApp = async () => {
        if (!isWeb) return;

        const appScheme = 'exp+rasayana://';
        const appUrl = `${appScheme}recipeDetail?recipeId=${recipeId}`;
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.vaibhav_bansal.rasayana';

        try {
            // Check if app is installed
            const supported = await Linking.canOpenURL(appUrl);

            if (supported) {
                // App is installed, open it
                await Linking.openURL(appUrl);
            } else {
                // App is not installed, show store options
                Toast.show({
                    type: 'info',
                    text1: 'App not installed',
                    text2: 'Download Rasāyana from your app store',
                    position: 'bottom',
                });

                if (isAndroid()) {
                    window.open(playStoreUrl, '_blank');
                } else {
                    // Generic web fallback
                    window.open('https://rasayana.expo.app', '_blank');
                }
            }
        } catch (error) {
            console.error('Error opening app:', error);
            Toast.show({
                type: 'error',
                text1: 'Error opening app',
                text2: 'Please try again later',
                position: 'bottom',
            });
        }
    };

    const handleShare = async () => {
        const shareUrl = `https://rasayana.expo.app/recipeDetail?recipeId=${recipeId}`;
        const shareTitle = recipe?.title || 'Check out this recipe';
        const shareText = `${shareTitle}\n\n${shareUrl}`;
        try {
            if (isWeb) {
                if (navigator.share) {
                    await navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: shareUrl,
                    });
                } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareText);
                    Toast.show({
                        type: 'success',
                        text1: 'Link copied!',
                        text2: 'Share the link with your friends',
                        position: 'bottom',
                    });
                } else {
                    // Fallback for browsers without clipboard API
                    const textArea = document.createElement('textarea');
                    textArea.value = shareText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        Toast.show({
                            type: 'success',
                            text1: 'Link copied!',
                            text2: 'Share the link with your friends',
                            position: 'bottom',
                        });
                    } catch {
                        Toast.show({
                            type: 'error',
                            text1: 'Unable to copy',
                            text2: 'Copy the link manually',
                            position: 'bottom',
                        });
                    }
                    document.body.removeChild(textArea);
                }
            } else {
                // Native sharing for mobile
                const result = await Share.share({
                    message: shareText,
                    title: shareTitle,
                    url: shareUrl,
                });

                if (result.action === Share.sharedAction) {
                    if (result.activityType) {
                        // Shared with activity type of result.activityType
                        // Optionally handle specific activity types
                    } else {
                        // Shared successfully
                        Toast.show({
                            type: 'success',
                            text1: 'Shared!',
                            text2: 'Recipe shared successfully.',
                            position: 'bottom',
                        });
                    }
                } else if (result.action === Share.dismissedAction) {
                    // Dismissed
                    Toast.show({
                        type: 'info',
                        text1: 'Share cancelled',
                        text2: 'You cancelled sharing.',
                        position: 'bottom',
                    });
                }
            }
        } catch (error) {
            console.error('Share error:', error);
            Toast.show({
                type: 'error',
                text1: 'Unable to share',
                text2: Platform.OS === 'web' ? 'Try copying the link manually' : 'Please try again',
                position: 'bottom',
            });
        }
    };

    const fetchRecipeDetails = async () => {
        try {
            const response = await apiClient.get(`api/recipes/${recipeId}/`);
            setServings(response.data.servings);
            setRecipe(response.data);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not fetch recipe details',
            });
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        try {
            const count = await apiClient.post(`api/recipes/${recipeId}/like/`, {});
            setRecipe(prev => prev ? {
                ...prev,
                is_liked: !prev.is_liked,
                like_count: count.data.like_count
            } : prev);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                Toast.show({
                    type: 'info',
                    text1: 'Login Required',
                    text2: 'Please login to like recipes',
                });
                router.push('/(tabs)/account');
            } else {
                console.error(error)
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Could not update like status',
                });
            }
        }
    };

    const handleSave = async () => {
        try {
            const count = await apiClient.post(`api/recipes/${recipeId}/save/`, {});
            setRecipe(prev => prev ? {
                ...prev,
                is_saved: !prev.is_saved,
                saved_count: count.data.save_count
            } : prev);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                Toast.show({
                    type: 'info',
                    text1: 'Login Required',
                    text2: 'Please login to save recipes',
                });
                router.push('/(tabs)/account');
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Could not update save status',
                });
            }
        }
    };

    const speakInstructions = async () => {
        if (!recipe) return;

        if (isSpeaking) {
            await Speech.stop();
            setIsSpeaking(false);
            return;
        }

        const textToSpeak = cleanHtmlTags(recipe.instructions);
        setIsSpeaking(true);

        Speech.speak(textToSpeak, {
            onDone: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false)
        });
    };

    const formatTime = (minutes: number) => {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const getYoutubeVideoId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const servingText = (num: number) => num === 1 ? 'serving' : 'servings';

    // Video Section Component
    const VideoSection = () => {
        const videoId = getYoutubeVideoId(recipe?.youtubeVideoLink || '');
        return videoId ? (
            <View className="mt-6">
                <Text className="text-xl font-bold text-gray-800 mb-4">Video Guide</Text>
                <VideoPlayer videoId={videoId} height={320} />
            </View>
        ) : null;
    };

    // Nutrition Section Component (shows all nutrients per serving)
    const NutritionSection = () => (
        <View className="mt-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">Nutrition Facts (per serving)</Text>
            <View className="bg-gray-50 p-4 rounded-xl">
                {recipe?.nutrition.nutrients.map((nutrient, index) => (
                    <View key={index} className="flex-row justify-between py-2 border-b border-gray-200">
                        <Text className="text-gray-600">{nutrient.name}</Text>
                        <Text className="font-semibold">
                            {nutrient.amount.toFixed(1)} {nutrient.unit} ({nutrient.percentOfDailyNeeds.toFixed(0)}%)
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );

    // Main Content Component
    const MainContent = () => (
        <View className="px-4">
            {/* Hero Section */}
            <View className="relative">
                <Image
                    source={{
                        uri: recipe?.image ||
                            recipe?.external_image ||
                            'https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png'
                    }}
                    className="w-full h-[300px]"
                    style={{ resizeMode: 'cover' }}
                />
                <View className="absolute top-4 right-4 flex-row">
                    {recipe?.is_liked !== undefined && (
                        <TouchableOpacity onPress={handleLike} className="rounded-xl bg-amber-200 p-2 mr-1">
                            {recipe.is_liked ? <HeartSolid size={24} color="#ef4444" /> : <HeartIcon size={24} color="#ef4444" />}
                        </TouchableOpacity>
                    )}
                    {recipe?.is_saved !== undefined && (
                        <TouchableOpacity onPress={handleSave} className="rounded-xl bg-amber-200 p-2 mr-1">
                            {recipe.is_saved ? <BookmarkSolid size={24} color="#f59e0b" /> : <BookmarkIcon size={24} color="#f59e0b" />}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: "/(tabs)/chat", params: { recipeId, recipeName: recipe?.title } })}
                        className="rounded-xl bg-amber-200 p-2 mr-1"
                    >
                        <ChatBubbleLeftIcon size={24} color="#47ee58" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="rounded-xl bg-amber-200 p-2 mr-1"
                        onPress={handleShare}
                    >
                        <MaterialIcons name="share" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Title & Meta */}
            <View className="mt-4">
                <Text className="text-3xl font-bold text-gray-800">{recipe?.title}</Text>
                {recipe?.user && (
                    <View className="flex-row items-center mt-2">
                        <UserIcon size={16} color="#6b7280" />
                        <Text className="text-gray-500 ml-1">Uploaded By {recipe.user}</Text>
                    </View>
                )}
                <View className="flex-row items-center mt-2 gap-1">
                    <CalendarIcon size={20} color="#666" />
                    <Text className="text-gray-600">{formatDate(recipe?.created_at)}</Text>
                </View>
                {recipe?.updated_at !== recipe?.created_at && (
                    <View className="flex-row items-center mt-1">
                        <ClockIcon size={20} color="#666" />
                        <Text className="text-gray-600 ml-1">Modified {formatDistanceToNow(new Date(recipe?.updated_at))} ago</Text>
                    </View>
                )}
                <View className="flex-row flex-wrap gap-4 mt-4">
                    <View className="flex-row items-center">
                        <EyeIcon size={20} color="#666" />
                        <Text className="text-gray-600 ml-1">{recipe?.total_view_count || 0} views</Text>
                    </View>
                    <View className="flex-row items-center">
                        <HeartIcon size={20} color="#666" />
                        <Text className="text-gray-600 ml-1">{recipe?.like_count || 0} likes</Text>
                    </View>
                    <View className="flex-row items-center">
                        <BookmarkIcon size={20} color="#666" />
                        <Text className="text-gray-600 ml-1">{recipe?.saved_count || 0} saves</Text>
                    </View>
                    <View className="flex-row items-center">
                        <BeakerIcon size={20} color="#666" />
                        <Text className="text-gray-600 ml-1">{recipe?.servings || 0} servings</Text>
                    </View>
                </View>
            </View>

            {/* Cooking Info Grid */}
            <View className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                <InfoCard title="Total Time" value={formatTime(recipe?.cook_time || 0)} icon={<ClockIcon size={24} color="#f59e0b" />} />
                <InfoCard title="Prep Time" value={formatTime(recipe?.preparationMinutes || 0)} icon={<ClockIcon size={24} color="#f59e0b" />} />
                <InfoCard title="Cook Time" value={formatTime(recipe?.cookingMinutes || 0)} icon={<ClockIcon size={24} color="#f59e0b" />} />
                <InfoCard title="Difficulty" value={recipe?.difficulty} icon={<BeakerIcon size={24} color="#f59e0b" />} />
                <InfoCard title="Health Score" value={`${recipe?.healthScore || 0}/100`} icon={<HeartIcon size={24} color="#f59e0b" />} />
                <InfoCard title="Score" value={`${Math.round(recipe?.spoonacularScore || 0)}/100`} icon={<StarIcon size={24} color="#f59e0b" />} />
            </View>

            {/* Tags Section */}
            <View className="mt-6">
                {recipe?.cuisines && recipe.cuisines.length > 0 && <TagSection title="Cuisines" tags={recipe.cuisines} />}
                {recipe?.dishTypes && recipe.dishTypes?.length > 0 && <TagSection title="Dish Types" tags={recipe.dishTypes} />}
                {recipe?.diets && recipe.diets?.length > 0 && <TagSection title="Diets" tags={recipe.diets} />}
                {recipe?.occasions && recipe.occasions?.length > 0 && <TagSection title="Occasions" tags={recipe.occasions} />}
                {recipe?.tags && recipe.tags?.length > 0 && <TagSection title="Tags" tags={recipe.tags} />}
            </View>

            {/* Description */}
            <View className="mt-6">
                <Text className="text-gray-700">
                    {showFullDescription ? cleanHtmlTags(recipe?.description || '') : truncateText(recipe?.description || '', 150)}
                </Text>
                <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)} className="flex-row items-center mt-2">
                    <Text className="text-amber-500 mr-1">{showFullDescription ? 'Show less' : 'Read more'}</Text>
                    <ChevronDownIcon size={16} color="#f59e0b" style={{ transform: [{ rotate: showFullDescription ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>
            </View>

            {/* Quantity Selector */}
            <View className="flex-row items-center justify-between mt-6 bg-gray-50 p-4 rounded-xl">
                <TouchableOpacity onPress={() => setServings(q => Math.max(1, q - 1))} className="bg-amber-500 p-2 rounded-full">
                    <MinusIcon size={20} color="white" />
                </TouchableOpacity>
                <Text className="text-xl font-semibold">{servings}</Text>
                <TouchableOpacity onPress={() => setServings(q => q + 1)} className="bg-amber-500 p-2 rounded-full">
                    <PlusIcon size={20} color="white" />
                </TouchableOpacity>
            </View>

            {recipe?.pricePerServing && (
                <TouchableOpacity onPress={() => router.push({
                    pathname: '/payment',
                    params: {
                        recipeId: recipe.id,
                        servings: servings
                    }
                })}>
                    <View className="mt-4 p-4 bg-amber-50 rounded-lg">
                        <Text className="text-center text-amber-800 font-semibold">
                            Order Now: ₹{(recipe.pricePerServing * servings).toFixed(2)} for {servings} {servingText(servings)}
                        </Text>
                        <Text className="text-center text-amber-600 text-sm mt-1">
                            Estimated delivery: 45-60 minutes
                        </Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Ingredients */}
            <View className="mt-6">
                <Text className="text-xl font-bold text-gray-800 mb-4">Ingredients</Text>
                {recipe?.recipe_ingredients.map((ingredient, index) => (
                    <View key={index} className="flex-row items-center py-2 border-b border-gray-100">
                        <View className="w-2 h-2 bg-amber-500 rounded-full mr-3" />
                        <Text className="text-gray-700">
                            {formatIngredient({
                                ...ingredient,
                                metric_amount: parseFloat((ingredient.metric_amount * (servings / (recipe?.servings || 1))).toFixed(2))
                            })}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Instructions */}
            {recipe?.analyzedInstructions &&
                <View className="mt-6">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-gray-800">Instructions</Text>
                        <TouchableOpacity onPress={speakInstructions} className="p-2 bg-amber-100 rounded-full">
                            <SpeakerWaveIcon size={24} color="#f59e0b" />
                        </TouchableOpacity>
                    </View>
                    {recipe?.analyzedInstructions.map((instruction, idx) => (
                        <View key={idx} className="mb-6">
                            {instruction.name && <Text className="font-semibold text-gray-700 mb-2">{instruction.name}</Text>}
                            {instruction.steps.map(step => (
                                <View key={step.number} className="mb-4">
                                    <Text className="text-gray-800 mb-2">{step.number}. {step.step}</Text>
                                    {step.equipment.length > 0 && (
                                        <View className="flex-row flex-wrap gap-2 mt-2">
                                            {step.equipment.map(eq => (
                                                <View key={eq.id} className="bg-gray-100 px-3 py-1 rounded-full">
                                                    <Text className="text-gray-600">{eq.name}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            }
        </View>
    );

    if (loading) {
        return <RecipeDetailSkeleton />;
    }

    return (
        <View style={{ flex: 1 }}>
            <Tabs.Screen
                options={{
                    headerRight: () => (
                        <View className="flex-row items-center">
                            {isWeb && isAndroid() && (
                                <TouchableOpacity
                                    className="mr-3 rounded-xl bg-amber-200 p-2"
                                    onPress={handleOpenApp}
                                >
                                    <Text className="text-sm">Open App</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                {isLargeScreen ? (
                    <View className="flex flex-row px-4">
                        <View className="w-[350px] mr-4">
                            {recipe?.youtubeVideoLink && <VideoSection />}
                            <NutritionSection />
                        </View>
                        <View className="flex-1">
                            <MainContent />
                        </View>
                    </View>
                ) : (
                    <>
                        <MainContent />
                        {recipe?.youtubeVideoLink && <VideoSection />}
                        <NutritionSection />
                    </>
                )}
            </ScrollView>

            {!isWeb && (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
                    <View className="flex-row justify-between items-center">
                        {recipe?.pricePerServing && (
                            <TouchableOpacity onPress={() => router.push({
                                pathname: '/payment',
                                params: {
                                    recipeId: recipe.id,
                                    servings: servings
                                }
                            })}
                                className="bg-emerald-300 px-4 py-2 rounded-full">
                                <Text className="text-emerald-900">Order Food</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={speakInstructions} className="bg-amber-500 px-6 py-2 rounded-full">
                            <Text className="text-white font-semibold">{isSpeaking ? 'Stop' : 'Read Instructions'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push({ pathname: "/(tabs)/chat", params: { recipeId, recipeName: recipe?.title } })} className="bg-emerald-300 px-4 py-2 rounded-full">
                            <Text className="text-emerald-900">Ask Bot</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Toast />
        </View>
    );
}

// Helper Components
const InfoCard = ({ title, value, icon }) => (
    <View className="bg-gray-50 p-3 rounded-lg">
        <View className="flex-row items-center mb-2">
            {icon}
            <Text className="text-gray-600 ml-2">{title}</Text>
        </View>
        <Text className="text-lg font-semibold text-gray-800">{value}</Text>
    </View>
);

const TagSection = ({ title, tags }) => (
    <View className="mb-4">
        <Text className="text-gray-600 mb-2">{title}</Text>
        <View className="flex-row flex-wrap gap-2">
            {tags.map(tag => (
                <View key={tag.id} className="bg-emerald-100 px-3 py-1 rounded-full">
                    <Text className="text-emerald-800">{tag.name}</Text>
                </View>
            ))}
        </View>
    </View>
);