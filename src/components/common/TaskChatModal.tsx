import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Platform,
  View,
  Pressable,
  Image,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useTaskChatWebSocket } from '../../hooks/useTaskChatWebSocket';
import { Colors } from '@/constants/colors';
import { SkeletonBox } from '@/components/pro/jobDetailBottomSheet/SkeletonBox';
import { AgoraVoipCallModal } from './AgoraVoipCallModal';
import { IncomingCallModal, IncomingCallData } from './IncomingCallModal';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatImagePreviewModal } from './ChatImagePreviewModal';
import { styles } from '@/styles/taskChatModal.styles';
import { logger } from '@/utils/logger';

export interface TaskChatModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: number | string | undefined | null;
  otherUserName: string;
  otherUserAvatar?: string;
  onCall?: () => void;
  role?: 'customer' | 'pro';
  isProfileLoading?: boolean;
}

export function TaskChatModal({
  visible,
  onClose,
  taskId,
  otherUserName,
  otherUserAvatar,
  onCall,
  role = 'customer',
  isProfileLoading = false,
}: TaskChatModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [voipModalVisible, setVoipModalVisible] = useState(false);
  const [voipCallStatus, setVoipCallStatus] = useState<'calling' | 'connected' | 'ended' | 'declined'>('calling');
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  const {
    messages,
    isOpen,
    isConnecting,
    chatError,
    hasMoreOlderMessages,
    isLoadingOlder,
    attachmentCache,
    isUploadingAttachment,
    sendMessage,
    sendCallSignal,
    uploadAndSendAttachment,
    loadOlderMessages,
    reconnect,
  } = useTaskChatWebSocket({
    taskId,
    userId: user?.id,
    token: user?.token,
    enabled: Boolean(taskId),
    onIncomingCallSignal: (data) => {
      if (data.signal === 'incoming_call') {
        setIncomingCallData({
          taskId: data.taskId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
        });
      } else if (data.signal === 'call_declined') {
        setIncomingCallData(null);
      } else if (data.signal === 'call_accepted') {
        setVoipCallStatus('connected');
        setVoipModalVisible(true);
        setIncomingCallData(null);
      } else if (data.signal === 'call_ended') {
        setVoipCallStatus('ended');
        setVoipModalVisible(false);
        setIncomingCallData(null);
      }
    },
  });

  const isProView = role === 'pro';
  const headerBg = isProView ? Colors.pro.header : Colors.brand.dark;
  const bubbleUserBg = isProView ? Colors.pro.header : Colors.brand.dark;
  const getUserDisplayName = () => (user as any)?.name || (user as any)?.first_name || user?.email?.split('@')[0] || (isProView ? 'Professional' : 'Customer');

  const handleInitiateCall = () => {
    setVoipCallStatus('calling');
    setVoipModalVisible(true);
    const callerName = getUserDisplayName();
    sendCallSignal('incoming_call', { caller_name: callerName });
  };

  const handleAcceptIncoming = () => {
    sendCallSignal('call_accepted', { caller_name: getUserDisplayName() });
    setVoipCallStatus('connected');
    setVoipModalVisible(true);
    setIncomingCallData(null);
  };

  const handleDeclineIncoming = () => {
    sendCallSignal('call_declined', { caller_name: getUserDisplayName() });
    setIncomingCallData(null);
  };

  const handleEndCallSignal = () => {
    sendCallSignal('call_ended', { caller_name: getUserDisplayName() });
    setVoipCallStatus('ended');
    setVoipModalVisible(false);
  };

  // Keyboard height handling
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardHeightAnim, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          useNativeDriver: false,
        }).start();
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeightAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          useNativeDriver: false,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeightAnim]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const imageUri = result.assets[0].uri;
        const captionText = inputText.trim();
        setInputText('');
        await uploadAndSendAttachment(imageUri, captionText);
      }
    } catch (err: any) {
      logger.warn('[TaskChatModal] Error picking/uploading image attachment:', err?.message || err);
      Alert.alert('Upload Failed', 'Could not upload attachment. Please try again.');
    }
  };

  if (!visible) return null;

  const initials = (otherUserName || 'U').charAt(0).toUpperCase();
  const hasValidAvatar = Boolean(otherUserAvatar && otherUserAvatar.trim().length > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />
      <Animated.View
        style={[
          styles.container,
          {
            paddingBottom: keyboardHeightAnim.interpolate({
              inputRange: [0, 1000],
              outputRange: [Math.max(insets.bottom, 12), 1000 + Math.max(insets.bottom, 12)],
            }),
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12), backgroundColor: headerBg }]}>
          <Pressable onPress={onClose} style={styles.headerBackBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          {isProfileLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 4 }}>
              <SkeletonBox width={40} height={40} borderRadius={20} backgroundColor="rgba(255,255,255,0.25)" />
              <View style={{ gap: 6 }}>
                <SkeletonBox width={120} height={14} borderRadius={4} backgroundColor="rgba(255,255,255,0.25)" />
                <SkeletonBox width={80} height={10} borderRadius={4} backgroundColor="rgba(255,255,255,0.25)" />
              </View>
            </View>
          ) : (
            <>
              {hasValidAvatar ? (
                <Image source={{ uri: otherUserAvatar }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatarPlaceholder, { backgroundColor: isProView ? Colors.pro.accentDim : 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.headerAvatarText}>{initials}</Text>
                </View>
              )}

              <View style={styles.headerDetails}>
                <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: isOpen ? '#22C55E' : '#EF4444' }]} />
                  <Text style={styles.statusText}>
                    {isConnecting ? 'Connecting...' : isOpen ? 'In-App Live Session' : 'Session Closed'}
                  </Text>
                </View>
              </View>
            </>
          )}

          <Pressable onPress={handleInitiateCall} style={styles.headerCallBtn} hitSlop={10}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Chat Body Error Banner */}
        {chatError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorBannerText}>{chatError}</Text>
            {!isOpen && (
              <Pressable onPress={reconnect} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        >
          {/* Top Pagination Control */}
          {hasMoreOlderMessages && messages.length > 0 && (
            <View style={styles.paginationContainer}>
              <Pressable
                style={styles.paginationBtn}
                onPress={loadOlderMessages}
                disabled={isLoadingOlder}
              >
                {isLoadingOlder ? (
                  <ActivityIndicator size="small" color="#16A34A" />
                ) : (
                  <Text style={styles.paginationText}>Load earlier messages</Text>
                )}
              </Pressable>
            </View>
          )}

          <View style={styles.systemInfoPill}>
            <Ionicons name="lock-closed-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={styles.systemInfoText}>
              In-app messages are encrypted and active during session.
            </Text>
          </View>

          {messages.map((msg) => {
            const isUser = Number(msg.sender_id) === Number(user?.id);
            const resolvedUrl = msg.attachment_id ? attachmentCache[msg.attachment_id] : undefined;

            return (
              <ChatMessageBubble
                key={String(msg.id || msg.sequence)}
                msg={msg}
                isUser={isUser}
                bubbleUserBg={bubbleUserBg}
                attachmentUrl={resolvedUrl}
                onPressImage={(url) => setPreviewImageUrl(url)}
              />
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <Pressable
            style={styles.attachBtn}
            onPress={handlePickImage}
            disabled={!isOpen || isConnecting || isUploadingAttachment}
          >
            {isUploadingAttachment ? (
              <ActivityIndicator size="small" color={headerBg} />
            ) : (
              <Ionicons name="image-outline" size={22} color="#6B7280" />
            )}
          </Pressable>

          <TextInput
            style={styles.inputField}
            placeholder={isOpen ? "Type a message..." : "Chat is closed for this task"}
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            editable={isOpen && !isConnecting && !isUploadingAttachment}
            multiline
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 150);
            }}
          />

          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: isOpen && inputText.trim().length > 0 ? headerBg : '#9CA3AF' },
            ]}
            onPress={handleSend}
            disabled={!isOpen || isConnecting || isUploadingAttachment || inputText.trim() === ''}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Image Full-Screen Preview Lightbox Modal */}
        <ChatImagePreviewModal
          imageUrl={previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
        />

        {/* In-App Voice Call Modal */}
        <AgoraVoipCallModal
          visible={voipModalVisible}
          onClose={() => setVoipModalVisible(false)}
          taskId={taskId}
          otherUserName={otherUserName}
          otherUserAvatar={otherUserAvatar}
          role={role}
          initialStatus={voipCallStatus}
          onEndCallSignal={handleEndCallSignal}
        />

        {/* Incoming Call Ringing Modal */}
        <IncomingCallModal
          visible={Boolean(incomingCallData)}
          callData={incomingCallData}
          onAccept={handleAcceptIncoming}
          onDecline={handleDeclineIncoming}
        />
      </Animated.View>
    </Modal>
  );
}

export default TaskChatModal;
