import { View, Text } from "react-native";
import { Image } from "expo-image";
import React, { useCallback } from 'react';
import tw from 'twrnc';
import '../global.css'
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { responsive } from '../utils/responsive';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from "expo-router";

const Index = () => {
    const ring1padding = useSharedValue(0);
    const ring2padding = useSharedValue(0);
    const navigation = useRouter();

    useFocusEffect(
        useCallback(()=>{
            ring1padding.value = 0;
            ring2padding.value = 0;

            setTimeout(()=> ring1padding.value = withSpring(ring1padding.value + hp(5)) , 100);
            setTimeout(()=> ring2padding.value = withSpring(ring2padding.value + hp(5.5)) , 200);
            setTimeout(()=> navigation.replace('./(tabs)/home'), 2500);
        },[])
    )
    
    return (
        <View className='bg-amber-500 flex-1 justify-center items-center'>
            <Animated.View 
                style={[tw`bg-white/20 rounded-full`,
                    {padding: ring2padding, marginBottom: responsive.hp(4)}]
                }>
                <Animated.View  
                    style={[tw`bg-white/20 rounded-full`,
                        {padding: ring1padding}]
                    }>
                    <Image source={require('../assets/images/wo_text.png')}
                        cachePolicy={'disk'}
                        style={[tw`rounded-full`,
                            {width: responsive.hp(25), height: responsive.hp(25)}]
                        }/>
                </Animated.View>
            </Animated.View>
            
            <View className='flex items-center'>
                <Text className='font-bold text-white'
                    style={{fontSize: responsive.hp(8)}}>
                    Rasāyana
                </Text>
                <Text className='text-white font-medium'
                    style={{fontSize: responsive.hp(2.25)}}>
                    Nourish Your Taste Buds,
                </Text>
                <Text className='text-white font-medium'
                    style={{fontSize: responsive.hp(2.25)}}>
                    with Home-Made Elixir
                </Text>
            </View>
        </View>
    )
}

export default Index;