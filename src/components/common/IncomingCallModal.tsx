import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export interface IncomingCallData {
  taskId: number | string;
  callerName: string;
  callerAvatar?: string;
}

export interface IncomingCallModalProps {
  visible: boolean;
  callData: IncomingCallData | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({
  visible,
  callData,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  if (!visible || !callData) return null;

  const initials = (callData.callerName || 'User').charAt(0).toUpperCase();
  const hasAvatar = Boolean(callData.callerAvatar && callData.callerAvatar.trim().length > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDecline}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.modalContainer}>
        <View style={[styles.contentContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]}>
          {/* Header Section */}
          <View style={styles.topSection}>
            <View style={styles.brandBadge}>
              <Ionicons name="call" size={16} color="#10B981" />
              <Text style={styles.brandBadgeText}>INCOMING VOICE CALL</Text>
            </View>
            <View style={styles.taskBadge}>
              <Text style={styles.taskLabel}>Task #{callData.taskId}</Text>
            </View>
          </View>

          {/* Pulsing Avatar & Caller Info */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.ringOuter, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.ringInner}>
                {hasAvatar ? (
                  <Image source={{ uri: callData.callerAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            <Text style={styles.callerName}>{callData.callerName}</Text>

            <View style={styles.hdStatusPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.subText}>In-App Audio HD</Text>
            </View>
          </View>

          {/* Action Buttons: Decline / Accept - Perfectly Aligned Columns */}
          <View style={styles.actionsCard}>
            {/* Decline Column */}
            <View style={styles.actionCol}>
              <Pressable style={styles.declineBtn} onPress={onDecline}>
                <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </Pressable>
              <Text style={styles.actionLabel}>Decline</Text>
            </View>

            {/* Accept Column */}
            <View style={styles.actionCol}>
              <Pressable style={styles.acceptBtn} onPress={onAccept}>
                <Ionicons name="call" size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.actionLabel}>Accept</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1,
  },
  taskBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  taskLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  ringOuter: {
    width: width * 0.54,
    height: width * 0.54,
    borderRadius: (width * 0.54) / 2,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  ringInner: {
    width: width * 0.44,
    height: width * 0.44,
    borderRadius: (width * 0.44) / 2,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: width * 0.36,
    height: width * 0.36,
    borderRadius: (width * 0.36) / 2,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  avatarPlaceholder: {
    width: width * 0.36,
    height: width * 0.36,
    borderRadius: (width * 0.36) / 2,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  hdStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  subText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  actionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 36,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  actionCol: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  declineBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  acceptBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },
});
