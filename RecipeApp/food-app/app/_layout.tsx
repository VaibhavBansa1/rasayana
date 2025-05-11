import { Stack } from "expo-router";
import { SafeAreaProvider } from 'react-native-safe-area-context';

const primaryTheme = "#f59e0b";

const RootLayout = () => {
  return (
    <SafeAreaProvider>

        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: primaryTheme },
            statusBarBackgroundColor: primaryTheme
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="login/index"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen name="(tabs)" options={{
            headerShown: false
          }} />

          <Stack.Screen
            name="recipeDetail"
            options={{
              headerTitle: "Detail",
            }}
          />

          <Stack.Screen
            name="all-recipes"
            options={{
              headerTitle: "All Recipes",
            }}
          />

          <Stack.Screen
            name="payment"
            options={{
              headerTitle: "Payment",
            }}
          />

        </Stack>
    </SafeAreaProvider>

  );
};

export default RootLayout;
