import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { Drawer } from 'expo-router/drawer';

const primaryTheme = '#f59e0b'
const secondaryTheme = '#ffaf00'

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: primaryTheme },
                tabBarActiveTintColor: secondaryTheme,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Rasāyana',
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color }) => <MaterialIcons size={28} name="search" color={color} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ color }) => <MaterialIcons name="payment" size={24} color={color} />,
                }}
            />

            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Rasāyana Bot',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="chat" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="notification"
                options={{
                    title: 'Notifications',
                    tabBarIcon: ({ color }) => <MaterialIcons name="notifications" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Account',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
