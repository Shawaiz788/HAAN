import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Alert,
  Dimensions,
  ActivityIndicator,
  Linking,
  ToastAndroid,
  Platform,
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
import { styles } from '@/styles/activeTaskScreen.styles';
import UserReviewsModal from '@/components/UserReviewsModal';
import { getUserReviews } from '@/services/user';
import { ClientChatModal } from '@/components/client/ClientChatModal';
import { CancelProgressModal } from '@/components/client/CancelProgressModal';
import { TaskSummaryCard } from '@/components/client/TaskSummaryCard';
import { ClientBidsList } from '@/components/client/ClientBidsList';
import { AcceptedProCard } from '@/components/client/AcceptedProCard';

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
          .catch(() => { });
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

    let isMounted = true;
    const checkTaskStatus = async () => {
      try {
        const taskData = await getTaskByIdFromBackend(taskId);
        if (!isMounted) return;

        if (!taskData) {
          Alert.alert(
            'Task Removed',
            'This task request has been deleted or removed from the system.',
            [{ text: 'OK', onPress: () => cancelTask() }]
          );
          return;
        }

        if (taskData.status_id === 4 || (taskData as any).status === 'completed') {
          const proName = activeTask.acceptedBid?.name || 'Service Provider';
          const proId = (activeTask.acceptedBid as any)?.user_id || 1;
          const taskTitle = activeTask.category || 'Service Request';

          setCompletedTaskInfo({ id: taskId, proName, proId, title: taskTitle });
          setReviewModalVisible(true);
        } else if (taskData.status_id === 5) {
          cancelTask()
        }
      } catch (err) {
        console.warn('[ActiveTaskScreen] Error polling task status:', err);
      }
    };

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
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
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
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed on your device.');
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
          <TaskSummaryCard task={activeTask} />

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
            <ClientBidsList
              bids={bids}
              onAcceptBid={handleAcceptBid}
              onDeclineBid={handleDeclineBid}
              onSelectPro={(proId, name) => {
                setSelectedProInfo({ id: proId, name });
                setProReviewsVisible(true);
              }}
            />
          )}

          {/* Accepted Professional Card */}
          {activeTask.status === 'accepted' && activeTask.acceptedBid && (
            <AcceptedProCard
              acceptedBid={activeTask.acceptedBid}
              activeChatMessagesCount={activeChatMessages.length}
              onCall={() => handleCall(activeTask.acceptedBid!)}
              onWhatsApp={() => handleWhatsApp(activeTask.acceptedBid!)}
              onOpenChat={() => setChatVisible(true)}
              onSelectPro={(proId, name) => {
                setSelectedProInfo({ id: proId, name });
                setProReviewsVisible(true);
              }}
            />
          )}
        </ScrollView>

        {/* Cancel Button */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={handleCancelTask}>
            <Text style={styles.cancelBtnText}>Cancel Job Request</Text>
          </Pressable>
        </View>

        {/* Task Chat Modal */}
        {activeTask.status === 'accepted' && activeTask.acceptedBid && (
          <ClientChatModal
            visible={chatVisible}
            onClose={() => setChatVisible(false)}
            taskId={taskId}
            proAvatar={activeTask.acceptedBid.avatar}
            proName={activeTask.acceptedBid.name}
            onCall={() => handleCall(activeTask.acceptedBid!)}
          />
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
        <CancelProgressModal visible={isCancelling} stepText={cancellationStep} />

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
