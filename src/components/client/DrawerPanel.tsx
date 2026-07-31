import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppUser } from '@/types';
import { getCustomerReviews } from '@/services/user';

import { useAuth } from '@/context/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface DrawerPanelProps {
  open: boolean;
  onClose: () => void;
  activeTask: any;
  onOpenActiveRequest: () => void;
  onOpenHistory: () => void;
  onSignOut: () => void;
  drawerAnim: Animated.Value;
}

export default function DrawerPanel({
  open,
  onClose,
  activeTask,
  onOpenActiveRequest,
  onOpenHistory,
  onSignOut,
  drawerAnim,
}: DrawerPanelProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    if (reviewCount === null) {
      setLoadingReviews(true);
    }

    getCustomerReviews(user.id)
      .then((reviews) => {
        if (isMounted) {
          setReviewCount(reviews.length);
        }
      })
      .catch((err) => {
        console.error('[DrawerPanel] Error fetching customer reviews:', err);
        if (isMounted && reviewCount === null) {
          setReviewCount(0);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingReviews(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (!open) return null;

  return (
    <>
      {/* Semi-transparent backdrop to close drawer when tapping outside */}
      <Pressable style={styles.drawerBackdrop} onPress={onClose} />

      {/* Slide-out panel container */}
      <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: drawerAnim }] }]}>
        {/* Header section with user avatar, verification, and rating */}
        <View style={[styles.drawerHeader, { paddingTop: insets.top > 0 ? insets.top + 20 : 30 }]}>
          <View style={styles.avatarWrapper}>
            {user?.profile_pic ? (
              <Image source={{ uri: user.profile_pic }} style={styles.drawerAvatarImage} />
            ) : (
              <View style={styles.drawerAvatarCircle}>
                <Text style={styles.drawerAvatarText}>
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <Pressable
              style={styles.editAvatarBtn}
              onPress={() => {
                onClose();
                router.push('/edit-profile');
              }}
            >
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={styles.drawerName}>{user?.displayName || 'App User'}</Text>
          <Text style={styles.drawerPhone}>{user?.phoneNumber || 'No phone registered'}</Text>

          <View style={styles.drawerVerifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={styles.drawerVerifiedLabel}>Verified User</Text>
          </View>

          {/* User Rating & Reviews Pill */}
          <View style={styles.drawerRatingContainer}>
            {loadingReviews ? (
              <ActivityIndicator size="small" color="#F59E0B" style={{ paddingHorizontal: 12, paddingVertical: 2 }} />
            ) : (
              <>
                <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.drawerRatingValue}>
                  {user?.overall_rating != null ? Number(user.overall_rating).toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.drawerRatingCount}>
                  • {reviewCount ?? 0} {reviewCount === 1 ? 'Review' : 'Reviews'}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Menu items navigation list */}
        <View style={[styles.drawerItemsContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
          {activeTask && (
            <Pressable
              style={styles.drawerItem}
              onPress={() => {
                onClose();
                onOpenActiveRequest();
              }}
            >
              <Ionicons name="flash-outline" size={20} color="#10B981" style={styles.drawerItemIcon} />
              <Text style={[styles.drawerItemLabel, { color: '#10B981', fontWeight: '700' }]}>
                Active Request
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.drawerItem}
            onPress={() => {
              onClose();
              onOpenHistory();
            }}
          >
            <Ionicons name="time-outline" size={20} color="#374151" style={styles.drawerItemIcon} />
            <Text style={styles.drawerItemLabel}>Task History</Text>
          </Pressable>

          <Pressable
            style={styles.drawerItem}
            onPress={() => {
              onClose();
              router.push('/edit-profile');
            }}
          >
            <Ionicons name="person-outline" size={20} color="#374151" style={styles.drawerItemIcon} />
            <Text style={styles.drawerItemLabel}>Edit Profile</Text>
          </Pressable>

          <Pressable
            style={styles.drawerItem}
            onPress={() => {
              onClose();
              router.push('/saved-addresses');
            }}
          >
            <Ionicons name="location-outline" size={20} color="#374151" style={styles.drawerItemIcon} />
            <Text style={styles.drawerItemLabel}>Saved Address</Text>
          </Pressable>

          <Pressable
            style={styles.drawerItem}
            onPress={() => {
              onClose();
              router.push('/wallet');
            }}
          >
            <Ionicons name="wallet-outline" size={20} color="#374151" style={styles.drawerItemIcon} />
            <Text style={styles.drawerItemLabel}>My Wallet</Text>
          </Pressable>

          <Pressable
            style={styles.drawerItem}
            onPress={() => {
              onClose();
              router.push('/security-privacy');
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#374151" style={styles.drawerItemIcon} />
            <Text style={styles.drawerItemLabel}>Security & Permissions</Text>
          </Pressable>

          <Pressable
            style={styles.drawerItem}
            onPress={() => {
              onClose();
              router.push('/support-help');
            }}
          >
            <Ionicons name="help-circle-outline" size={20} color="#374151" style={styles.drawerItemIcon} />
            <Text style={styles.drawerItemLabel}>Support & Help</Text>
          </Pressable>

          <View style={styles.drawerDivider} />

          <Pressable style={[styles.drawerItem, styles.logoutItem]} onPress={onSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.drawerItemIcon} />
            <Text style={styles.drawerLogoutLabel}>Sign Out</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.75,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    backgroundColor: '#082C18',
    padding: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  drawerAvatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  drawerAvatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#082C18',
  },
  drawerAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#082C18',
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  drawerPhone: {
    fontSize: 12,
    color: '#A7F3D0',
    marginBottom: 8,
  },
  drawerVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  drawerVerifiedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  drawerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  drawerRatingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerRatingCount: {
    fontSize: 10,
    color: '#D1FAE5',
    marginLeft: 4,
    fontWeight: '500',
  },
  drawerItemsContainer: {
    flex: 1,
    padding: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  drawerItemIcon: {
    marginRight: 14,
    width: 20,
    textAlign: 'center',
  },
  drawerItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  logoutItem: {
    marginTop: 'auto',
  },
  drawerLogoutLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
