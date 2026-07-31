import React from 'react';
import { Stack, Redirect, usePathname } from 'expo-router';
import { useAuth } from '@/context/auth';
import { View, ActivityIndicator } from 'react-native';
import { USER_TYPE_PRO } from '@/constants/userTypes';

/**
 * Pro route group layout.
 * Guards: must be logged in AND usertype_id === USER_TYPE_PRO.
 * If unverified, enforces staying on the ID verification screen.
 */
export default function ProLayout() {
    const { user, initializing } = useAuth();
    const pathname = usePathname();

    if (initializing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1A12' }}>
                <ActivityIndicator size="large" color="#22C55E" />
            </View>
        );
    }

    // Not logged in
    if (!user) return <Redirect href="/" />;

    // Profile incomplete
    if (!user.displayName) return <Redirect href="/(protected)/profile-setup" />;

    // Not a pro — redirect to client home
    if (user.usertype_id !== USER_TYPE_PRO) return <Redirect href="/(protected)/(client)/home" />;

    // Unverified professional guard — force redirect to id-verification screen if not verified
    const isVerificationPage = pathname.includes('id-verification');
    const isVerifiedBool = Boolean(user.is_verified);

    if (!isVerifiedBool && !isVerificationPage) {
        return <Redirect href="/(protected)/(pro)/id-verification" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
