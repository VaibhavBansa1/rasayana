import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import React, { useCallback, useState } from 'react';
import { apiClient, AuthenticationError } from '../../utils/Auth-Request';
import { OrderHistory } from '../../types/payment';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function Orders() {
    const [orders, setOrders] = useState<OrderHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrders = async () => {
        try {
            const response = await apiClient.get('api/payments/orders/');
            setOrders(response.data);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                Toast.show({
                    type: 'info',
                    text1: 'Login Required',
                    text2: 'Please login to view orders',
                });
                router.push('/(tabs)/account');
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to fetch orders',
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        },[])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const getStatusColor = (status: OrderHistory['status']) => {
        switch (status) {
            case 'pending':
                return 'text-amber-500';
            case 'preparing':
                return 'text-blue-500';
            case 'delivered':
                return 'text-green-500';
            case 'cancelled':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    const getStatusIcon = (status: OrderHistory['status']) => {
        switch (status) {
            case 'pending':
                return 'time-outline';
            case 'preparing':
                return 'restaurant-outline';
            case 'delivered':
                return 'checkmark-circle-outline';
            case 'cancelled':
                return 'close-circle-outline';
            default:
                return 'help-circle-outline';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#f59e0b" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <FlatList
                data={orders}
                keyExtractor={item => item.order_id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center p-8">
                        <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
                        <Text className="text-gray-500 text-lg mt-4 text-center">
                            No orders yet
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/home')}
                            className="mt-4 bg-amber-500 px-6 py-3 rounded-full"
                        >
                            <Text className="text-white font-semibold">Browse Menu</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => (
                    <View className="bg-white m-4 rounded-xl shadow-sm overflow-hidden">
                        <View className="flex-row">
                            <Image
                                source={{ uri: item.recipe_image }}
                                className="w-24 h-24"
                                resizeMode="cover"
                            />
                            <View className="flex-1 p-4">
                                <Text className="text-lg font-semibold text-gray-800">
                                    {item.recipe_title}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    {format(new Date(item.ordered_at), 'MMM d, yyyy h:mm a')}
                                </Text>
                                <View className="flex-row items-center mt-2">
                                    <Ionicons
                                        name={getStatusIcon(item.status)}
                                        size={16}
                                        color="#4b5563"
                                    />
                                    <Text className={`ml-1 ${getStatusColor(item.status)}`}>
                                        {formatStatus(item.status)}
                                    </Text>
                                </View>
                            </View>
                            <View className="p-4 justify-center">
                                <Text className="text-lg font-bold text-gray-800">
                                    ₹{item.amount}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    {item.servings} servings
                                </Text>
                            </View>
                        </View>
                        
                        <View className="p-4 border-t border-gray-100">
                            <View className="flex-row items-start">
                                <Ionicons name="location-outline" size={16} color="#4b5563" />
                                <Text className="text-gray-600 ml-1 flex-1">
                                    {item.delivery_address}
                                </Text>
                            </View>
                            {item.estimated_delivery_time && (
                                <View className="flex-row items-center mt-2">
                                    <Ionicons name="time-outline" size={16} color="#4b5563" />
                                    <Text className="text-gray-600 ml-1">
                                        Estimated delivery: {format(new Date(item.estimated_delivery_time), 'h:mm a')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            />
            <Toast />
        </View>
    );
} 