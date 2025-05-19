import { useEffect, useState } from "react";
import { View, Alert, Platform} from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import Loading from "../../components/loading";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";
import Ionicons from '@expo/vector-icons/Ionicons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import tw from 'twrnc';
import Entypo from '@expo/vector-icons/Entypo';
import { BASE_URL } from "../../utils/api";
import { responsive } from "../../utils/responsive";

export default function LoginScreen() {
    const route = useRouter();
    const { refresh_token } = useLocalSearchParams();
    const [ loading , setLoading ] = useState(true)
    const [ loginSuccess , setLoginSuccess ] = useState(true)
    const ring1padding = useSharedValue(0);
    const ring2padding = useSharedValue(0);
    const goToHomeAnimation = (loginStatus:boolean) => {
        setLoginSuccess(loginStatus);
        setLoading(false);

        ring1padding.value= 0;
        ring2padding.value= 0;

        setTimeout(()=> ring1padding.value = withSpring(ring1padding.value + responsive.hp(5)) , 100);
        setTimeout(()=> ring2padding.value = withSpring(ring2padding.value + responsive.hp(5.5)) , 200);
        setTimeout(()=> route.replace('/home'), 2500);

    }
    useEffect(() => {
        const fetchTokens = async () => {
            if (refresh_token) {
                try {
                    // Make a POST request to the API endpoint
                    const response = await axios.post(
                        `${BASE_URL}/api/get/refresh/`,
                        { refresh_token }
                    );

                    // Extract the tokens from the response
                    const { access_token, refresh_token: new_refresh_token } = response.data;
                    
                    // Store tokens in Secure Store
                    if (Platform.OS === 'android') { 
                        await SecureStore.setItemAsync("access_token", access_token);
                        await SecureStore.setItemAsync("refresh_token", new_refresh_token);
                    } else if ( Platform.OS === 'web' ) {
                        localStorage.setItem("access_token", access_token)
                        localStorage.setItem("refresh_token", new_refresh_token)
                    } else {
                        console.error('not supported')
                    }

                    goToHomeAnimation(true);
                    
                } catch (error) {
                    console.error("Error refreshing tokens:", error.response?.data || error.message);
                    Alert.alert("Error", "Invalid or expired refresh token. Please try again.");
                    goToHomeAnimation(false);
                }
            }
            if (!refresh_token) {
                setLoading(false);
                route.replace('/home');
                return;
            }
            
        };

        fetchTokens();
    }, [refresh_token]);

    return (
        <View className="bg-amber-500 flex-1 justify-center items-center">
            {
                loading?(
                    <Loading size={60}></Loading>
                ):(
                    <Animated.View 
                        style={[tw`bg-white/20 rounded-full`,
                            {padding: ring2padding, marginBottom: hp(4)}]
                    }>
                        <Animated.View  
                            style={[tw`bg-white/20 rounded-full`,
                                {padding: ring1padding}]
                        }>
                            {
                                loginSuccess?(
                                    <Ionicons name="checkmark-done-circle-outline" size={200} color="white" />
                                ) : (
                                    <Entypo name="circle-with-cross" size={200} color="red" />
                                )
                            }
                        </Animated.View>
                    </Animated.View>
                )
            }
        </View>
    );
}
