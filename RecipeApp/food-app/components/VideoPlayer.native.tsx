import React from 'react';
import YoutubeIframe from 'react-native-youtube-iframe';
import { View } from 'react-native';

interface VideoPlayerProps {
    videoId: string;
    height: number;
}

export const VideoPlayer = ({ videoId, height }: VideoPlayerProps) => {
    return (
        <View style={{
            height: height - 50
         }}>
            <YoutubeIframe
                height={height - 50}
                videoId={videoId}
                play={false}
                webViewProps={{
                    allowsFullscreenVideo: true
                }}
            />
        </View>
    );
};