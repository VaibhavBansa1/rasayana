import React from 'react';
import ContentLoader, { Rect } from 'react-content-loader/native';
import { View, Platform } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function RecipeDetailSkeleton() {
  const isWeb = Platform.OS === 'web';
  
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ContentLoader
        speed={2}
        width={isWeb ? '100%' : undefined}
        height={hp(200)}
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
        viewBox={`0 0 ${isWeb ? 1200 : 400} 800`}
      >
        {/* Image */}
        <Rect x="0" y="0" rx="0" ry="0" width="100%" height="300" />
        
        {/* Title */}
        <Rect x="16" y="320" rx="4" ry="4" width="80%" height="32" />
        
        {/* Stats */}
        <Rect x="16" y="370" rx="8" ry="8" width="100" height="40" />
        <Rect x="136" y="370" rx="8" ry="8" width="100" height="40" />
        <Rect x="256" y="370" rx="8" ry="8" width="100" height="40" />
        
        {/* Content */}
        <Rect x="16" y="430" rx="4" ry="4" width="90%" height="100" />
        <Rect x="16" y="550" rx="4" ry="4" width="90%" height="100" />
      </ContentLoader>
    </View>
  );
}