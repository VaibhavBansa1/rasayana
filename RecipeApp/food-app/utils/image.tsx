import { Image } from 'expo-image';
import React from 'react';

export const CachedImage = ({ uri, ...props }) => {
    return (
        <Image
            source={{ uri }}
            cachePolicy="disk" // Caches images on disk
            transition={300}   // Reduce transition time for smoother experience
            contentFit="cover" // Adjust to fit images efficiently
            {...props}
        />
    );
};
