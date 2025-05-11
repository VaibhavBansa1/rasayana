import { Dimensions, Platform } from 'react-native';

export const responsive = {
  hp: (height: number) => {
    if (Platform.OS === 'web') {
      return `${height}vh`;
    }
    const { heightPercentageToDP } = require('react-native-responsive-screen');
    return heightPercentageToDP(height);
  },
  wp: (width: number) => {
    if (Platform.OS === 'web') {
      return `${width}vw`;
    }
    const { widthPercentageToDP } = require('react-native-responsive-screen');
    return widthPercentageToDP(width);
  },
  size: (size: number) => {
    if (Platform.OS === 'web') {
      return size;
    }
    const { width } = Dimensions.get('window');
    const baseWidth = 375;
    return (width / baseWidth) * size;
  }
};