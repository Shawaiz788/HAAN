import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Alert,
  Dimensions,
  ActivityIndicator,
  Linking,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { usePostJob, Bid } from '@/context/post-job';
import { useAuth } from '@/context/auth';
import { useBiddingWebSocket } from '@/hooks/useBiddingWebSocket';
import { useRouter } from 'expo-router';
import { getTaskByIdFromBackend } from '@/services/task';
import { getCustomerProfile } from '@/services/customer';
import { createReview } from '@/services/review';
import ReviewModal from '@/components/ReviewModal';
import UserReviewsModal from '@/components/UserReviewsModal';
import { getUserReviews } from '@/services/user';

const { width } = Dimensions.get('window');

interface ActiveTaskScreenProps {
  onBack: () => void;
}

export default function ActiveTaskScreen({ onBack }: ActiveTaskScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeTask,
    activeChatMessages,
    isCreatingTask,
    creationStep,
    acceptBid: contextAcceptBid,
    cancelTask,
    completeTask,
    sendActiveChatMessage,
  } = usePostJob();

  const getBackendTaskId = () => {
    if (activeTask?.backend_id) return activeTask.backend_id;
    if (!activeTask?.id) return null;
    const numId = Number(activeTask.id);
    if (!isNaN(numId) && numId > 0 && numId < 1_000_000_000) return numId;
    return null;
  };
  const taskId = getBackendTaskId();
  const { bids: wsBids, acceptBid: sendWsAcceptBid } = useBiddingWebSocket({
    taskId,
    userId: user?.id,
    isCustomer: true,
    enabled: Boolean(activeTask && taskId && user?.id),
    token: user?.token,
  });

  const [proReviewCounts, setProReviewCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    wsBids.forEach((b) => {
      const uid = Number(b.user_id);
      if (uid && !(uid in proReviewCounts)) {
        getUserReviews(uid)
          .then((reviewsList) => {
            setProReviewCounts((prev) => ({
              ...prev,
              [uid]: Array.isArray(reviewsList) ? reviewsList.length : 0,
            }));
          })
          .catch(() => {});
      }
    });
  }, [wsBids]);

  const bids: Bid[] = wsBids.map((b) => ({
    id: String(b.id),
    user_id: Number(b.user_id),
    name: b.user_name || (b.is_profile_loading ? '' : `Professional #${b.user_id}`),
    avatar: b.user_avatar || '',
    rating: b.user_rating || 4.8,
    reviewsCount: proReviewCounts[Number(b.user_id)] ?? 0,
    price: b.price,
    timeEstimate: b.estimated_hours ? `${b.estimated_hours * 60} min` : '15 min',
    message: b.estimated_hours ? `Estimated duration: ${b.estimated_hours} hours` : 'Ready to perform task',
    phone_number: b.phone_number,
    is_profile_loading: Boolean(b.is_profile_loading),
  }));

  const handleAcceptBid = (bid: Bid) => {
    sendWsAcceptBid(bid.id);
    contextAcceptBid(bid.id, bid);
  };

  // Sync acceptedBid when profile loading completes
  useEffect(() => {
    if (!activeTask?.acceptedBid || !activeTask.acceptedBid.is_profile_loading) return;
    const matchingBid = bids.find(
      (b) => String(b.id) === String(activeTask.acceptedBid?.id) || (b.user_id && activeTask.acceptedBid?.user_id && b.user_id === activeTask.acceptedBid.user_id)
    );
    if (matchingBid && !matchingBid.is_profile_loading) {
      contextAcceptBid(matchingBid.id, matchingBid);
    }
  }, [bids, activeTask?.acceptedBid?.is_profile_loading]);

  const [chatVisible, setChatVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [completedTaskInfo, setCompletedTaskInfo] = useState<{ id: number; proName: string; proId?: number; title: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationStep, setCancellationStep] = useState('Cancelling task request...');
  const [proReviewsVisible, setProReviewsVisible] = useState(false);
  const [selectedProInfo, setSelectedProInfo] = useState<{ id: number; name: string } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Periodic API status polling on active task
  useEffect(() => {
    if (!taskId || !activeTask || activeTask.status === 'completed' || activeTask.status === 'cancelled') return;

    console.log(`[ActiveTaskScreen] Starting task status check for Task ID: ${taskId}...`);

    let isMounted = true;
    const checkTaskStatus = async () => {
      try {
        const taskData = await getTaskByIdFromBackend(taskId);
        if (!isMounted) return;

        if (!taskData) {
          console.log(`[ActiveTaskScreen] Task ${taskId} no longer exists on backend (deleted from another device).`);
          Alert.alert(
            'Task Removed',
            'This task request has been deleted or removed from the system.',
            [{ text: 'OK', onPress: () => cancelTask() }]
          );
          return;
        }

        if (taskData.status_id === 4 || (taskData as any).status === 'completed') {
          console.log(`[ActiveTaskScreen] Detected task ${taskId} completed on backend!`);

          const proName = activeTask.acceptedBid?.name || 'Service Provider';
          const proId = (activeTask.acceptedBid as any)?.user_id || 1;
          const taskTitle = activeTask.category || 'Service Request';

          setCompletedTaskInfo({ id: taskId, proName, proId, title: taskTitle });
          setReviewModalVisible(true);
        } else if (taskData.status_id === 5 || taskData.status_id === 3) {
          console.log(`[ActiveTaskScreen] Detected task ${taskId} cancelled on backend!`);
          Alert.alert(
            'Task Cancelled',
            'This task request was cancelled.',
            [{ text: 'OK', onPress: () => cancelTask() }]
          );
        }
      } catch (err) {
        console.warn('[ActiveTaskScreen] Error polling task status:', err);
      }
    };

    // Run check immediately on mount and then every 30s
    checkTaskStatus();
    const interval = setInterval(checkTaskStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [taskId, activeTask?.status]);

  const handleCustomerSubmitReview = async (rating: number, body: string) => {
    if (!completedTaskInfo || !user?.id) return;
    const targetUserId = completedTaskInfo.proId || 1;
    await createReview({
      user_id: targetUserId,
      task_id: completedTaskInfo.id,
      given_by: user.id,
      rating,
      body,
    });
  };

  // Pulse animation for searching state
  useEffect(() => {
    if (isCreatingTask || activeTask?.status === 'searching' || activeTask?.status === 'bidding') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCreatingTask, activeTask?.status]);

  // Auto navigate home if activeTask becomes null
  useEffect(() => {
    if (!activeTask && !isCreatingTask) {
      onBack();
    }
  }, [activeTask, isCreatingTask]);

  if (isCreatingTask) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={[styles.container, styles.center, { paddingHorizontal: 24, paddingBottom: 120 }]}>
          <View style={styles.animationContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.centerIcon}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          </View>
          <Text style={[styles.statusText, { marginTop: 20, fontSize: 18 }]}>Publishing Request...</Text>
          <Text style={[styles.subStatusText, { textAlign: 'center', marginTop: 8 }]}>
            {creationStep || 'Creating task and connecting to service providers...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeTask) {
    return null;
  }

  const handleDeclineBid = (bidId: string) => {
    Alert.alert('Decline Bid', 'You have declined this offer.');
  };

  const handleCall = async (bid?: Bid) => {
    let rawPhone = bid?.phone_number || '';
    if (!rawPhone && bid?.user_id) {
      try {
        const p = await getCustomerProfile(bid.user_id);
        if (p?.phone_number) rawPhone = p.phone_number;
      } catch (e) {
        console.warn('[ActiveTaskScreen] Error fetching worker phone number:', e);
      }
    }
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      Alert.alert('Phone Number Unavailable', 'The service provider has not added a contact phone number yet.');
      return;
    }
    const telUrl = `tel:${cleanPhone}`;

    console.log('[ActiveTaskScreen] Opening Tel URL:', telUrl);
    Linking.openURL(telUrl).catch(() => {
      Alert.alert('Phone Call Error', 'Could not open phone dialer.');
    });
  };

  const handleWhatsApp = async (bid?: Bid) => {
    let rawPhone = bid?.phone_number || '';
    if (!rawPhone && bid?.user_id) {
      try {
        const p = await getCustomerProfile(bid.user_id);
        if (p?.phone_number) rawPhone = p.phone_number;
      } catch (e) {
        console.warn('[ActiveTaskScreen] Error fetching worker phone number:', e);
      }
    }
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      Alert.alert('WhatsApp Unavailable', 'The service provider has not added a contact phone number yet.');
      return;
    }
    const textMessage = `Hi ${bid?.name || 'there'}, I am contacting you regarding task "${activeTask?.category}".`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;

    console.log('[ActiveTaskScreen] Opening WhatsApp URL:', whatsappUrl);
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert(
        'WhatsApp Error',
        'Could not open WhatsApp. Please ensure WhatsApp is installed on your device.'
      );
    });
  };

  const handleCancelTask = async () => {
    setIsCancelling(true);
    setCancellationStep('Cancelling job request...');
    try {
      await cancelTask((stepMsg) => {
        setCancellationStep(stepMsg);
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show('Task cancelled successfully.', ToastAndroid.SHORT);
      }
    } catch (err: any) {
      console.error('[ActiveTaskScreen] Task cancellation failed:', err);
      Alert.alert(
        'Cancellation Error',
        'Could not cancel task due to a connection error. Would you like to try again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: handleCancelTask },
        ]
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSendChat = () => {
    if (chatInput.trim() === '') return;
    sendActiveChatMessage(chatInput);
    setChatInput('');
  };

  const chatHeaderStyle = [
    styles.modalHeader,
    { paddingTop: insets.top > 0 ? insets.top + 5 : 15 }
  ];

  const chatInputStyle = [
    styles.inputBar,
    { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 10 }
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Task Status</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Task Summary Card */}
        <View style={styles.taskSummaryCard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.statusIndicator, activeTask.status === 'accepted' ? styles.statusActive : styles.statusSearching]} />
            <Text style={styles.summaryCategory}>{activeTask.category}</Text>
          </View>
          <Text style={styles.summaryDetails} numberOfLines={2}>{activeTask.description}</Text>
          <View style={styles.summaryMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="wallet-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>Budget: Rs. {activeTask.budget}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText} numberOfLines={1}>Address: {activeTask.locationName}</Text>
            </View>
          </View>
        </View>

        {/* Status Area */}
        {(activeTask.status === 'searching' || activeTask.status === 'bidding') && (
          <View style={styles.searchingArea}>
            <View style={styles.animationContainer}>
              <Animated.View
                style={[
                  styles.pulseCircle,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.25],
                      outputRange: [0.6, 0.1],
                    }),
                  },
                ]}
              />
              <View style={styles.centerIcon}>
                <Ionicons name="search" size={32} color="#10B981" />
              </View>
            </View>
            <Text style={styles.statusText}>
              {activeTask.status === 'searching'
                ? 'Finding local professionals near you...'
                : 'Receiving offers from professionals...'}
            </Text>
            <Text style={styles.subStatusText}>Nearby experts are checking your requirements.</Text>
          </View>
        )}

        {/* Bids List */}
        {activeTask.status !== 'accepted' && (activeTask.status === 'bidding' || bids.length > 0) && (
          <View style={styles.bidsSection}>
            <Text style={styles.sectionTitle}>Offers ({bids.length})</Text>
            {bids.length === 0 ? (
              <View style={styles.noOffersContainer}>
                <Ionicons name="chatbox-ellipses-outline" size={24} color="#9CA3AF" style={{ marginBottom: 4 }} />
                <Text style={styles.noOffersText}>No offers received yet</Text>
                <Text style={styles.noOffersSubText}>
                  Offers from nearby service providers will appear here in real time.
                </Text>
              </View>
            ) : (
              bids.map((bid) => {
                if (bid.is_profile_loading) {
                  return (
                    <View key={bid.id} style={styles.bidCard}>
                      <View style={styles.bidHeader}>
                        <View style={[styles.bidAvatar, styles.skeletonBox]} />
                        <View style={styles.bidHeaderInfo}>
                          <View style={[styles.skeletonLine, { width: 130, height: 16, marginBottom: 8 }]} />
                          <View style={[styles.skeletonLine, { width: 90, height: 12 }]} />
                        </View>
                        <View style={styles.bidPriceContainer}>
                          <Text style={styles.bidPrice}>Rs. {bid.price}</Text>
                          <Text style={styles.bidTime}>{bid.timeEstimate} away</Text>
                        </View>
                      </View>

                      <View style={styles.bidActions}>
                        <Pressable
                          style={[styles.bidBtn, styles.declineBtn]}
                          onPress={() => handleDeclineBid(bid.id)}
                        >
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.bidBtn, styles.acceptBtn]}
                          onPress={() => handleAcceptBid(bid)}
                        >
                          <Text style={styles.acceptBtnText}>Accept Offer</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={bid.id} style={styles.bidCard}>
                    <View style={styles.bidHeader}>
                      <Pressable
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        onPress={() => {
                          if (bid.user_id) {
                            setSelectedProInfo({ id: bid.user_id, name: bid.name });
                            setProReviewsVisible(true);
                          }
                        }}
                      >
                        <Image source={{ uri: bid.avatar }} style={styles.bidAvatar} />
                        <View style={styles.bidHeaderInfo}>
                          <Text style={styles.bidName}>{bid.name}</Text>
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <Text style={styles.ratingText}>
                              {bid.rating} ({bid.reviewsCount} reviews)
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                      <View style={styles.bidPriceContainer}>
                        <Text style={styles.bidPrice}>Rs. {bid.price}</Text>
                        <Text style={styles.bidTime}>{bid.timeEstimate} away</Text>
                      </View>
                    </View>

                    <Text style={styles.bidComment}>"{bid.message}"</Text>

                    <View style={styles.bidActions}>
                      <Pressable
                        style={[styles.bidBtn, styles.declineBtn]}
                        onPress={() => handleDeclineBid(bid.id)}
                      >
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.bidBtn, styles.acceptBtn]}
                        onPress={() => handleAcceptBid(bid)}
                      >
                        <Text style={styles.acceptBtnText}>Accept Offer</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Accepted Professional Card */}
        {activeTask.status === 'accepted' && activeTask.acceptedBid && (() => {
          const acceptedBid = activeTask.acceptedBid;
          return (
            <View style={styles.acceptedSection}>
              <View style={styles.alertSuccess}>
                <Ionicons name="checkmark-circle" size={24} color="#047857" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertSuccessTitle}>Professional Assigned!</Text>
                  <Text style={styles.alertSuccessText}>
                    {acceptedBid.is_profile_loading ? 'Service Provider' : acceptedBid.name.split(' ')[0]} is arriving in ~{acceptedBid.timeEstimate}.
                  </Text>
                </View>
              </View>

              {acceptedBid.is_profile_loading ? (
                <View style={styles.proProfileCard}>
                  <View style={[styles.proLargeAvatar, styles.skeletonBox]} />
                  <View style={[styles.skeletonLine, { width: 140, height: 20, marginBottom: 8 }]} />
                  <View style={[styles.skeletonLine, { width: 100, height: 14, marginBottom: 16 }]} />
                </View>
              ) : (
                <View style={styles.proProfileCard}>
                  <Pressable
                    style={{ alignItems: 'center', width: '100%', marginBottom: 16 }}
                    onPress={() => {
                      const proId = (acceptedBid as any)?.user_id;
                      if (proId) {
                        setSelectedProInfo({ id: proId, name: acceptedBid.name });
                        setProReviewsVisible(true);
                      }
                    }}
                  >
                    <Image source={{ uri: acceptedBid.avatar }} style={styles.proLargeAvatar} />
                    <Text style={styles.proLargeName}>{acceptedBid.name}</Text>
                    <View style={styles.proLargeRating}>
                      <Ionicons name="star" size={18} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.proLargeRatingText}>
                        {acceptedBid.rating} ({acceptedBid.reviewsCount} reviews)
                      </Text>
                    </View>
                    <Text style={styles.tapToViewReviewsHint}>Tap profile to see reviews</Text>
                  </Pressable>

                  <View style={styles.proContactRow}>
                    <Pressable
                      style={[styles.contactCircleBtn, styles.contactPhone]}
                      onPress={() => handleCall(acceptedBid)}
                    >
                      <Ionicons name="call" size={20} color="#FFFFFF" />
                    </Pressable>

                    <Pressable
                      style={[styles.contactCircleBtn, styles.contactWhatsApp]}
                      onPress={() => handleWhatsApp(acceptedBid)}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                    </Pressable>

                    <Pressable
                      style={[styles.contactCircleBtn, styles.contactChat]}
                      onPress={() => setChatVisible(true)}
                    >
                      <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                      {activeChatMessages.length > 0 && (
                        <View style={styles.chatBadge} />
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })()}
      </ScrollView>

      {/* Cancel Button */}
      <View style={styles.footer}>
        <Pressable style={styles.cancelBtn} onPress={handleCancelTask}>
          <Text style={styles.cancelBtnText}>Cancel Job Request</Text>
        </Pressable>
      </View>

      {/* Temporary Chat Modal */}
      {activeTask.status === 'accepted' && activeTask.acceptedBid && (
        <Modal
          visible={chatVisible}
          animationType="slide"
          onRequestClose={() => setChatVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatRoomContainer}
          >
            {/* Chat Modal Header */}
            <View style={chatHeaderStyle}>
              <Pressable onPress={() => setChatVisible(false)} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </Pressable>
              <Image source={{ uri: activeTask.acceptedBid.avatar }} style={styles.modalAvatar} />
              <View style={styles.modalHeaderDetails}>
                <Text style={styles.modalName}>{activeTask.acceptedBid.name}</Text>
                <Text style={styles.modalStatus}>Active session</Text>
              </View>
              <Pressable onPress={() => handleCall(activeTask.acceptedBid)} style={styles.modalCallBtn}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Chat Messages */}
            <ScrollView
              style={styles.chatMessagesList}
              contentContainerStyle={{ padding: 16, paddingBottom: 25 }}
              ref={(ref) => {
                // Keep scrolled to bottom
              }}
            >
              <View style={styles.systemMessagePill}>
                <Text style={styles.systemMessageText}>
                  Messages are temporary and will be cleared once this task ends.
                </Text>
              </View>

              {activeChatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubbleContainer,
                      isUser ? styles.messageUser : styles.messageOther,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isUser ? styles.bubbleUser : styles.bubbleOther,
                      ]}
                    >
                      <Text style={isUser ? styles.bubbleUserText : styles.bubbleOtherText}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>{msg.time}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Input Bar */}
            <View style={chatInputStyle}>
              <TextInput
                style={styles.inputField}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                value={chatInput}
                onChangeText={setChatInput}
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  chatInput.trim() === '' ? styles.sendBtnDisabled : styles.sendBtnEnabled,
                ]}
                onPress={handleSendChat}
                disabled={chatInput.trim() === ''}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Customer Review Modal */}
      <ReviewModal
        isVisible={reviewModalVisible}
        onClose={() => {
          setReviewModalVisible(false);
          setCompletedTaskInfo(null);
          completeTask();
        }}
        onSubmit={handleCustomerSubmitReview}
        targetName={completedTaskInfo?.proName || 'Service Provider'}
        role="customer"
        taskTitle={completedTaskInfo?.title}
      />

      {/* Progressive Cancellation Overlay */}
      <Modal visible={isCancelling} transparent animationType="fade">
        <View style={styles.cancelOverlay}>
          <View style={styles.cancelCard}>
            <ActivityIndicator size="large" color="#EF4444" style={{ marginBottom: 16 }} />
            <Text style={styles.cancelTitle}>Cancelling Task...</Text>
            <Text style={styles.cancelStepText}>{cancellationStep}</Text>
          </View>
        </View>
      </Modal>

      {/* Pro Reviews Modal */}
      <UserReviewsModal
        isVisible={proReviewsVisible}
        onClose={() => {
          setProReviewsVisible(false);
          setSelectedProInfo(null);
        }}
        userId={selectedProInfo?.id}
        userName={selectedProInfo?.name || ''}
        role="pro"
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean status bar color
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24, // Normal flow padding bottom
  },
  taskSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusSearching: {
    backgroundColor: '#F59E0B',
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  summaryCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  summaryDetails: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.48,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  searchingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  animationContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  pulseCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#10B981',
  },
  centerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subStatusText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  bidsSection: {
    marginTop: 10,
  },
  noOffersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  noOffersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  noOffersSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  bidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  bidHeaderInfo: {
    flex: 1,
  },
  bidName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  bidPriceContainer: {
    alignItems: 'flex-end',
  },
  bidPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  bidTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  bidComment: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  bidBtn: {
    flex: 0.48,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  declineBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  acceptedSection: {
    marginTop: 10,
  },
  alertSuccess: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  alertSuccessTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#064E3B',
  },
  alertSuccessText: {
    fontSize: 13,
    color: '#047857',
    marginTop: 2,
  },
  proProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
  },
  proLargeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
  },
  proLargeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  proLargeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  proLargeRatingText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  tapToViewReviewsHint: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: -12,
    marginBottom: 16,
  },
  proContactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  contactCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  contactPhone: {
    backgroundColor: '#3B82F6',
  },
  contactChat: {
    backgroundColor: '#10B981',
  },
  chatBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  completeBtn: {
    backgroundColor: '#082C18',
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  backBtnText: {
    backgroundColor: '#082C18',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backBtnLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Modal styling
  chatModalHeaderContainer: {
    backgroundColor: '#082C18',
  },
  chatInputContainer: {
    backgroundColor: '#FFFFFF',
  },
  chatRoomContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    backgroundColor: '#082C18',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBackBtn: {
    padding: 4,
    marginRight: 10,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  modalHeaderDetails: {
    flex: 1,
  },
  modalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalStatus: {
    fontSize: 11,
    color: '#34D399',
  },
  modalCallBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  chatMessagesList: {
    flex: 1,
  },
  systemMessagePill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  systemMessageText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
  messageBubbleContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  messageUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: '#082C18',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  bubbleUserText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
  },
  bubbleOtherText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    marginHorizontal: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14,
    color: '#1F2937',
    marginRight: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnEnabled: {
    backgroundColor: '#10B981',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  contactWhatsApp: {
    backgroundColor: '#25D366',
  },
  skeletonBox: {
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  cancelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cancelCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cancelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cancelStepText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
