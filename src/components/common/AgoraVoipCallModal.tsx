import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
  StatusBar,
  Animated,
  Easing,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcConnection,
  IRtcEngineEventHandler,
} from 'react-native-agora';
import { useAuth } from '@/context/auth';
import { fetchAgoraCallToken, getAgoraAppId } from '@/services/agoraService';
import { logger } from '@/utils/logger';
import { styles } from '@/styles/agoraVoipCallModal.styles';

export interface AgoraVoipCallModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: number | string | undefined | null;
  otherUserName: string;
  otherUserAvatar?: string;
  role?: 'customer' | 'pro';
  initialStatus?: 'calling' | 'connected' | 'ended' | 'declined';
  onEndCallSignal?: () => void;
}

export function AgoraVoipCallModal({
  visible,
  onClose,
  taskId,
  otherUserName,
  otherUserAvatar,
  role = 'customer',
  initialStatus = 'calling',
  onEndCallSignal,
}: AgoraVoipCallModalProps) {
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended' | 'declined'>(initialStatus);
  const [remoteUid, setRemoteUid] = useState(0);

  const engineRef = useRef<IRtcEngine | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const channelName = `kaamkarwao_task_${taskId || 'live'}`;

  // Sync initialStatus when prop changes
  useEffect(() => {
    if (visible && initialStatus) {
      setCallStatus(initialStatus);
    }
  }, [visible, initialStatus]);

  // Pulse animation for avatar ring
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  // Reset state on open
  useEffect(() => {
    if (visible) {
      setCallStatus(initialStatus);
      setIsMuted(false);
      setIsSpeakerOn(false);
      setRemoteUid(0);
    }
  }, [visible, initialStatus]);

  const { user } = useAuth();
  const currentUserId = Number(user?.id) || 0;

  // Initialize and join Agora native engine when modal opens
  useEffect(() => {
    if (!visible || !taskId) return;

    let isActive = true;

    const setupEngine = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
        }

        // Retrieve dynamic call token & metadata from backend: GET /app/message/room/${taskId}/call-token/
        const tokenData = await fetchAgoraCallToken(taskId, user?.token);
        if (!isActive) return;

        const targetAppId = tokenData.app_id || getAgoraAppId();
        const targetChannel = tokenData.channel_name || channelName;

        const engine = createAgoraRtcEngine();
        await engine.initialize({
          appId: targetAppId,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
        if (!isActive) {
          engine.release();
          return;
        }
        engineRef.current = engine;

        const eventHandler: IRtcEngineEventHandler = {
          onJoinChannelSuccess: (_connection: RtcConnection) => {
            if (!isActive) return;
            logger.log('[AgoraVoip] Joined channel successfully:', targetChannel, 'as UID:', currentUserId);
            // Local user connected to channel - wait for remote user to join before showing 'connected'
          },
          onUserJoined: (_connection: RtcConnection, uid: number) => {
            if (!isActive) return;
            logger.log('[AgoraVoip] Remote user joined:', uid);
            setRemoteUid(uid);
            setCallStatus('connected');
          },
          onUserOffline: (_connection: RtcConnection, uid: number) => {
            if (!isActive) return;
            logger.log('[AgoraVoip] Remote user left:', uid);
            setRemoteUid(0);
          },
          onError: (err: number, msg: string) => {
            logger.warn('[AgoraVoip] Engine error:', err, msg);
          },
        };

        engine.registerEventHandler(eventHandler);
        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.enableAudio();
        engine.setEnableSpeakerphone(false);

        logger.log('[AgoraVoip] Joining channel:', targetChannel, 'with UID:', currentUserId);
        engine.joinChannel(tokenData.token, targetChannel, currentUserId, {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
        });
      } catch (e: any) {
        logger.error('[AgoraVoip] Exception during engine setup:', e?.message || e);
      }
    };

    setupEngine();

    return () => {
      isActive = false;
      if (engineRef.current) {
        try {
          engineRef.current.leaveChannel();
          engineRef.current.release();
        } catch (e) { }
        engineRef.current = null;
      }
    };
  }, [visible, channelName, taskId]);

  if (!visible) return null;

  const handleEndCall = () => {
    setCallStatus('ended');
    if (engineRef.current) {
      try {
        engineRef.current.leaveChannel();
        engineRef.current.release();
      } catch (e) { }
      engineRef.current = null;
    }
    onEndCallSignal?.();
    setTimeout(() => onClose(), 400);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    engineRef.current?.muteLocalAudioStream(next);
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    engineRef.current?.setEnableSpeakerphone(next);
  };

  const initials = (otherUserName || 'User').charAt(0).toUpperCase();
  const hasAvatar = Boolean(otherUserAvatar && otherUserAvatar.trim().length > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleEndCall}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.modalContainer}>
        <View style={[styles.contentContainer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleEndCall} style={styles.minimizeBtn} hitSlop={10}>
              <Ionicons name="chevron-down" size={22} color="#374151" />
            </Pressable>

            <View style={styles.brandHeaderPill}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.headerTitle}>KaamKarwao Voice Call</Text>
            </View>

            <View style={{ width: 38 }} />
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <Animated.View style={[styles.avatarRingOuter, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.avatarRingInner}>
                {hasAvatar ? (
                  <Image source={{ uri: otherUserAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            <Text style={styles.userName}>{otherUserName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role === 'pro' ? 'Professional Provider' : 'Customer'}</Text>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.callStatusText}>
                {callStatus === 'calling'
                  ? `Ringing ${otherUserName}...`
                  : callStatus === 'connected'
                    ? 'In-App Encrypted HD Audio'
                    : callStatus === 'declined'
                      ? 'Call Declined'
                      : 'Call Ended'}
              </Text>
            </View>
          </View>

          {/* Controls Bar - Perfectly Aligned Columns */}
          <View style={styles.controlsCard}>
            {/* Mute Column */}
            <View style={styles.controlCol}>
              <Pressable
                style={[styles.controlButton, isMuted && styles.controlButtonMuted]}
                onPress={toggleMute}
              >
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={26} color={isMuted ? '#FFFFFF' : '#374151'} />
              </Pressable>
              <Text style={styles.controlLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
            </View>

            {/* End Call Column */}
            <View style={styles.controlCol}>
              <Pressable style={styles.endCallButton} onPress={handleEndCall}>
                <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </Pressable>
              <Text style={styles.controlLabel}>End</Text>
            </View>

            {/* Speaker Column */}
            <View style={styles.controlCol}>
              <Pressable
                style={[styles.controlButton, isSpeakerOn && styles.controlButtonSpeakerOn]}
                onPress={toggleSpeaker}
              >
                <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-medium'} size={26} color={isSpeakerOn ? '#FFFFFF' : '#374151'} />
              </Pressable>
              <Text style={styles.controlLabel}>Speaker</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default AgoraVoipCallModal;
