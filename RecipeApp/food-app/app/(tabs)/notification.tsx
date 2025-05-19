import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Platform, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../../types/notification';
import { apiClient, AuthenticationError } from '../../utils/Auth-Request';
import {
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} from '../../utils/notifications';
import '../../global.css';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const NotificationScreen = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            const checkAuthAndInitialize = async () => {
                try {
                    // Check authentication
                    await apiClient.get('api/user/profile/');
                    // If authenticated, register for notifications
                    await registerForPushNotifications();
                    await loadNotifications();
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        Toast.show({
                            type: 'info',
                            text1: 'Login Required',
                            text2: 'Please login to view notifications'
                        });
                        router.replace("/(tabs)/account");
                    } else {
                        Toast.show({
                            type: 'error',
                            text1: 'Error',
                            text2: 'Failed to load notifications'
                        });
                    }
                }
            };
            checkAuthAndInitialize();
        }, [])
    );

    // Update unread count whenever notifications change
    useEffect(() => {
        const count = notifications?.filter(n => !n.is_read)?.length || 0;
        setUnreadCount(count);
    }, [notifications]);

    const registerForPushNotifications = async () => {
        if (Platform.OS === 'web') return;

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                Toast.show({
                    type: 'error',
                    text1: 'Permission Required',
                    text2: 'Please enable notifications to receive updates'
                });
                return;
            }

            // Get project ID from Constants
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
                throw new Error('Project ID not configured');
            }

            const token = await Notifications.getExpoPushTokenAsync({
                projectId: projectId,
            });

            // Retry logic for sending token to backend
            const maxRetries = 3;
            let retryCount = 0;
            let success = false;

            while (retryCount < maxRetries && !success) {
                try {
                    const response = await apiClient.post('api/notifications/register-push-token/', {
                        push_token: token.data,
                    });
                    
                    if (response.status === 200) {
                        success = true;
                    }
                } catch (err) {
                    retryCount++;
                    if (retryCount === maxRetries) {
                        console.error('Failed to register push token after', maxRetries, 'attempts');
                        Toast.show({
                            type: 'error',
                            text1: 'Notification Setup Failed',
                            text2: 'Please try refreshing the app'
                        });
                    } else {
                        // Wait before retrying (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                    }
                }
            }

            // Configure Android channel
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                    sound: 'notification.wav'
                });
            }

        } catch (err) {
            console.error('Error setting up notifications:', err);
            Toast.show({
                type: 'error',
                text1: 'Notification Setup Failed',
                text2: String(err).slice(0, 50)
            });
        }
    };

    const loadNotifications = async () => {
        try {
            const data = await fetchNotifications();
            setNotifications(data.results);
        } catch (err) {
            setError('Failed to load notifications');
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadNotifications();
        } catch (err) {
            setError('Failed to refresh notifications');
        } finally {
            setRefreshing(false);
        }
    };

    const onMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not mark notification as read'
            });
        }
    };

    const onMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            Toast.show({
                type: 'success',
                text1: 'All notifications marked as read',
                autoHide: true
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not mark all as read'
            });
        }
    };

    const onDelete = async (id: string) => {
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            Toast.show({
                type: 'success',
                text1: 'Notification deleted'
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not delete notification'
            });
        }
    };

    const handleNotificationPress = async (notification: Notification) => {
        // Mark as read if not already read
        if (!notification.is_read) {
            try {
                await onMarkAsRead(notification.id);
            } catch (err) {
                console.error('Error marking notification as read:', err);
            }
        }
        
        // Navigate to recipe detail if available
        if (notification.related_recipe?.id) {
            router.push({
                pathname: "/recipeDetail",
                params: { recipeId: notification.related_recipe.id }
            });
        }
    };

    const renderNotification = ({ item }: { item: Notification }) => (
        <TouchableOpacity 
            onPress={() => handleNotificationPress(item)}
            className={`p-4 border-b border-gray-200 ${!item.is_read ? 'bg-amber-50' : 'bg-white'}`}
        >
            <View className="flex-row space-x-3">
                {/* Notification Icon */}
                <View 
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: getNotificationColor(item.type) + '20'}}
                >
                    <Ionicons 
                        name={getNotificationIcon(item.type)} 
                        size={24}
                        color={getNotificationColor(item.type)} 
                    />
                </View>
                
                {/* Notification Content */}
                <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                        <Text className="text-sm font-semibold text-gray-900">
                            {item.title}
                        </Text>
                        <Text className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </Text>
                    </View>
                    
                    <Text className="text-sm text-gray-600 mt-1">
                        {item.message}
                    </Text>

                    {/* Related Recipe Preview */}
                    {item.related_recipe && (
                        <View className="mt-2 flex-row items-center bg-gray-50 rounded-lg p-2">
                            {(item.related_recipe.image || item.related_recipe.external_image) && (
                                <Image
                                    source={{
                                        uri: item.related_recipe?.external_image ||
                                            item.related_recipe?.image ||
                                            'https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png'
                                    }}
                                    className="w-12 h-12 rounded"
                                    // placeholder={require('../../assets/images/wo_text.png')}
                                />
                            )}
                            <Text className="flex-1 ml-2 text-sm text-gray-700">
                                {item.related_recipe.title}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Delete Button */}
                <TouchableOpacity 
                    onPress={() => onDelete(item.id)}
                    className="ml-2"
                >
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    // Helper functions for notification styling
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like':
                return 'heart';
            case 'milestone':
                return 'trophy';
            case 'confirmation':
                return 'cart';
            case 'system':
                return 'information-circle';
            default:
                return 'notifications';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'like':
                return '#ef4444';  // red
            case 'milestone':
                return '#f59e0b';  // amber
            case 'confirmation':
                return '#10b981';  // emerald
            case 'system':
                return '#3b82f6';  // blue
            default:
                return '#6b7280';  // gray
        }
    };

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                <View className="flex-row items-center">
                    <Text className="text-xl font-bold text-gray-800">Notifications</Text>
                    {unreadCount > 0 && (
                        <View className="ml-2 bg-amber-500 rounded-full px-2 py-1">
                            <Text className="text-white text-sm">{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {notifications?.length > 0 && (
                    <TouchableOpacity
                        onPress={onMarkAllAsRead}
                        className="bg-amber-100 px-3 py-1 rounded-full"
                    >
                        <Text className="text-amber-800">Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {error ? (
                <TouchableOpacity 
                    onPress={handleRefresh}
                    className="flex-1 justify-center items-center p-8"
                >
                    <Ionicons name="alert-circle-outline" size={64} color="#f87171" />
                    <Text className="text-red-600 text-center mt-4">{error}</Text>
                    <View className="flex-row items-center mt-4 bg-red-100 px-4 py-2 rounded-full">
                        <Ionicons name="refresh" size={20} color="#f87171" />
                        <Text className="text-red-600 ml-2">Tap to retry</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={item => item.id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#f59e0b"
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center p-8">
                            <Ionicons name="notifications-outline" size={64} color="#94a3b8" />
                            <Text className="text-gray-600 text-center mt-4">
                                No notifications yet
                            </Text>
                        </View>
                    }
                />
            )}
            <Toast />
        </View>
    );
};

export default NotificationScreen;