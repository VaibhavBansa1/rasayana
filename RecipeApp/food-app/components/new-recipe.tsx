import React from 'react';
import { View, RefreshControl, useWindowDimensions, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import RecipeCard, { Recipe } from './new-recipe-card';

interface NewRecipesProps {
    data: Recipe[];
    isLoading: boolean;
    onLoadMore: () => void;
    refreshing: boolean;
    onRefresh: () => void;
    error: string | null;
    ListEmptyComponent?: React.ComponentType<any>;
}

export default function NewRecipes({
    data,
    isLoading,
    onLoadMore,
    refreshing,
    onRefresh,
    error,
    ListEmptyComponent,
}: NewRecipesProps) {
    const { width } = useWindowDimensions();

    const getNumColumns = () => {
        if (Platform.OS !== 'web') return 1;
        if (width > 1600) return 4;
        if (width > 1200) return 3;
        if (width > 768) return 2;
        return 1;
    };

    const getItemWidth = () => {
        const numColumns = getNumColumns();
        const padding = 16; // total horizontal padding
        const gap = 16 * (numColumns - 1); // gap between items
        const availableWidth = width - padding - gap;
        return availableWidth / numColumns;
    };

    const renderItem = ({ item }: { item: Recipe }) => (
        <View style={{ 
            width: Platform.OS === 'web' ? getItemWidth() : '100%',
            padding: 8,
            flex: 1, // ensure proper stretching
        }}>
            <RecipeCard recipe={item} />
        </View>
    );

    return (
        <FlashList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            estimatedItemSize={300}
            numColumns={getNumColumns()}
            key={getNumColumns()} // to force re-render on column count change
            contentContainerStyle={{
                padding: 8,
                // Allowed props: padding and backgroundColor (if needed), so remove gap/alignItems here
            }}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.1}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={ListEmptyComponent}
        />
    );
}