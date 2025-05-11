import React from 'react';
import { View, StyleSheet, Text, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationMapProps {
    latitude: number;
    longitude: number;
}

export const LocationMap = ({ latitude, longitude }: LocationMapProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.warningBanner}>
                <Ionicons name="information-circle" size={20} color="#92400e" />
                <Text style={styles.warningText}>
                    For better accuracy, please use our mobile app
                </Text>
            </View>
            <iframe
                width="100%"
                height="calc(100% - 40px)"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01}%2C${latitude-0.01}%2C${longitude+0.01}%2C${latitude+0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                style={{ border: 'none' }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff8ed',
        padding: 8,
        gap: 8,
    },
    warningText: {
        color: '#92400e',
        fontSize: 14,
    }
});