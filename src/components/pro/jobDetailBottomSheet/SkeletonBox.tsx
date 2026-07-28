import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface SkeletonBoxProps {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
    width,
    height,
    borderRadius = 4,
    style,
}) => {
    const anim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    return (
        <Animated.View
            style={[
                { width: width as any, height, borderRadius, backgroundColor: '#E2E8F0', opacity: anim },
                style,
            ]}
        />
    );
};
