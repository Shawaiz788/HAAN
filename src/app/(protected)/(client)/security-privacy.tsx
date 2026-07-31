import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  AppState,
  ToastAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

export default function SecurityPrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // App System Permission States
  const [locationGranted, setLocationGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [mediaGranted, setMediaGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check device system permissions
  const checkAllPermissions = async () => {
    try {
      const loc = await Location.getForegroundPermissionsAsync();
      setLocationGranted(loc.status === 'granted');

      const cam = await ImagePicker.getCameraPermissionsAsync();
      setCameraGranted(cam.status === 'granted');

      const media = await ImagePicker.getMediaLibraryPermissionsAsync();
      setMediaGranted(media.status === 'granted');

      const notif = await Notifications.getPermissionsAsync();
      setNotifGranted(notif.status === 'granted');
    } catch (e) {
      console.warn('[SecurityPrivacy] Error checking permissions:', e);
    }
  };

  useEffect(() => {
    checkAllPermissions();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAllPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        'Unable to Open Settings',
        'Please open your device settings manually and navigate to KaamKrwao permissions.'
      );
    });
  };

  const handleTogglePermission = async (
    type: 'location' | 'camera' | 'media' | 'notifications',
    isGranted: boolean
  ) => {
    if (isGranted) {
      Alert.alert(
        'Disable Permission',
        'To revoke this permission, please turn it off in your device System Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: handleOpenSettings },
        ]
      );
      return;
    }

    try {
      let statusStr = 'undetermined';
      if (type === 'location') {
        const res = await Location.requestForegroundPermissionsAsync();
        statusStr = res.status;
      } else if (type === 'camera') {
        const res = await ImagePicker.requestCameraPermissionsAsync();
        statusStr = res.status;
      } else if (type === 'media') {
        const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
        statusStr = res.status;
      } else if (type === 'notifications') {
        const res = await Notifications.requestPermissionsAsync();
        statusStr = res.status;
      }

      if (statusStr === 'granted') {
        checkAllPermissions();
        if (Platform.OS === 'android') {
          ToastAndroid.show('Permission Granted', ToastAndroid.SHORT);
        }
      } else {
        Alert.alert(
          'Permission Required',
          'Permission request was denied. You can enable it anytime in device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: handleOpenSettings },
          ]
        );
      }
    } catch (e) {
      handleOpenSettings();
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match.');
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      Alert.alert('Success', 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  const renderPermissionRow = (
    type: 'location' | 'camera' | 'media' | 'notifications',
    title: string,
    description: string,
    icon: keyof typeof Ionicons.glyphMap,
    isGranted: boolean
  ) => (
    <View style={styles.switchRow}>
      <View style={styles.switchInfo}>
        <Ionicons name={icon} size={22} color={isGranted ? '#16A34A' : '#6B7280'} style={styles.iconStyle} />
        <View style={{ flex: 1 }}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.switchTitle}>{title}</Text>
            <View style={[styles.statusBadge, isGranted ? styles.badgeGranted : styles.badgeDenied]}>
              <Ionicons
                name={isGranted ? 'checkmark-circle' : 'close-circle'}
                size={12}
                color={isGranted ? '#065F46' : '#991B1B'}
              />
              <Text style={[styles.statusBadgeText, isGranted ? styles.badgeTextGranted : styles.badgeTextDenied]}>
                {isGranted ? 'GRANTED' : 'NOT GRANTED'}
              </Text>
            </View>
          </View>
          <Text style={styles.switchDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={isGranted}
        onValueChange={() => handleTogglePermission(type, isGranted)}
        trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
        thumbColor={isGranted ? '#10B981' : '#F3F4F6'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Security & Privacy</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Permissions Section */}
        <Text style={styles.sectionHeader}>APP PERMISSIONS</Text>
        <View style={styles.card}>
          {renderPermissionRow(
            'location',
            'Location Access',
            'Find nearby service pros & set accurate task location',
            'navigate-outline',
            locationGranted
          )}

          <View style={styles.divider} />

          {renderPermissionRow(
            'camera',
            'Camera Access',
            'Snap photos of job sites & task issues directly',
            'camera-outline',
            cameraGranted
          )}

          <View style={styles.divider} />

          {renderPermissionRow(
            'media',
            'Photos & Gallery',
            'Pick images & documents from gallery for task posts',
            'images-outline',
            mediaGranted
          )}

          <View style={styles.divider} />

          {renderPermissionRow(
            'notifications',
            'Push Notifications',
            'Real-time job updates, bid alerts & chat notifications',
            'notifications-outline',
            notifGranted
          )}

          <View style={styles.divider} />

          <Pressable style={styles.settingsLinkBtn} onPress={handleOpenSettings}>
            <Ionicons name="settings-outline" size={16} color="#0B5A3E" />
            <Text style={styles.settingsLinkText}>Open System Device Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#0B5A3E" />
          </Pressable>
        </View>

        {/* Change Password Section */}
        <Text style={styles.sectionHeader}>CHANGE PASSWORD</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <Pressable
            style={[styles.btn, isChangingPassword && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={isChangingPassword}
          >
            <Text style={styles.btnText}>
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#082C18',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 10,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  iconStyle: {
    marginRight: 12,
    marginTop: 2,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  badgeGranted: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeDenied: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeTextGranted: {
    color: '#065F46',
  },
  badgeTextDenied: {
    color: '#991B1B',
  },
  switchDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 6,
  },
  settingsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    gap: 8,
  },
  settingsLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B5A3E',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 48,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    height: '100%',
  },
  btn: {
    backgroundColor: '#16A34A',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
