import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    Switch,
    StatusBar,
    Image,
    Alert,
    ActivityIndicator,
    ToastAndroid,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/colors';
import { updateProfilePic } from '@/services/user';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

type DrawerRoute = 'dashboard' | 'live-jobs' | 'job-history' | 'earnings' | 'verification' | 'settings' | 'wallet';

interface ProDrawerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    activeRoute: DrawerRoute;
    isOnline: boolean;
    onToggleOnline: () => void;
}

const MENU_ITEMS: { key: DrawerRoute; label: string; icon: string }[] = [
    { key: 'live-jobs', label: 'Live Jobs', icon: 'flash-outline' },
    { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
    { key: 'job-history', label: 'Job History', icon: 'time-outline' },
    { key: 'earnings', label: 'Earnings', icon: 'bar-chart-outline' },
    { key: 'wallet', label: 'My Wallet', icon: 'wallet-outline' },
    { key: 'verification', label: 'Verification', icon: 'shield-checkmark-outline' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function ProDrawerPanel({
    isOpen,
    onClose,
    activeRoute,
    isOnline,
    onToggleOnline,
}: ProDrawerPanelProps) {
    const router = useRouter();
    const { user, logout, updateUser } = useAuth();
    const [isUploadingPic, setIsUploadingPic] = useState(false);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery permissions are required to select a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedUri = result.assets[0].uri;
            setIsUploadingPic(true);
            try {
                console.log('[ProDrawerPanel] Uploading new profile picture...');
                const profilePicResponse = await updateProfilePic(selectedUri);
                const resObj = profilePicResponse as any;
                const rawUrl = resObj?.image ?? resObj?.profile_pic;
                if (rawUrl) {
                    const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
                    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${BASE}${rawUrl}`;
                    await updateUser({ profile_pic: fullUrl });
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Profile picture updated!', ToastAndroid.SHORT);
                    } else {
                        Alert.alert('Success', 'Profile picture updated successfully!');
                    }
                }
            } catch (err: any) {
                console.error('[ProDrawerPanel] Error uploading profile picture:', err);
                Alert.alert('Upload Error', err.message || 'Failed to update profile picture.');
            } finally {
                setIsUploadingPic(false);
            }
        }
    };

    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isOpen]);

    const navigateTo = (route: DrawerRoute) => {
        onClose();
        setTimeout(() => {
            router.push(`/(protected)/(pro)/${route}` as any);
        }, 250);
    };

    const handleSignOut = async () => {
        onClose();
        await logout();
        router.replace('/');
    };

    const initials = user?.displayName
        ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : 'A';

    if (!isOpen) return null;

    return (
        <View style={StyleSheet.absoluteFill}>
            {/* Overlay */}
            <Animated.View
                style={[styles.overlay, { opacity: overlayAnim }]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Drawer Panel */}
            <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                {/* Header */}
                <View style={styles.drawerHeader}>
                    <View style={styles.brandRow}>
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={styles.brandIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandName}>KaamKarwao</Text>
                    </View>
                    <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                        <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                    </Pressable>
                </View>

                {/* User Info */}
                <View style={styles.userSection}>
                    <View style={styles.avatarWrapper}>
                        {user?.profile_pic ? (
                            <Image source={{ uri: user.profile_pic }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                        )}
                        <Pressable
                            style={styles.editAvatarBtn}
                            onPress={handlePickImage}
                            disabled={isUploadingPic}
                        >
                            {isUploadingPic ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="camera" size={11} color="#FFFFFF" />
                            )}
                        </Pressable>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user?.displayName || 'Professional'}
                        </Text>
                        <Text style={styles.userPhone} numberOfLines={1}>
                            {user?.phoneNumber || ''}
                        </Text>
                    </View>
                </View>

                {/* Online Toggle */}
                <View style={styles.onlineToggleRow}>
                    <Ionicons
                        name={isOnline ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={isOnline ? Colors.pro.accent : Colors.neutral[400]}
                    />
                    <Text style={[styles.onlineLabel, isOnline && styles.onlineLabelActive]}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                    <Switch
                        value={isOnline}
                        onValueChange={onToggleOnline}
                        trackColor={{ false: Colors.neutral[600], true: Colors.pro.accentDim }}
                        thumbColor={Colors.white}
                        style={styles.onlineSwitch}
                    />
                </View>

                <View style={styles.divider} />

                {/* Navigation Items */}
                <View style={styles.navSection}>
                    {MENU_ITEMS.map((item) => {
                        const isActive = item.key === activeRoute;
                        return (
                            <Pressable
                                key={item.key}
                                style={[styles.navItem, isActive && styles.navItemActive]}
                                onPress={() => navigateTo(item.key)}
                                android_ripple={{ color: 'rgba(34,197,94,0.12)' }}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={20}
                                    color={isActive ? Colors.pro.accent : Colors.neutral[400]}
                                />
                                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                                    {item.label}
                                </Text>
                                {isActive && <View style={styles.activeIndicator} />}
                            </Pressable>
                        );
                    })}
                </View>

                {/* Sign Out */}
                <View style={styles.footer}>
                    <View style={styles.divider} />
                    <Pressable
                        style={styles.signOutBtn}
                        onPress={handleSignOut}
                        android_ripple={{ color: 'rgba(239,68,68,0.12)' }}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.signOutLabel}>Sign Out</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: '#0F2318',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 20,
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: (StatusBar.currentHeight ?? 40) + 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.07)',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    brandIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    brandLogoBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.pro.accentDim,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandName: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    closeBtn: {
        padding: 4,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 14,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.pro.accentDim,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: Colors.pro.accent,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#0F2318',
    },
    avatarText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    userPhone: {
        color: Colors.neutral[400],
        fontSize: 13,
    },
    onlineToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
        marginBottom: 20,
    },
    onlineLabel: {
        flex: 1,
        color: Colors.neutral[400],
        fontSize: 14,
        fontWeight: '600',
    },
    onlineLabelActive: {
        color: Colors.pro.accent,
    },
    onlineSwitch: {
        transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginHorizontal: 20,
        marginBottom: 8,
    },
    navSection: {
        flex: 1,
        paddingTop: 8,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 14,
        position: 'relative',
    },
    navItemActive: {
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    navLabel: {
        flex: 1,
        color: Colors.neutral[400],
        fontSize: 15,
        fontWeight: '500',
    },
    navLabelActive: {
        color: Colors.white,
        fontWeight: '600',
    },
    activeIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.pro.accent,
    },
    footer: {
        paddingBottom: 32,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 14,
        marginTop: 8,
    },
    signOutLabel: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '600',
    },
});
