import { View, Text, Image, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import React from 'react';
import { Link } from 'expo-router';

export interface Recipe {
    id: number;
    title: string;
    image: string | null;
    external_image: string;
    healthScore: number;
    tags: { id: string; name: string }[];
}

interface RecipeCardProps {
    recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
    return (
        <Link 
            href={{
                pathname: `/recipeDetail`,
                params: { recipeId: recipe.id }
            }} 
            asChild
        >
            <TouchableOpacity style={styles.card}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{
                            uri: recipe.image || recipe.external_image ||
                                'https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png'
                        }}
                        style={styles.image}
                    />
                </View>
                <View style={styles.content}>
                    <Text 
                        style={styles.title} 
                        numberOfLines={2}
                    >
                        {recipe.title}
                    </Text>
                    
                    <View style={[
                        styles.healthScoreContainer,
                        {
                            backgroundColor: recipe.healthScore > 66 ? '#D1FAE5' :
                                recipe.healthScore > 33 ? '#FEF3C7' : '#FEE2E2'
                        }
                    ]}>
                        <Text style={[
                            styles.healthScoreText,
                            {
                                color: recipe.healthScore > 66 ? '#065F46' :
                                    recipe.healthScore > 33 ? '#92400E' : '#991B1B'
                            }
                        ]}>
                            Health Score: {recipe.healthScore}
                        </Text>
                    </View>

                    {recipe.tags?.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {recipe.tags.map(tag => (
                                <View 
                                    key={tag.id}
                                    style={styles.tag}
                                >
                                    <Text style={styles.tagText}>
                                        {tag.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Link>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        flex: 1,
        minHeight: 300,
        width: '100%',
        marginBottom: 12,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
        } : {
            elevation: 2,
        })
    },
    imageContainer: {
        width: '100%',
        height: 200,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    content: {
        padding: 12,
        flex: 1,
    },
    title: {
        fontWeight: '600',
        fontSize: 16,
        color: '#1F2937',
        marginBottom: 8,
    },
    healthScoreContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    healthScoreText: {
        fontSize: 12,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -3, // Compensate for tag margins
        marginBottom: -6, // Compensate for bottom margins of tags
    },
    tag: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        margin: 3, // Use margin instead of gap for better cross-platform support
    },
    tagText: {
        fontSize: 12,
        color: '#1D4ED8',
    },
});