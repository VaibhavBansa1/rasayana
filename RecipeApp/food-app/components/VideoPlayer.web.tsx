import React from 'react';
import YouTube from 'react-youtube';
import { View, useWindowDimensions, Platform } from 'react-native';
import { responsive } from '../utils/responsive';

interface VideoPlayerProps {
    videoId: string;
    height?: number;
}

export const VideoPlayer = ({ videoId, height }: VideoPlayerProps) => {
    const { width } = useWindowDimensions();
    const calculatedHeight = height || responsive.hp(30);
    const playerWidth = Platform.OS === 'web' && width > 768 ? '100%' : responsive.wp(92);
    
    return (
        <View style={{ 
            height: calculatedHeight,
            width: playerWidth,
            alignSelf: 'center'
        }}>
            <YouTube
                videoId={videoId}
                opts={{
                    height: calculatedHeight,
                    width: '100%',
                    playerVars: {
                        autoplay: 0,
                        modestbranding: 1,
                        rel: 0
                    },
                }}
            />
        </View>
    );
};