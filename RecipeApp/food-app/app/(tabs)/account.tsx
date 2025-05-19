import { View, Text, TouchableOpacity, Image, ScrollView, RefreshControl, Platform } from "react-native";
import React, { useCallback, useState, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import { Tabs, useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import { Recipe } from "../../types/profile";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ProfileRecipes from "../../components/profile-recipes";
import { apiClient, AuthenticationError, NetworkError, tokenOperation } from "../../utils/Auth-Request";
import { BASE_URL } from "../../utils/api";
import Loading from "../../components/loading";
import NetInfo from '@react-native-community/netinfo';
import { responsive } from '../../utils/responsive';
import DeveloperInfoModal from '../../components/DeveloperInfoModal';
import '../../global.css';

interface UserInfo {
    username: string;
    email: string;
    profile_picture?: string;
}

const Account = () => {
    const [logged, setLogged] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
    const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [loadingRecipes, setLoadingRecipes] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [networkStatus, setNetworkStatus] = useState<{
        isConnected: boolean;
        isInternetReachable: boolean | null;
    }>({ isConnected: true, isInternetReachable: true });
    const [modalVisible, setModalVisible] = useState(false);
    const loginUrl = `${BASE_URL}/accounts/login/`;
    const manageUrl = `${BASE_URL}/accounts/profile/`;

    // Monitor network status
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setNetworkStatus({
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable
            });
        });

        return () => unsubscribe();
    }, []);

    const openWebBrowser = async (URL: string) => {
        try {
            await WebBrowser.openBrowserAsync(URL, {
                toolbarColor: "#f59e0b",
                createTask: false,
                showInRecents: false,
                controlsColor: "#f59e0b",
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not open browser',
            });
        }
    };

    const fetchProfileData = async () => {
        setLoadingRecipes(true);
        try {
            const [recent, liked, saved] = await Promise.all([
                apiClient.get('api/profile/recently-visited/'),
                apiClient.get('api/profile/liked/'),
                apiClient.get('api/profile/saved/')
            ]);

            setRecentRecipes(recent.data.results);
            setLikedRecipes(liked.data.results);
            setSavedRecipes(saved.data.results);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                setLogged(false);
            } else if (error instanceof NetworkError) {
                Toast.show({
                    type: 'error',
                    text1: 'Network Error',
                    text2: 'Please check your connection',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Could not fetch recipes',
                });
            }
        } finally {
            setLoadingRecipes(false);
        }
    };

    const logout = async () => {
        try {
            await tokenOperation.clearTokens();
            setLogged(false);
            setUserInfo(null);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Logged out successfully',
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not logout properly',
            });
        } finally {
            setLoading(false);
        }
    };

    const checkAuthStatus = async () => {
        try {
            // First check if we have tokens
            const hasTokens = await tokenOperation.getRefreshToken();
            if (!hasTokens) {
                setLogged(false);
                return false;
            }

            // Then check network status
            if (!networkStatus.isConnected) {
                Toast.show({
                    type: 'error',
                    text1: 'No Connection',
                    text2: 'Please check your internet connection',
                });
                return false;
            }

            if (Platform.OS !== 'web' && networkStatus.isInternetReachable === false) {
                Toast.show({
                    type: 'error',
                    text1: 'No Internet',
                    text2: 'Internet connection is not available',
                });
                return false;
            }

            // Check auth by fetching user profile - this validates token and gets needed data
            if (!userInfo) {
                const response = await apiClient.get('api/user/profile/');
                setUserInfo(response.data);
            }
            
            setLogged(true);
            return true;

        } catch (error) {
            if (error instanceof NetworkError) {
                Toast.show({
                    type: 'error',
                    text1: 'Server Unavailable',
                    text2: 'Unable to reach the server',
                });
            } else if (error instanceof AuthenticationError) {
                setLogged(false);
                // Clear all data
                setUserInfo(null);
                setRecentRecipes([]);
                setLikedRecipes([]);
                setSavedRecipes([]);
            }
            return false;
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        const isAuthed = await checkAuthStatus();
        if (isAuthed) {
            await fetchProfileData();
        }
        setLoading(false);
    };

    // Only check auth on focus, don't fetch data
    useFocusEffect(
        useCallback(() => {
            if (!initialLoad) {
                checkAuthStatus();
            }
        }, [initialLoad])
    );

    // Initial load - fetch everything once
    useEffect(() => {
        const initialFetch = async () => {
            const isAuthed = await checkAuthStatus();
            if (isAuthed) {
                await fetchProfileData();
            }
        };
        initialFetch();
    }, []);

    return (
        <>
            <Tabs.Screen
                options={{
                    headerRight: () => (
                        <View className="flex-row items-center">
                            <TouchableOpacity 
                                className="mr-3 rounded-xl p-2" 
                                onPress={() => setModalVisible(true)}
                            >
                                {/* <Text>About Us</Text> */}
                                <MaterialIcons
                                    name="info"
                                    size={30}
                                    color="white"
                                />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            
            <DeveloperInfoModal 
                isVisible={modalVisible}
                onClose={() => setModalVisible(false)}

            />
            
            <ScrollView
                className="flex-1 bg-white"
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={handleRefresh}
                    />
                }
            >
                {logged ? (
                    <View className="flex-1">
                        {/* Profile Header */}
                        <View className="bg-amber-500 pt-8 pb-20 px-4">
                            <View className="items-center">
                                {userInfo?.profile_picture ? (
                                    <Image
                                        source={{ uri: userInfo.profile_picture }}
                                        style={{ 
                                            width: responsive.hp(24), 
                                            height: responsive.hp(24),
                                        }}
                                        className="rounded-full border-4 border-white"
                                    />
                                ) : (
                                    <View style={{ 
                                        width: responsive.hp(24), 
                                        height: responsive.hp(24),
                                    }} className="rounded-full bg-white items-center justify-center">
                                        <Ionicons name="person" size={responsive.hp(10)} color="#f59e0b" />
                                    </View>
                                )}
                                <Text className="text-white text-xl font-semibold mt-2">
                                    {userInfo?.username}
                                </Text>
                                <Text className="text-white opacity-80">
                                    {userInfo?.email}
                                </Text>
                            </View>
                        </View>

                        {/* Profile Content */}
                        <View className="px-4 -mt-12">
                            <View className="bg-white rounded-xl shadow-sm p-4 mb-6">
                                <View className="flex-row justify-between mb-4">
                                    <TouchableOpacity
                                        onPress={() => openWebBrowser(manageUrl)}
                                        className="flex-1 items-center"
                                    >
                                        <Ionicons name="settings-outline" size={responsive.hp(6)} color="#f59e0b" />
                                        <Text className="text-sm mt-1">Manage</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={logout}
                                        className="flex-1 items-center"
                                    >
                                        <Ionicons name="log-out-outline" size={responsive.hp(6)} color="#ef4444" />
                                        <Text className="text-sm mt-1">Logout</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Recipe Lists */}
                            <ProfileRecipes
                                title="Recently Viewed"
                                type="recent"
                                recipes={recentRecipes}
                                loading={loadingRecipes}
                            />
                            <ProfileRecipes
                                title="Liked Recipes"
                                type="liked"
                                recipes={likedRecipes}
                                loading={loadingRecipes}
                            />
                            <ProfileRecipes
                                title="Saved Recipes"
                                type="saved"
                                recipes={savedRecipes}
                                loading={loadingRecipes}
                            />
                        </View>
                    </View>
                ) : (
                    <View className="flex-1 justify-center items-center p-8">
                        {loading ? (
                            <Loading size={50} />
                        ) : (
                            <View className="items-center">
                                {!networkStatus.isConnected ? (
                                    // No network connection view
                                    <View className="items-center">
                                        <Ionicons name="cloud-offline-outline" size={64} color="#94a3b8" />
                                        <Text className="text-xl font-bold text-gray-800 mt-4 mb-2">
                                            No Internet Connection
                                        </Text>
                                        <Text className="text-gray-600 text-center mb-4">
                                            Please check your internet connection and try again
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleRefresh}
                                            className="bg-amber-500 px-6 py-3 rounded-full"
                                        >
                                            <Text className="text-white font-semibold">
                                                Retry Connection
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : Platform.OS !== 'web' && networkStatus.isInternetReachable === false ? (
                                    // Internet not reachable view - only shown on native platforms
                                    <View className="items-center">
                                        <Ionicons name="globe-outline" size={64} color="#94a3b8" />
                                        <Text className="text-xl font-bold text-gray-800 mt-4 mb-2">
                                            No Internet Access
                                        </Text>
                                        <Text className="text-gray-600 text-center mb-4">
                                            Your device is connected but cannot access the internet
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleRefresh}
                                            className="bg-amber-500 px-6 py-3 rounded-full"
                                        >
                                            <Text className="text-white font-semibold">
                                                Check Connection
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    // Normal login view
                                    <>
                                        <Image source={require('../../assets/images/wo_text.png')}
                                            className='rounded-full mb-6'
                                            style={{width: responsive.hp(25), height: responsive.hp(25)}}
                                        />
                                        <Text className="text-2xl font-bold text-gray-800 mb-3 text-center">
                                            Welcome to Rasayana
                                        </Text>
                                        <Text className="text-gray-600 mb-8 text-center">
                                            Sign in to unlock personalized recipe recommendations, 
                                            save your favorites, and keep track of your cooking journey!
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => openWebBrowser(loginUrl)}
                                            className="bg-amber-500 px-8 py-4 rounded-full"
                                        >
                                            <Text className="text-xl font-semibold text-white">
                                                Login to Get Started
                                            </Text>
                                        </TouchableOpacity>
                                        <View className="mt-6 flex-row items-center">
                                            <Ionicons name="star" size={20} color="#f59e0b" />
                                            <Text className="text-gray-600 ml-2">
                                                Join our community of food lovers
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
            <Toast />
        </>
    );
};

export default Account;
