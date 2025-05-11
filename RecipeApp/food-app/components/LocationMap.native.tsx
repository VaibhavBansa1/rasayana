import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationMapProps {
    latitude: number;
    longitude: number;
}

export const LocationMap = ({ latitude, longitude }: LocationMapProps) => {
    return (
        <View style={styles.container}>
            <Ionicons name="location" size={24} color="#f59e0b" />
            <Text style={styles.coordinatesText}>
                Selected Location
            </Text>
            <Text style={styles.addressText}>
                {`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 120,
        borderRadius: 8,
        backgroundColor: '#fff8ed',
        borderWidth: 1,
        borderColor: '#fcd34d',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        padding: 16,
    },
    coordinatesText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#92400e',
        marginTop: 8,
    },
    addressText: {
        fontSize: 14,
        color: '#92400e',
        marginTop: 4,
        textAlign: 'center',
    }
});