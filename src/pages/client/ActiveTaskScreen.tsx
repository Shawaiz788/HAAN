import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
  ToastAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { usePostJob, Bid } from '@/context/post-job';
import { useAuth } from '@/context/auth';
import { useBiddingWebSocket } from '@/hooks/useBiddingWebSocket';
import { useRouter } from 'expo-router';
import { TASK_STATUS } from '@/constants/taskStatus';
import { handleMakePhoneCall, handleOpenWhatsApp } from '@/utils/contactUtils';
import { getTaskByIdFromBackend } from '@/services/task';
import { getCustomerProfile } from '@/services/customer';
import { createReview } from '@/services/review';
import ReviewModal from '@/components/ReviewModal';
import { styles } from '@/styles/activeTaskScreen.styles';
import UserReviewsModal from '@/components/UserReviewsModal';
import { getUserReviewCount } from '@/services/user';
import { ClientChatModal } from '@/components/client/ClientChatModal';
import { CancelProgressModal } from '@/components/client/CancelProgressModal';
import { TaskSummaryCard } from '@/components/client/TaskSummaryCard';
import { ClientBidsList } from '@/components/client/ClientBidsList';
import { AcceptedProCard } from '@/components/client/AcceptedProCard';

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
    const uidsToFetch = new Set<number>();
    wsBids.forEach((b) => {
      if (b.user_id) uidsToFetch.add(Number(b.user_id));
    });
    if (activeTask?.acceptedBid?.user_id) {
      uidsToFetch.add(Number(activeTask.acceptedBid.user_id));
    }

    uidsToFetch.forEach((uid) => {
      if (uid && !(uid in proReviewCounts)) {
        getUserReviewCount(uid)
          .then((count) => {
            setProReviewCounts((prev) => ({
              ...prev,
              [uid]: count,
            }));
          })
          .catch(() => { });
      }
    });
  }, [wsBids, activeTask?.acceptedBid?.user_id]);

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

  // Fallback accepted bid for active accepted task when opening on a new device before profile sync
  const matchingWsAcceptedBid = bids.find(
    (b) => (b as any).is_accepted || (activeTask?.acceptedBid?.id && String(b.id) === String(activeTask.acceptedBid.id))
  );

  const effectiveAcceptedBid: Bid | null = activeTask?.acceptedBid ? {
    ...activeTask.acceptedBid,
    reviewsCount: proReviewCounts[Number(activeTask.acceptedBid.user_id)] ?? activeTask.acceptedBid.reviewsCount,
  } : matchingWsAcceptedBid || (activeTask?.status === 'accepted' ? {
    id: 'accepted_pro_placeholder',
    user_id: 0,
    name: '',
    avatar: '',
    rating: 4.8,
    reviewsCount: undefined,
    price: activeTask?.budget || 0,
    timeEstimate: '15 min',
    message: 'Service Provider',
    is_profile_loading: true,
  } : null);

  // Automatic profile restoration when opening an accepted task on a new device
  useEffect(() => {
    if (!activeTask || activeTask.status !== 'accepted') return;

    if (matchingWsAcceptedBid && (!activeTask.acceptedBid || activeTask.acceptedBid.is_profile_loading)) {
      contextAcceptBid(matchingWsAcceptedBid.id, matchingWsAcceptedBid);
      return;
    }

    const targetUserId = Number(activeTask.acceptedBid?.user_id || matchingWsAcceptedBid?.user_id);
    const needsFetch = targetUserId > 0 && (!activeTask.acceptedBid?.name || activeTask.acceptedBid?.is_profile_loading || activeTask.acceptedBid.name.startsWith('Professional #'));

    if (needsFetch) {
      Promise.all([
        getCustomerProfile(targetUserId),
        getUserReviewCount(targetUserId).catch(() => undefined),
      ])
        .then(([profile, revCount]) => {
          const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
          const avatar = profile.image ? (profile.image.startsWith('http') ? profile.image : `${process.env.EXPO_PUBLIC_API_URL}${profile.image}`) : '';
          const finalReviewCount = revCount !== undefined ? revCount : proReviewCounts[targetUserId];
          if (revCount !== undefined) {
            setProReviewCounts((prev) => ({ ...prev, [targetUserId]: revCount }));
          }
          const updatedBid: Bid = {
            id: String(activeTask.acceptedBid?.id || matchingWsAcceptedBid?.id || targetUserId),
            user_id: targetUserId,
            name: fullName || `Professional #${targetUserId}`,
            avatar: avatar || '',
            rating: profile.overall_rating ?? 4.8,
            reviewsCount: finalReviewCount,
            price: activeTask.budget || 0,
            timeEstimate: '15 min',
            message: 'Service Provider',
            phone_number: profile.phone_number || '',
            is_profile_loading: false,
          };
          contextAcceptBid(updatedBid.id, updatedBid);
        })
        .catch((err) => {
          console.warn('[ActiveTaskScreen] Auto profile fetch failed:', err);
        });
    }
  }, [bids, activeTask?.status, activeTask?.acceptedBid?.is_profile_loading]);

  const [isRetryingProfile, setIsRetryingProfile] = useState(false);

  const handleRetryProProfile = async () => {
    let proId = Number(activeTask?.acceptedBid?.user_id || effectiveAcceptedBid?.user_id);
    if (!proId && bids.length > 0) {
      const foundBid = bids.find((b) => (b as any).is_accepted || b.user_id);
      if (foundBid?.user_id) proId = Number(foundBid.user_id);
    }

    if (!proId && taskId) {
      setIsRetryingProfile(true);
      try {
        const taskData = await getTaskByIdFromBackend(taskId);
        const workerId = (taskData as any)?.worker_id || (taskData as any)?.assigned_to;
        if (workerId) proId = Number(workerId);
      } catch (e) { }
    }

    if (!proId) {
      setIsRetryingProfile(false);
      Alert.alert('Profile Unavailable', 'Connecting to service network... Please wait a moment and try again.');
      return;
    }

    setIsRetryingProfile(true);
    try {
      const [profile, revCount] = await Promise.all([
        getCustomerProfile(proId),
        getUserReviewCount(proId).catch(() => undefined),
      ]);
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
      const avatar = profile.image ? (profile.image.startsWith('http') ? profile.image : `${process.env.EXPO_PUBLIC_API_URL}${profile.image}`) : '';
      const finalReviewCount = revCount !== undefined ? revCount : proReviewCounts[proId];
      if (revCount !== undefined) {
        setProReviewCounts((prev) => ({ ...prev, [proId]: revCount }));
      }
      const updatedBid: Bid = {
        id: String(activeTask?.acceptedBid?.id || proId),
        user_id: proId,
        name: fullName || `Professional #${proId}`,
        avatar: avatar || '',
        rating: profile.overall_rating ?? 4.8,
        reviewsCount: finalReviewCount,
        price: activeTask?.budget || 0,
        timeEstimate: '15 min',
        message: 'Service Provider',
        phone_number: profile.phone_number || '',
        is_profile_loading: false,
      };
      contextAcceptBid(updatedBid.id, updatedBid);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Profile loaded successfully!', ToastAndroid.SHORT);
      }
    } catch (err) {
      console.warn('[ActiveTaskScreen] Retry profile failed:', err);
      Alert.alert('Profile Error', 'Failed to fetch professional profile. Please check your network and try again.');
    } finally {
      setIsRetryingProfile(false);
    }
  };

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
          Alert.alert('Task Removed', 'This task request has been deleted or removed from the system.', [{ text: 'OK', onPress: () => cancelTask() }]);
          return;
        }
        if (taskData.status_id === TASK_STATUS.COMPLETED || (taskData as any).status === 'completed') {
          const proName = activeTask.acceptedBid?.name || 'Service Provider';
          const proId = (activeTask.acceptedBid as any)?.user_id || 1;
          const taskTitle = activeTask.category || 'Service Request';
          setCompletedTaskInfo({ id: taskId, proName, proId, title: taskTitle });
          setReviewModalVisible(true);
        } else if (taskData.status_id === TASK_STATUS.CANCELLED) {
          cancelTask();
        }
      } catch (err) {
        // console.warn('[ActiveTaskScreen] Error polling task status:', err);
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

  const handleCall = (bid?: Bid | null) => handleMakePhoneCall(bid);
  const handleWhatsApp = (bid?: Bid | null) => handleOpenWhatsApp(bid, activeTask?.category);

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
          {activeTask.status === 'accepted' && effectiveAcceptedBid && (
            <AcceptedProCard
              acceptedBid={effectiveAcceptedBid}
              activeChatMessagesCount={activeChatMessages.length}
              onCall={() => handleCall(effectiveAcceptedBid)}
              onWhatsApp={() => handleWhatsApp(effectiveAcceptedBid)}
              onOpenChat={() => setChatVisible(true)}
              onSelectPro={(proId, name) => {
                setSelectedProInfo({ id: proId, name });
                setProReviewsVisible(true);
              }}
              onRetryProfile={handleRetryProProfile}
              isRetryingProfile={isRetryingProfile}
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
          <ClientChatModal visible={chatVisible} onClose={() => setChatVisible(false)} taskId={taskId} proAvatar={activeTask.acceptedBid.avatar} proName={activeTask.acceptedBid.name} onCall={() => handleCall(activeTask.acceptedBid!)} />
        )}
        {/* Customer Review Modal */}
        <ReviewModal isVisible={reviewModalVisible} onClose={() => { setReviewModalVisible(false); setCompletedTaskInfo(null); completeTask(); }} onSubmit={handleCustomerSubmitReview} targetName={completedTaskInfo?.proName || 'Service Provider'} role="customer" taskTitle={completedTaskInfo?.title} />
        {/* Progressive Cancellation Overlay */}
        <CancelProgressModal visible={isCancelling} stepText={cancellationStep} />
        {/* Pro Reviews Modal */}
        <UserReviewsModal isVisible={proReviewsVisible} onClose={() => { setProReviewsVisible(false); setSelectedProInfo(null); }} userId={selectedProInfo?.id} userName={selectedProInfo?.name || ''} role="pro" />
      </View>
    </SafeAreaView>
  );
}
