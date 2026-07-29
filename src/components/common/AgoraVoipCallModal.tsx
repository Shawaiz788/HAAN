import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '@/styles/agoraVoipCallModal.styles';

const DEFAULT_AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID || '2bda4e2f148148928cc66f14545f6136';

export interface AgoraVoipCallModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: number | string | undefined | null;
  otherUserName: string;
  otherUserAvatar?: string;
  role?: 'customer' | 'pro';
  initialStatus?: 'calling' | 'connected';
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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const webViewRef = useRef<WebView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (visible && initialStatus) {
      setCallStatus(initialStatus);
    }
  }, [visible, initialStatus]);

  // Pulse animation for avatar ring while calling/connecting
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  // Duration timer ONLY starts when call is connected
  useEffect(() => {
    if (visible && callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, callStatus]);

  // Reset state when opening
  useEffect(() => {
    if (visible) {
      setCallStatus(initialStatus);
      setDurationSeconds(0);
      setIsMuted(false);
    }
  }, [visible, initialStatus]);

  if (!visible) return null;

  const handleEndCall = () => {
    setCallStatus('ended');
    onEndCallSignal?.();
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    webViewRef.current?.postMessage(JSON.stringify({ action: 'setMute', muted: nextMuted }));
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const channelName = `kaamkarwao_task_${taskId || 'live'}`;
  const initials = (otherUserName || 'User').charAt(0).toUpperCase();
  const hasAvatar = Boolean(otherUserAvatar && otherUserAvatar.trim().length > 0);

  // Agora WebRTC HTML bundle
  const agoraHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://download.agora.io/sdk/web/AgoraRTC_N-4.20.0.js"></script>
    </head>
    <body>
      <script>
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        let localAudioTrack = null;

        async function startCall() {
          try {
            await client.join("${DEFAULT_AGORA_APP_ID}", "${channelName}", null, null);
            localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await client.publish([localAudioTrack]);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'connected' }));

            client.on("user-published", async (user, mediaType) => {
              await client.subscribe(user, mediaType);
              if (mediaType === "audio") {
                user.audioTrack.play();
              }
            });
          } catch (e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
          }
        }

        window.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'setMute' && localAudioTrack) {
              localAudioTrack.setEnabled(!data.muted);
            }
          } catch(e) {}
        });

        startCall();
      </script>
    </body>
    </html>
  `;

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

        {/* Profile Details & Ambient Pulse */}
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

        {/* Call Action Controls */}
        <View style={styles.controlsContainer}>
          {/* Mute Button */}
          <View style={{ alignItems: 'center' }}>
            <Pressable
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={28}
                color={isMuted ? '#09101D' : '#FFFFFF'}
              />
            </Pressable>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </View>

          {/* End Call Button */}
          <Pressable style={styles.endCallButton} onPress={handleEndCall}>
            <Ionicons name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>

          {/* Speaker Button */}
          <View style={{ alignItems: 'center' }}>
            <Pressable
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}
            >
              <Ionicons
                name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                size={28}
                color={isSpeakerOn ? '#09101D' : '#FFFFFF'}
              />
            </Pressable>
            <Text style={styles.controlLabel}>Speaker</Text>
          </View>
        </View>

        {/* Hidden WebRTC Engine WebView */}
        <View style={styles.hiddenWebView}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: agoraHtml }}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'connected') {
                  setCallStatus('connected');
                }
              } catch (e) { }
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
