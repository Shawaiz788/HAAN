import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { updateProfilePic } from '@/services/user';

const { width } = Dimensions.get('window');

export type AdminRouteType =
  | 'dashboard'
  | 'unverified-users'
  | 'users'
  | 'pro-detail'
  | 'tasks'
  | 'bids'
  | 'reviews'
  | 'earnings'
  | 'attachments'
  | 'categories'
  | 'masterdata'
  | 'settings';

interface AdminDrawerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: AdminRouteType;
}

export default function AdminDrawerPanel({ isOpen, onClose, activeRoute }: AdminDrawerPanelProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const profilePic = user?.profile_pic;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/(auth)/sign-in');
  };

  const handlePickImage = async () => {
    try {
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
        setIsUploading(true);

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
      }
    } catch (err: any) {
      console.error('[AdminDrawerPanel] Error updating profile picture:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not update profile picture.');
    } finally {
      setIsUploading(false);
    }
  };

  const navItems: Array<{ id: AdminRouteType; label: string; icon: keyof typeof Ionicons.glyphMap; path: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', path: '/(protected)/(admin)/dashboard' },
    { id: 'unverified-users', label: 'CNIC Verifications', icon: 'shield-checkmark', path: '/(protected)/(admin)/unverified-users' },
    { id: 'users', label: 'User Directory', icon: 'people', path: '/(protected)/(admin)/users' },
    { id: 'tasks', label: 'Task Management', icon: 'list', path: '/(protected)/(admin)/tasks' },
    { id: 'bids', label: 'Task Bidding', icon: 'cash', path: '/(protected)/(admin)/bids' },
    { id: 'reviews', label: 'Reviews & Ratings', icon: 'star', path: '/(protected)/(admin)/reviews' },
    { id: 'earnings', label: 'Worker Earnings', icon: 'wallet', path: '/(protected)/(admin)/earnings' },
    { id: 'attachments', label: 'Attachments', icon: 'attach', path: '/(protected)/(admin)/attachments' },
    { id: 'categories', label: 'Categories & Services', icon: 'construct', path: '/(protected)/(admin)/categories' },
    { id: 'masterdata', label: 'Locations & Master Data', icon: 'layers', path: '/(protected)/(admin)/masterdata' },
    { id: 'settings', label: 'Push & Settings', icon: 'settings', path: '/(protected)/(admin)/settings' },
  ];

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.drawer,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandBox}>
              <View style={styles.brandIconBox}>
                <Ionicons name="shield-checkmark" size={22} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.brandTitle}>KaamKarwao</Text>
                <Text style={styles.brandSub}>Admin Control Panel</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* User Profile Card */}
          <View style={styles.userInfoBox}>
            <Pressable style={styles.avatarWrapper} onPress={handlePickImage} disabled={isUploading}>
              {isUploading ? (
                <View style={styles.userAvatarPlaceholder}>
                  <ActivityIndicator size="small" color="#0B5A3E" />
                </View>
              ) : profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.userAvatar} />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Ionicons name="person" size={20} color="#6B7280" />
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={9} color="#FFFFFF" />
              </View>
            </Pressable>

            <View style={styles.userTextCol}>
              <Text style={styles.userName}>{user?.displayName || 'Administrator'}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>System Admin</Text>
              </View>
            </View>
          </View>

          {/* Navigation Scroll */}
          <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.navGroup}>
              {navItems.map((item) => {
                const active = activeRoute === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.navItem, active && styles.navItemActive]}
                    onPress={() => navigateTo(item.path)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? '#0B5A3E' : '#6B7280'}
                    />
                    <Text style={[styles.navText, active && styles.navTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Sign Out */}
          <View style={styles.footer}>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Right Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: width * 0.8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#0B5A3E',
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandSub: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  userInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 14,
    marginVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  avatarWrapper: {
    position: 'relative',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0B5A3E',
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0B5A3E',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0B5A3E',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userTextCol: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#0B5A3E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  navScroll: {
    flex: 1,
  },
  navGroup: {
    gap: 4,
    paddingVertical: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#ECFDF5',
  },
  navText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
  },
  navTextActive: {
    color: '#0B5A3E',
    fontWeight: '700',
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
