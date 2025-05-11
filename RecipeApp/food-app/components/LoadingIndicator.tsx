import React from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const LoadingIndicator = () => {
    const spinValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: Platform.OS !== 'web', // Disable native driver for web
            })
        ).start();
    }, []);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="restaurant" size={25} color="#f59e0b" />
        </Animated.View>
    );
};