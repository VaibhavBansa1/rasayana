import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Filters, ActiveFilters } from '../types/filters';

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    filters: Filters;
    activeFilters: ActiveFilters;
    onApplyFilters: (filters: ActiveFilters) => void;
}

export default function FilterModal({ 
    visible, 
    onClose, 
    filters, 
    activeFilters, 
    onApplyFilters 
}: FilterModalProps) {
    const [localFilters, setLocalFilters] = useState<ActiveFilters>(activeFilters);

    useEffect(() => {
        setLocalFilters(activeFilters);
    }, [activeFilters]);

    const toggleFlag = (flag: string) => {
        setLocalFilters(prev => ({
            ...prev,
            [flag]: prev[flag] === true ? false : 
                    prev[flag] === false ? null : true
        }));
    };

    const toggleMultiFilter = (key: string, value: string) => {
        setLocalFilters(prev => {
            const currentValues = prev[key] ? String(prev[key]).split(',') : [];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(item => item !== value)
                : [...currentValues, value];
            
            return {
                ...prev,
                [key]: newValues.length > 0 ? newValues.join(',') : undefined
            };
        });
    };

    const toggleOrdering = (order: string) => {
        setLocalFilters(prev => ({
            ...prev,
            ordering: prev.ordering === order ? `-${order}` : order
        }));
    };

    const handleApply = () => {
        // Clean up filters before applying
        const cleanFilters = Object.entries(localFilters).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                acc[key] = value;
            }
            return acc;
        }, {} as ActiveFilters);

        onApplyFilters(cleanFilters);
        onClose();
    };

    const handleClearFilters = () => {
        setLocalFilters({
            vegetarian: localFilters.vegetarian
        });
    };

    // Helper function to format filter names
    const formatFilterName = (name: string) => {
        return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    // Early return if filters is not loaded
    if (!filters) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/50">
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                        <View className="bg-white rounded-t-3xl mt-auto h-[80%]">
                            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                                <Text className="text-xl font-semibold">Filters</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close" size={24} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView className="flex-1 p-4">
                                {/* Dietary Preferences Section */}
                                <View className="mb-6">
                                    <Text className="text-lg font-semibold mb-2">Dietary Preferences</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {filters.flags?.map(flag => (
                                            <TouchableOpacity
                                                key={flag}
                                                onPress={() => toggleFlag(flag)}
                                                className={`px-3 py-2 rounded-full border ${
                                                    localFilters[flag] === true ? 'bg-emerald-500 border-emerald-500' :
                                                    localFilters[flag] === false ? 'bg-red-500 border-red-500' :
                                                    'border-gray-300'
                                                }`}
                                            >
                                                <Text className={`${
                                                    localFilters[flag] !== null ? 'text-slate-900' : 'text-gray-900'
                                                }`}>
                                                    {formatFilterName(flag)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Categories Section */}
                                {[
                                    { title: 'Cuisines', key: 'cuisines__name', data: filters.cuisines },
                                    { title: 'Dish Types', key: 'dishTypes__name', data: filters.dishTypes },
                                    { title: 'Diets', key: 'diets__name', data: filters.diets },
                                    { title: 'Occasions', key: 'occasions__name', data: filters.occasions }
                                ].map(section => (
                                    <View key={section.key} className="mb-6">
                                        <Text className="text-lg font-semibold mb-2">{section.title}</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {section.data?.map(item => (
                                                <TouchableOpacity
                                                    key={item}
                                                    onPress={() => toggleMultiFilter(section.key, item)}
                                                    className={`px-3 py-2 rounded-full border ${
                                                        String(localFilters[section.key] || '').split(',').includes(item)
                                                            ? 'bg-emerald-500 border-emerald-500'
                                                            : 'border-gray-300'
                                                    }`}
                                                >
                                                    <Text className={
                                                        String(localFilters[section.key] || '').split(',').includes(item)
                                                            ? 'text-slate-900'
                                                            : 'text-gray-900'
                                                    }>
                                                        {formatFilterName(item)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}

                                {/* Ordering Section */}
                                <View className="mb-6">
                                    <Text className="text-lg font-semibold mb-2">Sort By</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {filters.ordering?.map(order => (
                                            <TouchableOpacity
                                                key={order}
                                                onPress={() => toggleOrdering(order)}
                                                className={`px-3 py-2 rounded-full border ${
                                                    localFilters.ordering?.replace('-', '') === order
                                                        ? 'bg-emerald-500 border-emerald-500'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                <Text className={
                                                    localFilters.ordering?.replace('-', '') === order
                                                        ? 'text-slate-900'
                                                        : 'text-gray-900'
                                                }>
                                                    {formatFilterName(order)} {localFilters.ordering?.startsWith('-') &&
                                                        localFilters.ordering?.replace('-', '') === order ? '↓' : '↑'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </ScrollView>

                            <View className="p-4 border-t border-gray-200">
                                <View className="flex-row justify-between">
                                    <TouchableOpacity
                                        onPress={handleClearFilters}
                                        className="bg-red-500 py-3 rounded-xl flex-1 mr-2"
                                    >
                                        <Text className="text-white text-center font-semibold">
                                            Clear Filters
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleApply}
                                        className="bg-emerald-500 py-3 rounded-xl flex-1 ml-2"
                                    >
                                        <Text className="text-slate-900 text-center font-semibold">
                                            Apply Filters
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}