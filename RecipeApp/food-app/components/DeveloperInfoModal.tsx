import React from 'react';
import { 
    View, 
    Text, 
    Modal, 
    ScrollView, 
    TouchableOpacity, 
    Linking,
    Image,
    ActivityIndicator, 
    Platform
} from 'react-native';
import { XMarkIcon, GlobeAltIcon } from 'react-native-heroicons/outline';
import { useState, useEffect } from 'react';
import { apiClient } from '../utils/Auth-Request';
import { FontAwesome6 } from '@expo/vector-icons';

interface DeveloperProfile {
    linkedin?: string;
    twitter?: string;
    website?: string;
    [key: string]: string | undefined;
}

interface DeveloperContact {
    email?: string;
    phone?: string;
    [key: string]: string | undefined;
}

interface Developer {
    name: string;
    role: string;
    image: string;
    bio: string;
    contributions: string[];
    skills: string[];
    githubUrl?: string;
    portfolioUrl?: string;
    location?: string;
    experience?: string;
    contact?: DeveloperContact;
    profile?: DeveloperProfile;
}

interface DeveloperInfoModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export default function DeveloperInfoModal({ isVisible, onClose }: DeveloperInfoModalProps) {
    const [loading, setLoading] = useState(true);
    const [developers, setDevelopers] = useState<Developer[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isVisible) {
            fetchDeveloperInfo();
        }
    }, [isVisible]);

    const fetchDeveloperInfo = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get('api/developers/');
            setDevelopers(response.data);
        } catch (error) {
            setError('Failed to load developer information');
            console.error('Error fetching developer info:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLinkPress = async (url: string) => {
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.error('Error opening URL:', error);
        }
    };

    const handleDownloadApp = async () => {
        // Replace this URL with your actual app download link
        apiClient.get('api/download-link/').then((response) => {
            console.log('Download link:', response.data);
            const appUrl = response.data.download_link;
            Linking.openURL(appUrl).catch((error) => {
                console.error('Error opening download link:', error);
            });
        }).catch((error) => {
            console.error('Error fetching download link:', error);
        });
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            {/* Add TouchableOpacity for background press */}
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={onClose} 
                className="flex-1 bg-black/50"
            >
                {/* Add TouchableOpacity to prevent closing when pressing content */}
                <TouchableOpacity 
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()} 
                    className="flex-1 mt-24"
                >
                    <View className="flex-1 bg-white rounded-t-3xl">
                        {/* Header */}
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                            <View className="flex-row items-center flex-1">
                                <Text className="text-xl font-bold text-gray-800 flex-shrink" numberOfLines={1}>
                                    About the Developers
                                </Text>
                                { Platform.OS === 'web' && (
                                    <TouchableOpacity
                                        onPress={handleDownloadApp}
                                        className="ml-4 bg-amber-500 px-4 py-2 rounded-full flex-shrink-0"
                                    >
                                        <Text className="text-white font-medium">Download App</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                className="p-2 rounded-full bg-gray-100 ml-2"
                            >
                                <XMarkIcon size={24} color="#4b5563" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView 
                            className="flex-1 p-4"
                            showsVerticalScrollIndicator={false}
                        >
                            {loading ? (
                                <ActivityIndicator size="large" color="#f59e0b" />
                            ) : error ? (
                                <View className="items-center justify-center p-4">
                                    <Text className="text-red-500 text-center">{error}</Text>
                                    <TouchableOpacity 
                                        onPress={fetchDeveloperInfo}
                                        className="mt-4 bg-amber-500 px-4 py-2 rounded-full"
                                    >
                                        <Text className="text-white">Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                developers.map((developer, index) => (
                                    <View key={index} className="mb-8 bg-white rounded-xl shadow-sm p-4">
                                        <View className="flex-row items-center mb-4">
                                            <Image
                                                source={{ uri: developer.image }}
                                                className="w-16 h-16 rounded-full"
                                            />
                                            <View className="ml-4 flex-1">
                                                <Text className="text-xl font-bold text-gray-800" numberOfLines={1}>
                                                    {developer.name}
                                                </Text>
                                                <Text className="text-gray-600" numberOfLines={1}>
                                                    {developer.role}
                                                </Text>
                                                {developer.location && (
                                                    <Text className="text-gray-500 text-xs" numberOfLines={1}>
                                                        {developer.location}
                                                    </Text>
                                                )}
                                                {developer.experience && (
                                                    <Text className="text-gray-500 text-xs" numberOfLines={1}>
                                                        {developer.experience} experience
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <Text className="text-gray-600 mb-4">
                                            {developer.bio}
                                        </Text>

                                        <View className="mb-4">
                                            <Text className="font-bold text-gray-800 mb-2">
                                                Contributions:
                                            </Text>
                                            {developer.contributions.map((contribution, idx) => (
                                                <Text key={idx} className="text-gray-600 ml-4">
                                                    • {contribution}
                                                </Text>
                                            ))}
                                        </View>

                                        <View className="mb-4">
                                            <Text className="font-bold text-gray-800 mb-2">
                                                Skills:
                                            </Text>
                                            <View className="flex-row flex-wrap">
                                                {developer.skills.map((skill, idx) => (
                                                    <View key={idx} className="bg-amber-100 rounded-full px-3 py-1 mr-2 mb-2">
                                                        <Text className="text-amber-800">
                                                            {skill}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Contact Info */}
                                        {developer.contact && (
                                            <View className="mb-2">
                                                <Text className="font-bold text-gray-800 mb-1">Contact:</Text>
                                                {developer.contact.email && (
                                                    <Text className="text-gray-600 ml-4">Email: {developer.contact.email}</Text>
                                                )}
                                                {developer.contact.phone && (
                                                    <Text className="text-gray-600 ml-4">Phone: {developer.contact.phone}</Text>
                                                )}
                                            </View>
                                        )}

                                        {/* Profile Links */}
                                        {developer.profile && (
                                            <View className="flex-row flex-wrap mt-2">
                                                {developer.profile.linkedin && (
                                                    <TouchableOpacity
                                                        onPress={() => handleLinkPress(developer.profile!.linkedin!)}
                                                        className="flex-row items-center mr-4 mb-2"
                                                    >
                                                        <FontAwesome6 name="linkedin" size={22} color="black" />
                                                        <Text className="ml-2 text-gray-600">LinkedIn</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {developer.profile.twitter && (
                                                    <TouchableOpacity
                                                        onPress={() => handleLinkPress(developer.profile!.twitter!)}
                                                        className="flex-row items-center mr-4 mb-2"
                                                    >
                                                        <FontAwesome6 name="x-twitter" size={22} color="black" />
                                                        <Text className="ml-2 text-gray-600">X</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {developer.profile.website && (
                                                    <TouchableOpacity
                                                        onPress={() => handleLinkPress(developer.profile!.website!)}
                                                        className="flex-row items-center mr-4 mb-2"
                                                    >
                                                        <GlobeAltIcon size={20} color="#4b5563" />
                                                        <Text className="ml-2 text-gray-600">Website</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}

                                        {/* GitHub & Portfolio */}
                                        <View className="flex-row justify-start mt-2">
                                            {developer.githubUrl && (
                                                <TouchableOpacity
                                                    onPress={() => handleLinkPress(developer.githubUrl!)}
                                                    className="flex-row items-center mr-4"
                                                >
                                                    <FontAwesome6 name="github" size={22} color="black" />
                                                    <Text className="ml-2 text-gray-600">GitHub</Text>
                                                </TouchableOpacity>
                                            )}
                                            {developer.portfolioUrl && (
                                                <TouchableOpacity
                                                    onPress={() => handleLinkPress(developer.portfolioUrl!)}
                                                    className="flex-row items-center"
                                                >
                                                    <GlobeAltIcon size={20} color="#4b5563" />
                                                    <Text className="ml-2 text-gray-600">Portfolio</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                            {/* Add bottom padding for better scrolling */}
                            <View className="h-4" />
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}