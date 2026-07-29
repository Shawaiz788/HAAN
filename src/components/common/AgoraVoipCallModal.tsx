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
import { generateAgoraToken007 } from '@/utils/agoraTokenBuilder';
import { styles } from '@/styles/agoraVoipCallModal.styles';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID || '2bda4e2f148148928cc66f14545f6136';
const AGORA_APP_CERTIFICATE = process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE || process.env.AGORA_APP_CERTIFICATE || '';
const AGORA_TEMP_TOKEN = process.env.EXPO_PUBLIC_AGORA_TEMP_TOKEN || process.env.AGORA_TEMP_TOKEN || '';

export function getAgoraToken(channelName: string, uid: number = 0): string {
  if (AGORA_TEMP_TOKEN) return AGORA_TEMP_TOKEN;
  if (!AGORA_APP_CERTIFICATE || !AGORA_APP_ID) return '';
  return generateAgoraToken007(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid);
}

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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended' | 'declined'>(initialStatus);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [remoteUid, setRemoteUid] = useState(0);

  const engineRef = useRef<IRtcEngine | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const channelName = `kaamkarwao_task_${taskId || 'live'}`;

  // Sync initialStatus when prop changes (e.g. remote accepted -> 'connected')
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
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  // Duration timer - only when connected
  useEffect(() => {
    if (visible && callStatus === 'connected') {
      timerRef.current = setInterval(() => setDurationSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [visible, callStatus]);

  // Reset state on open
  useEffect(() => {
    if (visible) {
      setCallStatus(initialStatus);
      setDurationSeconds(0);
      setIsMuted(false);
      setIsSpeakerOn(true);
      setRemoteUid(0);
    }
  }, [visible, initialStatus]);

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

        const engine = createAgoraRtcEngine();
        await engine.initialize({
          appId: AGORA_APP_ID,
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
            console.log('[AgoraNative] Joined channel successfully:', channelName);
            setCallStatus('connected');
          },
          onUserJoined: (_connection: RtcConnection, uid: number) => {
            if (!isActive) return;
            console.log('[AgoraNative] Remote user joined:', uid);
            setRemoteUid(uid);
            setCallStatus('connected');
          },
          onUserOffline: (_connection: RtcConnection, uid: number) => {
            if (!isActive) return;
            console.log('[AgoraNative] Remote user left:', uid);
            setRemoteUid(0);
          },
          onError: (err: number, msg: string) => {
            console.warn('[AgoraNative] Engine error:', err, msg);
          },
        };

        engine.registerEventHandler(eventHandler);
        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.enableAudio();

        // Join channel with dynamic token signed by Primary Certificate
        const token = getAgoraToken(channelName, 0);
        console.log('[AgoraNative] Joining channel:', channelName, '| AppID:', AGORA_APP_ID, '| AppCert:', AGORA_APP_CERTIFICATE ? 'Configured' : 'Missing', '| TokenPrefix:', token ? token.substring(0, 10) + '...' : 'EMPTY');
        engine.joinChannel(token, channelName, 0, {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
        });
      } catch (e: any) {
        console.error('[AgoraNative] Exception setup:', e?.message || e);
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

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const initials = (otherUserName || 'User').charAt(0).toUpperCase();
  const hasAvatar = Boolean(otherUserAvatar && otherUserAvatar.trim().length > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleEndCall}>
      <StatusBar barStyle="light-content" backgroundColor="#09101D" />
      <View style={[styles.modalContainer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>In-App Voice Call</Text>
          <Pressable onPress={handleEndCall} style={styles.minimizeBtn} hitSlop={10}>
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
          </Pressable>
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
          <Text style={styles.callStatusText}>
            {callStatus === 'calling'
              ? `Ringing ${otherUserName}...`
              : callStatus === 'connected'
                ? 'In-App Encrypted HD Audio'
                : callStatus === 'declined'
                  ? 'Call Declined'
                  : 'Call Ended'}
          </Text>
          {callStatus === 'connected' && (
            <Text style={styles.timerText}>{formatDuration(durationSeconds)}</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Mute Button */}
          <View style={{ alignItems: 'center' }}>
            <Pressable style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={toggleMute}>
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={28} color={isMuted ? '#09101D' : '#FFFFFF'} />
            </Pressable>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </View>

          {/* End Call Button */}
          <Pressable style={styles.endCallButton} onPress={handleEndCall}>
            <Ionicons name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>

          {/* Speaker Button */}
          <View style={{ alignItems: 'center' }}>
            <Pressable style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]} onPress={toggleSpeaker}>
              <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-medium'} size={28} color={isSpeakerOn ? '#09101D' : '#FFFFFF'} />
            </Pressable>
            <Text style={styles.controlLabel}>Speaker</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default AgoraVoipCallModal;
