import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { states } from '@/styles/proLiveJobsView.styles';

export function OfflineState() {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    return (
        <View style={states.center}>
            <Animated.View style={[states.pulseCircle, { opacity: pulseAnim }]}>
                <Ionicons name="wifi-outline" size={42} color={Colors.neutral[300]} />
            </Animated.View>
            <Animated.Text style={[states.stateText, { opacity: pulseAnim }]}>
                You are not online.
            </Animated.Text>
            <Text style={states.stateSub}>Toggle online above to start receiving jobs.</Text>
        </View>
    );
}

export function SearchingState({ hasNoJobs }: { hasNoJobs: boolean }) {
    const dotAnim1 = useRef(new Animated.Value(0.3)).current;
    const dotAnim2 = useRef(new Animated.Value(0.3)).current;
    const dotAnim3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = (anim: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                ])
            );

        const l1 = pulse(dotAnim1, 0);
        const l2 = pulse(dotAnim2, 150);
        const l3 = pulse(dotAnim3, 300);

        l1.start();
        l2.start();
        l3.start();

        return () => {
            l1.stop();
            l2.stop();
            l3.stop();
        };
    }, [dotAnim1, dotAnim2, dotAnim3]);

    return (
        <View style={states.center}>
            <View style={states.searchIconBox}>
                <Ionicons name="compass-outline" size={48} color={Colors.brand.medium} />
            </View>
            <Text style={states.stateText}>
                {hasNoJobs ? 'No active jobs available right now' : 'Searching for live jobs...'}
            </Text>
            <Text style={states.stateSub}>
                {hasNoJobs
                    ? 'New customer requests will appear here automatically.'
                    : 'Connecting to customer requests near your area.'}
            </Text>
            <View style={states.dotsRow}>
                <Animated.View style={[states.dot, { opacity: dotAnim1 }]} />
                <Animated.View style={[states.dot, { opacity: dotAnim2 }]} />
                <Animated.View style={[states.dot, { opacity: dotAnim3 }]} />
            </View>
        </View>
    );
}
