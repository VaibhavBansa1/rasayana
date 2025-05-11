import { View, Text, TouchableOpacity, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Link, Tabs } from 'expo-router';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { debounce } from 'lodash'; // Add lodash for debouncing
import { BASE_URL } from '../../utils/api';
import { Recipe } from '../../components/new-recipe-card';
import NewRecipes from '../../components/new-recipe';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import FilterModal from '../../components/filter-modal';
import { Filters, ActiveFilters } from '../../types/filters';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export default function Search() {
    const [searchText, setSearchText] = useState('');
    const [data, setData] = useState<Recipe[]>([]);
    const [noOfFound, setNoOfFound] = useState<null | number>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<Filters | null>(null);
    // Initialize with vegetarian=true by default
    const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
        vegetarian: true
    });
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Fetch all recipes with default filters on mount
    useEffect(() => {
        fetchData(1, '', { vegetarian: true });
    }, []);

    // Fetch available filters
    useEffect(() => {
        axios.get(`${BASE_URL}/api/search/filters/`,{
            headers: { 'ngrok-skip-browser-warning': '69420' },
            timeout: 10000,
        })
            .then(res => setFilters(res.data))
            .catch(console.error);
    }, []);

    const fetchData = async (pageNumber: number, search: string, currentFilters?: ActiveFilters) => {
        if (!hasMore && pageNumber !== 1) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const filtersToUse = currentFilters || activeFilters;
            const queryParams = new URLSearchParams({
                page: pageNumber.toString(),
                ...Object.fromEntries(
                    Object.entries(filtersToUse)
                        .filter(([_, value]) => value !== undefined)
                        .map(([key, value]) => [key, String(value)])
                )
            });

            // Only add search param if there's actually a search term
            if (search.trim()) {
                queryParams.append('search', search.trim());
            }
            
            const url = `${BASE_URL}/api/search/?${queryParams}`;
            const res = await axios.get(url, {
                headers: { 'ngrok-skip-browser-warning': '69420' },
                timeout: 10000,
            });
            
            if (!res.data) throw new Error('No data received');
            
            setNoOfFound(res.data.count);
            if (pageNumber === 1) {
                setData(res.data.results);
            } else {
                setData(prev => [...prev, ...res.data.results]);
            }
            setHasMore(!!res.data.next);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch recipes';
            console.error(errorMessage);
            setError(errorMessage);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
            });
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    // Debounced search function
    const debouncedSearch = React.useCallback(
        debounce((searchTerm: string) => {
            setPage(1);
            fetchData(1, searchTerm);
        }, 500),
        [activeFilters] // Include activeFilters in dependencies
    );

    // Handle filter changes
    const handleApplyFilters = (newFilters: ActiveFilters) => {
        setActiveFilters(newFilters);
        setPage(1);
        fetchData(1, searchText, newFilters);
    };

    // Handle refresh
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setPage(1);
        fetchData(1, searchText);
    }, [searchText, activeFilters]);

    // Load more data
    const loadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchData(nextPage, searchText);
        }
    };

    // Use hooks for speech recognition events
    useSpeechRecognitionEvent("start", () => setIsListening(true));
    useSpeechRecognitionEvent("end", () => setIsListening(false));
    useSpeechRecognitionEvent("result", (event) => {
        if (event.results[0]?.transcript) {
            const text = event.results[0].transcript;
            setSearchText(text);
            debouncedSearch(text);
        }
    });
    useSpeechRecognitionEvent("error", (event) => {
        console.error("Speech recognition error:", event.error, event.message);
        Toast.show({
            type: 'error',
            text1: 'Error',
            text2: event.message || 'Speech recognition failed'
        });
        setIsListening(false);
        setIsSpeaking(false);
    });

    const startSpeechToText = async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) {
                Toast.show({
                    type: 'error',
                    text1: 'Permission Denied',
                    text2: 'Microphone permission is required'
                });
                return;
            }

            // Start speech recognition with options
            await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: true,
                maxAlternatives: 1,
                continuous: false
            });

        } catch (error) {
            console.error('Speech recognition error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not start speech recognition'
            });
            setIsListening(false);
            setIsSpeaking(false);
        }
    };

    const stopSpeechToText = async () => {
        try {
            await ExpoSpeechRecognitionModule.stop();
            setIsListening(false);
            setIsSpeaking(false);
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <Tabs.Screen
                options={{
                    headerSearchBarOptions: {
                        ref: (Ref) => {
                            if (Ref && Platform.OS !== 'web') {
                                Ref.setText(searchText);
                            }
                        },
                        inputType: 'text',
                        placeholder: 'Search Any Flavor Fusion',
                        onChangeText: (e) => {
                            const newText = e.nativeEvent.text;
                            setSearchText(newText);
                            debouncedSearch(newText);
                        },
                        onClose: () => {
                            setSearchText(searchText);
                            debouncedSearch(searchText);
                        },
                    },
                    tabBarHideOnKeyboard: true
                }}
            />
            <View className='flex-row m-2 justify-between items-center'>
                <View className="flex-row gap-2">
                    <Link 
                        href={{
                            pathname:"/(tabs)/chat",
                            params: { userQuery: searchText }
                        }} 
                        asChild
                    >
                        <TouchableOpacity>
                            <Text className='p-2 rounded-full bg-emerald-400'>
                                Ask AI Bot ✨
                            </Text>
                        </TouchableOpacity>
                    </Link>

                    <TouchableOpacity
                        onPress={isListening ? stopSpeechToText : startSpeechToText}
                        className={`p-2 rounded-full ${isListening ? 'bg-red-400' : 'bg-emerald-400'} flex-row items-center gap-1`}
                    >
                        <Ionicons 
                            name={isListening ? 'mic' : 'mic-outline'} 
                            size={20} 
                            color="white" 
                        />
                        {isListening && (
                            <Animated.View 
                                entering={FadeIn}
                                className="flex-row items-center"
                            >
                                <Text className="text-white ml-1">
                                    {isSpeaking ? 'Listening...' : 'Tap to stop'}
                                </Text>
                                {isSpeaking && (
                                    <View className="w-2 h-2 bg-white rounded-full ml-1 animate-pulse" />
                                )}
                            </Animated.View>
                        )}
                    </TouchableOpacity>
                </View>

                <View className='flex-row items-center gap-2'>
                    <TouchableOpacity 
                        onPress={() => setShowFilters(true)}
                        className='p-2 rounded-full bg-emerald-400'
                    >
                        <Ionicons name="filter" size={20} color="white" />
                    </TouchableOpacity>
                    {error && (
                        <TouchableOpacity 
                            onPress={onRefresh}
                            className='p-2 rounded-full bg-red-400'
                        >
                            <MaterialIcons name="refresh" size={20} color="white" />
                        </TouchableOpacity>
                    )}
                    {noOfFound !== null && (
                        <Text className='p-2 rounded-full bg-emerald-400'>
                            Results Found: {noOfFound}
                        </Text>
                    )}
                </View>
            </View>
            
            {filters && (
                <FilterModal
                    visible={showFilters}
                    onClose={() => setShowFilters(false)}
                    filters={filters}
                    activeFilters={activeFilters}
                    onApplyFilters={handleApplyFilters}
                />
            )}
            
            <View className="flex-1">
                <NewRecipes
                    data={data}
                    isLoading={isLoading}
                    onLoadMore={loadMore}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    error={error}
                    ListEmptyComponent={() => (
                        <View className="flex-1 items-center justify-center py-20">
                            {error ? (
                                <TouchableOpacity 
                                    onPress={onRefresh}
                                    className='p-4 rounded-xl bg-red-100'
                                >
                                    <Text className='text-red-600 mb-2'>
                                        {error}
                                    </Text>
                                    <Text className='text-center text-red-500'>
                                        Tap to retry
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <Link 
                                    href={{
                                        pathname:"/(tabs)/chat",
                                        params: { userQuery: searchText }
                                    }} 
                                    asChild
                                >
                                    <TouchableOpacity>
                                        <Text className='p-2 rounded-full bg-emerald-300'>
                                            Can't find what you're looking for? Ask Rasāyana Bot ✨
                                        </Text>
                                    </TouchableOpacity>
                                </Link>
                            )}
                        </View>
                    )}
                />
            </View>
        </View>
    );
}