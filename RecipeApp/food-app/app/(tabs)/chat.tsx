import '../../global.css';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { Bubble, GiftedChat, IMessage, Send } from 'react-native-gifted-chat';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { apiClient, AuthenticationError, NetworkError } from '../../utils/Auth-Request';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetProvider, useActionSheet } from '@expo/react-native-action-sheet';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { Image } from 'expo-image';
import * as WebBrowser from "expo-web-browser";
import { Tabs } from "expo-router";
import { BASE_URL } from "../../utils/api";

const CustomActions = ({ onPressActionButton }: { onPressActionButton: () => void }) => {
    return (
        <TouchableOpacity
            onPress={onPressActionButton}
            style={{
                height: 40,
                width: 40,
                marginBottom: 4,
                marginLeft: 8,
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <Ionicons name="image-outline" size={24} color="#f59e0b" />
        </TouchableOpacity>
    );
};

const BOT_USER = {
    _id: 2,
    name: 'Rasayana Bot',
    avatar: 'https://i.imgur.com/ZYGhmsG.png'
};

const USER = {
    _id: 1
};

function Chat() {
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { userQuery, recipeId, recipeName } = useLocalSearchParams();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Authentication check with error handling
    useFocusEffect(
        useCallback(() => {
            const checkAuth = async () => {
                try {
                    await apiClient.get('api/user/profile/');
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        Toast.show({
                            type: 'info',
                            text1: 'Login Required',
                            text2: 'Please login to use Chat'
                        });
                        router.replace("/(tabs)/account");
                    } else if (error instanceof NetworkError) {
                        Toast.show({
                            type: 'error',
                            text1: 'Network Error',
                            text2: 'Please check your connection',
                        });
                    }
                }
            };
            checkAuth();
        }, [])
    );

    // Format messages for context
    const formatMessagesForContext = (msgs: IMessage[]) => {
        return msgs.map(msg =>
            `${msg.user._id === USER._id ? 'User' : 'Assistant'}: ${msg.text}`
        ).join('\n');
    };

    // Initialize chat with greeting and user query if provided
    useEffect(() => {
        const initializeChat = async () => {
            const initialMessages: IMessage[] = [{
                _id: 1,
                text: 'Hi, Rasayana Bot Here! How can I help you today?',
                createdAt: new Date(),
                user: BOT_USER,
            }];

            if (userQuery) {
                const userMessage = {
                    _id: 2,
                    text: userQuery.toString(),
                    createdAt: new Date(),
                    user: USER,
                };
                initialMessages.unshift(userMessage);
                setMessages(initialMessages);
                // Send initial query to API with context
                await sendToAPI(userQuery.toString(), [initialMessages[0]]);
            } else {
                setMessages(initialMessages);
            }
        };

        initializeChat();
    }, [userQuery]);

    const sendToAPI = async (text: string, previousMessages: IMessage[]) => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const payload = {
                user_query: text,
                context: formatMessagesForContext(previousMessages),
                ...(recipeId && { recipe_id: parseInt(recipeId.toString()) })
            };

            const response = await apiClient.post('api/chat/', payload);

            // Add bot response
            const botMessage: IMessage = {
                _id: Math.random(),
                text: response.data.message,
                createdAt: new Date(),
                user: BOT_USER,
            };

            // Handle recipe responses
            if (response.data.recipes) {
                response.data.recipes.forEach((recipe: any) => {
                    const recipeText = `
🍳 ${recipe.title}

Ingredients:
${recipe.ingredients.map((ing: string) => `• ${ing}`).join('\n')}

Instructions:
${recipe.instructions}
`;
                    const recipeMessage: IMessage = {
                        _id: Math.random(),
                        text: recipeText,
                        createdAt: new Date(),
                        user: BOT_USER,
                    };
                    setMessages(previousMessages =>
                        GiftedChat.append(previousMessages, [recipeMessage])
                    );
                });
            }

            // Handle single recipe response
            if (response.data.recipe) {
                const recipe = response.data.recipe;
                const recipeText = `
🍳 ${recipe.title}

Ingredients:
${recipe.ingredients.map((ing: string) => `• ${ing}`).join('\n')}

Instructions:
${recipe.instructions}
`;
                const recipeMessage: IMessage = {
                    _id: Math.random(),
                    text: recipeText,
                    createdAt: new Date(),
                    user: BOT_USER,
                };
                setMessages(previousMessages =>
                    GiftedChat.append(previousMessages, [recipeMessage])
                );
            }

            setMessages(previousMessages =>
                GiftedChat.append(previousMessages, [botMessage])
            );

        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to get response',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendImage = async (imageUri: string) => {
        setIsLoading(true);
        try {
            // Create form data
            const formData = new FormData();

            // For web, we need to handle the file differently
            if (Platform.OS === 'web') {
                // Convert the image URI to a blob
                const response = await fetch(imageUri);
                const blob = await response.blob();
                formData.append('image', blob, 'recipe_image.jpg');
            } else {
                // For mobile, append the image file
                const imageName = imageUri.split('/').pop();
                const imageType = imageName?.includes('.png') ? 'image/png' : 'image/jpeg';
                
                formData.append('image', {
                    uri: imageUri,
                    type: imageType,
                    name: imageName || 'recipe_image.jpg',
                } as any);
            }

            // Append other data
            formData.append('user_query', "What's in this recipe image?");
            formData.append('context', formatMessagesForContext(messages));

            // Use upload method instead of post
            const response = await apiClient.upload('api/chat/image/', formData);

            // Add user's image message
            const userMessage: IMessage = {
                _id: Math.random(),
                text: "Can you analyze this recipe image?",
                createdAt: new Date(),
                user: USER,
                image: imageUri
            };

            // Add bot's response
            const botMessage: IMessage = {
                _id: Math.random(),
                text: response.data.message,
                createdAt: new Date(),
                user: BOT_USER,
                image: imageUri
            };

            setMessages(previousMessages =>
                GiftedChat.append(previousMessages, [botMessage, userMessage])
            );

        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to process image',
            });
        } finally {
            setIsLoading(false);
        }
    };


    const handleClearChat = () => {
        setMessages([{
            _id: Math.random(),
            text: 'Hi, Rasayana Bot Here! How can I help you today?',
            createdAt: new Date(),
            user: BOT_USER,
        }]);
        router.replace('/(tabs)/chat')
    };

    const onSend = useCallback((newMessages: IMessage[] = []) => {
        setMessages(previousMessages => {
            const updatedMessages = GiftedChat.append(previousMessages, newMessages);
            // Send message with full conversation history
            sendToAPI(newMessages[0].text, updatedMessages);
            return updatedMessages;
        });
    }, []);

    const { showActionSheetWithOptions } = useActionSheet();

    const handleImagePick = async () => {
        const options = ['Take Photo', 'Choose from Gallery', 'Cancel'];
        const cancelButtonIndex = 2;

        showActionSheetWithOptions({
            options,
            cancelButtonIndex,
        }, async (selectedIndex) => {
            let result;

            try {
                if (selectedIndex === 0) {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        Toast.show({
                            type: 'error',
                            text1: 'Camera permission needed',
                        });
                        return;
                    }
                    result = await ImagePicker.launchCameraAsync({
                        mediaTypes: "images",
                        allowsEditing: true,
                        aspect: [4, 3],
                        quality: 0.7,
                    });
                } else if (selectedIndex === 1) {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        Toast.show({
                            type: 'error',
                            text1: 'Gallery permission needed',
                        });
                        return;
                    }
                    result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: "images",
                        allowsEditing: true,
                        aspect: [4, 3],
                        quality: 0.7,
                    });
                }

                if (!result?.canceled && result?.assets[0]?.uri) {
                    await handleSendImage(result.assets[0].uri);
                }
            } catch (error) {
                Toast.show({
                    type: 'error',
                    text1: 'Error picking image',
                    text2: 'Please try again',
                });
            }
        });
    };

    const handleImagePress = (imageUri: string) => {
        setSelectedImage(imageUri);
        setModalVisible(true);
    };

    const openWebBrowser = async (URL: string) => {
        try {
            await WebBrowser.openBrowserAsync(URL, {
                toolbarColor: "#f59e0b",
                createTask: false,
                showInRecents: false,
                controlsColor: "#f59e0b",
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not open browser',
            });
        }
    };
    

    return (
        <View className="flex-1 bg-white">
            <Tabs.Screen
                options={{
                    headerRight: () => (
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                className="mr-3 rounded-xl bg-amber-200 p-2"
                                onPress={()=>openWebBrowser(`${BASE_URL}/personalization/`)}
                            >
                                <Text className="text-sm">Personalize</Text>
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            
            <GiftedChat
                messages={messages}
                onSend={onSend}
                user={USER}
                renderAvatar={null}
                isLoadingEarlier={isLoading}
                renderLoading={() => <View className="flex-1 justify-center items-center" />}
                placeholder="Type your message here..."
                alwaysShowSend
                scrollToBottom
                infiniteScroll={false}
                renderBubble={(props) => (
                    <Bubble
                        {...props}
                        wrapperStyle={{
                            right: {
                                backgroundColor: '#f59e0b',
                                marginVertical: 5,
                            },
                            left: {
                                backgroundColor: '#f3f4f6',
                                marginVertical: 5,
                            },
                        }}
                        textStyle={{
                            right: { color: '#ffffff' },
                            left: { color: '#1f2937' },
                        }}
                        renderMessageImage={(imageProps) => (
                            <TouchableOpacity onPress={() => imageProps.currentMessage?.image && handleImagePress(imageProps.currentMessage.image)}>
                                <Image
                                    source={{ uri: imageProps.currentMessage?.image }}
                                    style={{ width: 200, height: 200, borderRadius: 5 }}
                                    contentFit="contain"
                                />
                            </TouchableOpacity>
                        )}
                    />
                )}
                renderActions={() => (
                    <CustomActions onPressActionButton={handleImagePick} />
                )}
                renderSend={(props) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Send
                            {...props}
                            textStyle={{
                                color: 'white'
                            }}
                            containerStyle={{
                                backgroundColor: '#f59e0b',
                                borderRadius: 10,
                                marginHorizontal: 4
                            }}
                        />
                    </View>
                )}
                renderChatFooter={() => (
                    <>
                        <View className="px-4 py-2 bg-gray-50">
                            <View className="flex-row justify-between items-center mb-1">
                                <View className="flex-row items-center">
                                    <TouchableOpacity
                                        onPress={handleClearChat}
                                        className="bg-gray-200 rounded-full py-2 px-4 flex-row items-center"
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#4b5563" />
                                        <Text className="text-gray-600 ml-1 text-sm">Clear Chat</Text>
                                    </TouchableOpacity>
                                    {isLoading && (
                                        <View className="ml-2">
                                            <LoadingIndicator />
                                        </View>
                                    )}
                                </View>

                                {recipeId && recipeName && (
                                    <Text
                                        className="text-gray-700 font-medium text-right flex-1 ml-4"
                                        numberOfLines={1}
                                    >
                                        {recipeName.toString().length > 30
                                            ? recipeName.toString().substring(0, 35) + '...'
                                            : recipeName.toString()
                                        }
                                    </Text>
                                )}
                            </View>
                            <View className="flex-row justify-center">
                                <Text className="text-gray-500 text-xs mt-1">
                                    Send a message or upload a recipe image to get started
                                </Text>
                            </View>
                        </View>
                    </>
                )}
            />
            <Modal
                visible={modalVisible}
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
                animationType="slide"
            >
                <TouchableOpacity 
                    style={styles.centeredView}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalView}>
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.modalImage}
                            contentFit="contain"
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
            <Toast />
        </View>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalView: {
        margin: 5,
        backgroundColor: '#151515',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ddaff0',
        shadowOffset: {
            width: 2,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        padding: 5,
    },
    modalImage: {
        width: 350,
        height: 400,
    },
});

// Modify the export
export default function ChatScreen() {
    return (
        <ActionSheetProvider>
            <Chat />
        </ActionSheetProvider>
    );
}