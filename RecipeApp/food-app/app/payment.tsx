import { View, Text, TouchableOpacity, Platform, ActivityIndicator, Image, TextInput, ScrollView } from 'react-native';
import React, { useState, useRef } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { apiClient, AuthenticationError, NetworkError } from '../utils/Auth-Request';
import { OrderDetails, PaymentData, RazorpayResponse, CreateOrderRequest, RazorpayOptions, SearchResult } from '../types/payment';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { debounce } from '../utils/debounce';
import axios from 'axios';
import { LocationMap } from '../components/LocationMap';
import { responsive } from '../utils/responsive';
import '../global.css';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const APP_USER_AGENT = 'Rasayana-FoodApp/1.0';

const Payment = () => {
    const { recipeId, servings } = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const addressInputRef = useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            const checkAuth = async () => {
                try {
                    await apiClient.get('api/user/profile/');
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        Toast.show({
                            type: 'info',
                            text1: 'Login Required',
                            text2: 'Please login to make payments',
                        });
                        router.replace('/(tabs)/account');
                    } else if (error instanceof NetworkError) {
                        setError('Network error. Please check your connection.');
                    }
                }
            };
            checkAuth();
        }, [])
    );

    const validatePhoneNumber = (number: string): boolean => {
        try {
            const phoneNumber = parsePhoneNumberFromString(number, 'IN');
            return phoneNumber ? phoneNumber.isValid() : false;
        } catch (error) {
            return false;
        }
    };

    const handlePhoneNumberChange = (text: string) => {
        const numericValue = text.replace(/[^0-9]/g, '');
        if (numericValue.length <= 10) {
            setContactNumber(numericValue);
        }
    };

    const searchAddress = async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const response = await axios({
                method: 'get',
                url: 'https://nominatim.openstreetmap.org/search',
                params: {
                    q: query,
                    format: 'json',
                    addressdetails: '1',
                    countrycodes: 'in',
                    limit: '5',
                    'accept-language': 'en'
                },
                headers: {
                    'User-Agent': APP_USER_AGENT
                }
            });

            const formattedResults: SearchResult[] = response.data.map(item => ({
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                type: item.type,
                address: item.address
            }));

            setSearchResults(formattedResults);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Address search error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to search address'
            });
            setSearchResults([]);
            setShowSuggestions(false);
        }
    };

    const debouncedSearch = React.useCallback(
        debounce((text: string) => {
            searchAddress(text);
        }, 500),
        []
    );

    const handleAddressChange = (text: string) => {
        setDeliveryAddress(text);
        debouncedSearch(text);
    };

    const getCurrentLocation = async () => {
        try {
            setIsLoadingLocation(true);

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({
                    type: 'error',
                    text1: 'Permission Denied',
                    text2: 'Please allow location access'
                });
                return;
            }

            const locationOptions = Platform.select({
                android: {
                    accuracy: Location.Accuracy.High,
                    mayShowUserSettingsDialog: true,
                },
                default: {
                    accuracy: Location.Accuracy.Balanced,
                },
            });

            const location = await Location.getCurrentPositionAsync(locationOptions);
            const { latitude, longitude } = location.coords;

            if (Platform.OS === 'android' && location.coords.accuracy) {
                Toast.show({
                    type: 'info',
                    text1: 'Location Accuracy',
                    text2: `Accurate within ${Math.round(location.coords.accuracy)} meters`,
                });
            }

            if (Platform.OS === 'android') {
                const geoCodeResult = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude
                });

                if (geoCodeResult && geoCodeResult[0]) {
                    const address = geoCodeResult[0];
                    const formattedAddress = [
                        address.street,
                        address.district,
                        address.city,
                        address.region,
                        address.postalCode
                    ].filter(Boolean).join(', ');

                    setDeliveryAddress(formattedAddress);
                    setSelectedLocation({ latitude, longitude });
                }
            } else {
                const response = await axios({
                    method: 'get',
                    url: 'https://nominatim.openstreetmap.org/reverse',
                    params: {
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        format: 'json',
                        addressdetails: '1',
                        'accept-language': 'en'
                    },
                    headers: {
                        'User-Agent': APP_USER_AGENT
                    }
                });

                if (response.data) {
                    const address = response.data.address;
                    const formattedAddress = [
                        address.road,
                        address.suburb,
                        address.city || address.town || address.village,
                        address.state,
                        address.postcode
                    ].filter(Boolean).join(', ');

                    setDeliveryAddress(formattedAddress);
                    setSelectedLocation({ latitude, longitude });

                    if (Platform.OS === 'web') {
                        Toast.show({
                            type: 'info',
                            text1: 'Mobile App Available',
                            text2: 'Download our app for better location accuracy',
                            visibilityTime: 4000,
                        });
                    }
                }
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: Platform.OS === 'web'
                    ? 'Location error. Try using our mobile app for better accuracy'
                    : 'Failed to get location'
            });
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const validateForm = (): boolean => {
        if (!deliveryAddress.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter delivery address',
            });
            return false;
        }

        if (!contactNumber.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter contact number',
            });
            return false;
        }

        if (!validatePhoneNumber(contactNumber)) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter a valid contact number',
            });
            return false;
        }

        return true;
    };

    const createOrder = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            const requestData: CreateOrderRequest = {
                recipe_id: typeof recipeId === 'string' ? parseInt(recipeId) : parseInt(recipeId[0]),
                servings: Number(servings) || 1,
                delivery_address: deliveryAddress,
                contact_number: contactNumber,
                special_instructions: specialInstructions.trim() || undefined
            };
            const response = await apiClient.post('api/payments/create-order/', requestData);
            setOrderDetails(response.data);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                Toast.show({
                    type: 'info',
                    text1: 'Login Required',
                    text2: 'Please login to make payments',
                });
                router.replace('/(tabs)/account');
            } else if (error instanceof NetworkError) {
                setError('Network error. Please check your connection.');
            } else {
                setError((error as Error).message || 'Failed to create order');
            }
        } finally {
            setLoading(false);
        }
    };

    const verifyPayment = async (paymentData: PaymentData) => {
        try {
            await apiClient.post('api/payments/verify-payment/', paymentData);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Payment completed successfully!',
            });
            setTimeout(() => router.push('/(tabs)/orders'), 1000);
        } catch (error) {
            if (error instanceof NetworkError) {
                Toast.show({
                    type: 'error',
                    text1: 'Network Error',
                    text2: 'Please check your connection',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to verify payment',
                });
            }
        }
    };

    const handlePayment = () => {
        if (!orderDetails) return;

        const options: RazorpayOptions = {
            description: `Payment for ${orderDetails.recipe.title}`,
            image: 'https://i.imgur.com/ZYGhmsG.png',
            currency: orderDetails.currency,
            key: orderDetails.key,
            amount: orderDetails.amount * 100,
            name: 'Rasāyana',
            order_id: orderDetails.order_id,
            prefill: {
                email: '',
                contact: contactNumber,
                name: '',
            },
            theme: { color: '#f59e0b' },
            notes: {
                delivery_address: deliveryAddress,
            },
        };

        if (Platform.OS === 'web') {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => {
                const rzp = new window.Razorpay({
                    ...options,
                    handler: (response: RazorpayResponse) => {
                        verifyPayment({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                    },
                });
                rzp.open();
            };
            document.body.appendChild(script);
        } else {
            RazorpayCheckout.open(options)
                .then((data: RazorpayResponse) => {
                    verifyPayment({
                        razorpay_payment_id: data.razorpay_payment_id,
                        razorpay_order_id: data.razorpay_order_id,
                        razorpay_signature: data.razorpay_signature
                    });
                })
                .catch((error: { code: string; description: string }) => {
                    if (error.code !== 'PAYMENT_CANCELLED') {
                        Toast.show({
                            type: 'error',
                            text1: 'Payment Failed',
                            text2: error.description,
                        });
                    }
                });
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#f59e0b" />
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center p-4 bg-white">
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text className="text-red-500 text-center mb-4 mt-2">{error}</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="bg-amber-500 px-6 py-3 rounded-full"
                >
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView 
            className="flex-1 bg-white"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEventThrottle={16}
        >
            <View className="bg-amber-500 pt-8 pb-20 px-4">
                <View className="items-center">
                    <Image
                        source={require('@/assets/images/wo_text.png')}
                        className="w-24 h-24 rounded-full bg-white"
                        style={{ width: responsive.hp(25), height: responsive.hp(25) }}
                    />
                    <Text className="text-white text-xl font-semibold mt-4">
                        Food Order Payment
                    </Text>
                    <Text className="text-white opacity-80">
                        Powered by Razorpay
                    </Text>
                </View>
            </View>

            <View className="px-4 -mt-12">
                <View className="bg-white rounded-xl shadow-lg p-6">
                    {!orderDetails ? (
                        <>
                            <Text className="text-xl font-bold text-gray-800 mb-4">Delivery Details</Text>

                            <View className="mb-4 relative" style={{ zIndex: 1 }}>
                                <Text className="text-gray-600 mb-2">Delivery Address*</Text>

                                {selectedLocation && (
                                    <LocationMap
                                        latitude={selectedLocation.latitude}
                                        longitude={selectedLocation.longitude}
                                    />
                                )}

                                <View className="flex-row items-center relative">
                                    <TextInput
                                        ref={addressInputRef}
                                        className="flex-1 border border-gray-200 rounded-lg p-3 text-gray-700"
                                        placeholder="Enter your delivery address"
                                        value={deliveryAddress}
                                        onChangeText={handleAddressChange}
                                        multiline
                                    />
                                    <TouchableOpacity
                                        onPress={getCurrentLocation}
                                        className="ml-2 p-3 bg-amber-500 rounded-lg"
                                        disabled={isLoadingLocation}
                                    >
                                        {isLoadingLocation ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Ionicons
                                                name="location"
                                                size={24}
                                                color="white"
                                            />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {showSuggestions && searchResults.length > 0 && (
                                    <View
                                        className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg"
                                        style={{ 
                                            zIndex: 9999,
                                            maxHeight: 200,
                                            width: '100%',
                                            elevation: 5, // for Android shadow
                                        }}
                                    >
                                        <ScrollView
                                            nestedScrollEnabled={true}
                                            keyboardShouldPersistTaps="handled"
                                            style={{ 
                                                maxHeight: 200,
                                                backgroundColor: 'white',
                                            }}
                                            showsVerticalScrollIndicator={true}
                                            scrollEventThrottle={16}
                                        >
                                            {searchResults.map((result, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => {
                                                        const formattedAddress = [
                                                            result.address.road,
                                                            result.address.city,
                                                            result.address.state,
                                                            result.address.postcode
                                                        ].filter(Boolean).join(', ');
                                                        setDeliveryAddress(formattedAddress);
                                                        setSelectedLocation({
                                                            latitude: result.lat,
                                                            longitude: result.lon
                                                        });
                                                        setShowSuggestions(false);
                                                        addressInputRef.current?.blur();
                                                    }}
                                                    onBlur={() => setShowSuggestions(false)}
                                                    style={{
                                                        padding: 12,
                                                        borderBottomWidth: 1,
                                                        borderBottomColor: '#e5e7eb',
                                                        backgroundColor: 'white',
                                                    }}
                                                >
                                                    <Text 
                                                        className="text-gray-700 font-medium"
                                                        numberOfLines={1}
                                                    >
                                                        {result.address.road || result.address.city || 'Location'}
                                                    </Text>
                                                    <Text 
                                                        className="text-gray-500 text-sm mt-1"
                                                        numberOfLines={2}
                                                    >
                                                        {result.display_name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            <View className="mb-4">
                                <Text className="text-gray-600 mb-2">Contact Number*</Text>
                                <TextInput
                                    className={`border rounded-lg p-3 text-gray-700 ${contactNumber.length > 0 && !validatePhoneNumber(contactNumber)
                                        ? 'border-red-500'
                                        : 'border-gray-200'
                                    }`}
                                    placeholder="Enter your 10-digit mobile number"
                                    value={contactNumber}
                                    onChangeText={handlePhoneNumberChange}
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                                {contactNumber.length > 0 && !validatePhoneNumber(contactNumber) && (
                                    <Text className="text-red-500 text-sm mt-1">
                                        Please enter a valid 10-digit mobile number
                                    </Text>
                                )}
                            </View>

                            <View className="mb-4">
                                <Text className="text-gray-600 mb-2">Special Instructions</Text>
                                <TextInput
                                    className="border border-gray-200 rounded-lg p-3 text-gray-700"
                                    placeholder="Any special instructions for delivery?"
                                    value={specialInstructions}
                                    onChangeText={setSpecialInstructions}
                                    multiline
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-600 mb-2">Servings</Text>
                                <Text className="font-semibold text-gray-800">{servings || 1}</Text>
                            </View>

                            <TouchableOpacity
                                onPress={createOrder}
                                className="bg-amber-500 py-4 rounded-full"
                            >
                                <Text className="text-white font-semibold text-center text-lg">
                                    Continue to Payment
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View className="border-b border-gray-200 pb-4 mb-4">
                                <Text className="text-gray-600">Order Amount</Text>
                                <Text className="text-3xl font-bold text-gray-800">
                                    ₹{orderDetails.amount}
                                </Text>
                            </View>

                            <View className="space-y-3 mb-6">
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-600">Recipe</Text>
                                    <Text className="font-semibold text-right flex-1 ml-4">
                                        {orderDetails.recipe.title}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-600">Servings</Text>
                                    <Text className="font-semibold">{servings || 1}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-600">Delivery Address</Text>
                                    <Text className="font-semibold text-right flex-1 ml-4">
                                        {orderDetails.delivery_address}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-600">Contact</Text>
                                    <Text className="font-semibold">{orderDetails.contact_number}</Text>
                                </View>
                                {orderDetails.special_instructions && (
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-600">Special Instructions</Text>
                                        <Text className="font-semibold text-right flex-1 ml-4">
                                            {orderDetails.special_instructions}
                                        </Text>
                                    </View>
                                )}
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-600">Payment Method</Text>
                                    <Text className="font-semibold">Razorpay</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handlePayment}
                                className="bg-amber-500 py-4 rounded-full"
                            >
                                <Text className="text-white font-semibold text-center text-lg">
                                    Proceed to Pay
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-4"
                    >
                        <Text className="text-amber-500 text-center">
                            Cancel Order
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="mt-6 items-center mb-6">
                    <View className="flex-row items-center">
                        <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                        <Text className="text-gray-600 ml-2">
                            Secure Payment Gateway
                        </Text>
                    </View>
                </View>
            </View>

            <Toast />
        </ScrollView>
    );
};

export default Payment;