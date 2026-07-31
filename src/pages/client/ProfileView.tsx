import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface ProfileViewProps {
  userName: string;
  userEmail: string;
  onSignOut: () => void;
  userAvatar?: string | null;
}

export default function ProfileView({ userName, userEmail, onSignOut, userAvatar }: ProfileViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profileOptions = [
    { icon: 'person-outline', label: 'Edit Profile', color: '#1F2937' },
    { icon: 'calendar-outline', label: 'My Bookings', color: '#1F2937' },
    { icon: 'location-outline', label: 'Saved Address', color: '#1F2937' },
    { icon: 'card-outline', label: 'Payment Methods', color: '#1F2937' },
    { icon: 'shield-checkmark-outline', label: 'Security & Permissions', color: '#1F2937' },
    { icon: 'help-circle-outline', label: 'Support & Help', color: '#1F2937' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header Profile Section */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <Pressable style={styles.editAvatarBtn} onPress={() => router.push('/edit-profile')}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <Text style={styles.nameText}>{userName || 'User Name'}</Text>
          <Text style={styles.emailText}>{userEmail || 'user@example.com'}</Text>

          <View style={styles.verificationBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={styles.verificationText}>Verified User</Text>
          </View>
        </View>
      </View>

      {/* Profile Options List */}
      <View style={styles.optionsContainer}>
        {profileOptions.map((option, index) => (
          <Pressable
            key={index}
            style={styles.optionRow}
            onPress={() => {
              if (option.label === 'Edit Profile') {
                router.push('/edit-profile');
              }
            }}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name={option.icon as any} size={20} color="#4B5563" />
              </View>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        ))}

        {/* Sign Out Option */}
        <Pressable style={[styles.optionRow, styles.signOutRow]} onPress={onSignOut}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIconContainer, styles.signOutIconContainer]}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#EF4444" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#082C18',
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileCard: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#082C18',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#A7F3D0',
    marginBottom: 12,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  signOutRow: {
    borderBottomWidth: 0,
  },
  signOutIconContainer: {
    backgroundColor: '#FEF2F2',
  },
  signOutLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
