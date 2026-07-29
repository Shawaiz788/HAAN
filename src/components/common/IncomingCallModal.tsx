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
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
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
      <StatusBar barStyle="light-content" backgroundColor="#09101D" />
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        {/* Ringing Label */}
        <View style={styles.topSection}>
          <Ionicons name="call" size={24} color="#10B981" style={{ marginBottom: 8 }} />
          <Text style={styles.incomingTitle}>Incoming Voice Call...</Text>
          <Text style={styles.taskLabel}>Task #{callData.taskId}</Text>
        </View>

        {/* Pulsing Avatar */}
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
          <Text style={styles.subText}>In-App Audio HD</Text>
        </View>

        {/* Action Buttons: Decline / Accept */}
        <View style={styles.actionsRow}>
          {/* Decline */}
          <View style={{ alignItems: 'center' }}>
            <Pressable style={styles.declineBtn} onPress={onDecline}>
              <Ionicons name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          {/* Accept */}
          <View style={{ alignItems: 'center' }}>
            <Pressable style={styles.acceptBtn} onPress={onAccept}>
              <Ionicons name="call" size={32} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09101D',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
  },
  incomingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  taskLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  avatarSection: {
    alignItems: 'center',
  },
  ringOuter: {
    width: width * 0.52,
    height: width * 0.52,
    borderRadius: (width * 0.52) / 2,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  ringInner: {
    width: width * 0.42,
    height: width * 0.42,
    borderRadius: (width * 0.42) / 2,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: width * 0.34,
    height: width * 0.34,
    borderRadius: (width * 0.34) / 2,
  },
  avatarPlaceholder: {
    width: width * 0.34,
    height: width * 0.34,
    borderRadius: (width * 0.34) / 2,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  declineBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
});
