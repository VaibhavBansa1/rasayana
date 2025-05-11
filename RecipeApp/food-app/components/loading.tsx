import { View, ActivityIndicator } from 'react-native';
import React from 'react';
import '../global.css';

const Loading = (props) => {
  return (
    <View className='flex-1 flex justify-center items-center'>
        <ActivityIndicator {...props}>

        </ActivityIndicator>
    </View>
  )
}

export default Loading