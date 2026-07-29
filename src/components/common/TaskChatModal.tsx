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
  StyleSheet,
  StatusBar,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useTaskChatWebSocket } from '../../hooks/useTaskChatWebSocket';
import { Colors } from '@/constants/colors';
import { SkeletonBox } from '@/components/pro/jobDetailBottomSheet/SkeletonBox';
import { AgoraVoipCallModal } from './AgoraVoipCallModal';
import { IncomingCallModal, IncomingCallData } from './IncomingCallModal';

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
  const [voipCallStatus, setVoipCallStatus] = useState<'calling' | 'connected'>('calling');
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  const {
    messages,
    isOpen,
    isConnecting,
    chatError,
    hasMoreOlderMessages,
    isLoadingOlder,
    sendMessage,
    sendCallSignal,
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
      } else if (data.signal === 'call_declined' || data.signal === 'call_ended') {
        setIncomingCallData(null);
        setVoipModalVisible(false);
      } else if (data.signal === 'call_accepted') {
        setIncomingCallData(null);
        setVoipCallStatus('connected');
        setVoipModalVisible(true);
      }
    },
  });

  const handleInitiateCall = () => {
    setVoipCallStatus('calling');
    sendCallSignal('incoming_call', {
      caller_name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User',
      caller_avatar: (user as any)?.avatar || (user as any)?.image || '',
    });
    if (onCall) {
      onCall();
    } else {
      setVoipModalVisible(true);
    }
  };

  const handleAcceptIncoming = () => {
    sendCallSignal('call_accepted');
    setIncomingCallData(null);
    setVoipCallStatus('connected');
    setVoipModalVisible(true);
  };

  const handleDeclineIncoming = () => {
    sendCallSignal('call_declined');
    setIncomingCallData(null);
  };

  const handleEndCallSignal = () => {
    sendCallSignal('call_ended');
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const h = e?.endCoordinates?.height || 0;
        Animated.timing(keyboardHeightAnim, {
          toValue: h,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 150,
          useNativeDriver: false,
        }).start();
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeightAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e?.duration || 250 : 150,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeightAnim]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (!visible) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const hasValidAvatar = Boolean(otherUserAvatar && otherUserAvatar.trim().length > 0);
  const initials = (otherUserName || 'User').charAt(0).toUpperCase();

  const isProView = role === 'pro';
  const headerBg = isProView ? Colors.pro.header : '#16A34A';
  const bubbleUserBg = isProView ? '#059669' : '#16A34A';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
              In-app messages for Task #{taskId || ''} are encrypted and active during session.
            </Text>
          </View>

          {messages.map((msg) => {
            const isUser = Number(msg.sender_id) === Number(user?.id);
            const timeStr = msg.created_at
              ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <View
                key={String(msg.id || msg.sequence)}
                style={[
                  styles.bubbleContainer,
                  isUser ? styles.bubbleContainerUser : styles.bubbleContainerOther,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser ? { backgroundColor: bubbleUserBg } : styles.bubbleOther,
                  ]}
                >
                  {!isUser && msg.sender_name && (
                    <Text style={styles.senderLabel}>{msg.sender_name}</Text>
                  )}
                  <Text style={isUser ? styles.bubbleUserText : styles.bubbleOtherText}>
                    {msg.body}
                  </Text>
                </View>
                {Boolean(timeStr) && (
                  <Text style={styles.timeText}>{timeStr}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputField}
            placeholder={isOpen ? "Type a message..." : "Chat is closed for this task"}
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            editable={isOpen && !isConnecting}
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
            disabled={!isOpen || isConnecting || inputText.trim() === ''}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBackBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerDetails: {
    flex: 1,
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  headerCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  paginationContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paginationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
  },
  paginationText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  systemInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  systemInfoText: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
  },
  bubbleContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  bubbleContainerUser: {
    alignSelf: 'flex-end',
  },
  bubbleContainerOther: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  senderLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  bubbleUserText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleOtherText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: '#111827',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default TaskChatModal;
