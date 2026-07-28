import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    StatusBar,
    ScrollView,
    RefreshControl,
    Switch,
    Dimensions,
    ToastAndroid,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/colors';
import { getWorkerTasksFromBackend, getTaskByIdFromBackend, updateTaskStatusOnBackend, getCompletedStatusId } from '@/services/task';
import useProEarningsStore from '@/store/proEarningsStore';
import useProTaskStore from '@/store/proTaskStore';
import useProOnlineStore from '@/store/proOnlineStore';
import { useProWebSocket, LiveJob } from '@/hooks/useProWebSocket';
import { sendQuickBidViaWebSocket } from '@/hooks/useBiddingWebSocket';
import JobCard from '@/components/pro/JobCard';
import JobDetailBottomSheet from '@/components/pro/JobDetailBottomSheet';
import ProDrawerPanel from '@/components/pro/ProDrawerPanel';
import ProActiveTaskModal from '@/components/pro/ProActiveTaskModal';
import ReviewModal from '@/components/ReviewModal';
import { ActiveBidListener } from '@/components/pro/ActiveBidListener';
import { OfflineState, SearchingState } from '@/components/pro/ProLiveJobsStates';
import { useProLiveLocation } from '@/hooks/useProLiveLocation';
import { registerForPushNotificationsAsync } from '@/services/notificationService';
import { useActiveBids } from '@/hooks/useActiveBids';
import { createReview } from '@/services/review';
import { styles } from '@/styles/proLiveJobsView.styles';
import { MOCK_JOBS } from '@/constants/mockJobs';

const { width } = Dimensions.get('window');

export default function ProLiveJobsView() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { proLocation } = useProLiveLocation();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const { isOnline, setIsOnline, toggleOnline } = useProOnlineStore();

    // Register push notification channel and permissions when online
    useEffect(() => {
        if (isOnline) {
            registerForPushNotificationsAsync();
        }
    }, [isOnline]);

    const { earnings, fetchEarnings } = useProEarningsStore();
    const [selectedJob, setSelectedJob] = useState<LiveJob | null>(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const { activeProTask: assignedJob, setActiveProTask: setAssignedJob } = useProTaskStore();
    const [activeModalJob, setActiveModalJob] = useState<LiveJob | null>(null);
    const [activeModalVisible, setActiveModalVisible] = useState(false);
    const [isCancelledJob, setIsCancelledJob] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [useMockData, setUseMockData] = useState(false);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [completedJobForReview, setCompletedJobForReview] = useState<LiveJob | null>(null);

    const { jobs: wsJobs, wsStatus, hasNoJobs, refresh: wsRefresh } = useProWebSocket({
        userId: user?.id,
        isOnline,
        onTaskCancelledForWorker: (taskId, workerId) => {
            handleTaskCancelledByCustomer(taskId);
        },
        proLocation,
    });

    const { placeBid, removeBid, getActiveBid, activeJobIds } = useActiveBids(10);

    // Fetch pro earnings on mount/user load
    useEffect(() => {
        if (user?.id) {
            fetchEarnings(user.id, true);
        }
    }, [user?.id, fetchEarnings]);

    // Sync active worker task from backend on load to verify MMKV state against backend
    useEffect(() => {
        if (!user?.id) return;
        getWorkerTasksFromBackend(user.id).then((tasks) => {
            const activeBackendTask = Array.isArray(tasks) ? tasks.find((t) => t.status_id !== 4 && t.status_id !== 5 && t.status_id !== 3) : undefined;
            if (activeBackendTask) {
                const currentAssigned = useProTaskStore.getState().activeProTask;
                if (!currentAssigned || Number(currentAssigned.id) !== Number(activeBackendTask.id)) {
                    const restoredJob: LiveJob = {
                        id: activeBackendTask.id!,
                        title: activeBackendTask.subject || 'Active Task',
                        description: activeBackendTask.body || '',
                        category: 'Active Service',
                        budget: activeBackendTask.price,
                        location_name: 'Customer Location',
                        customer_id: activeBackendTask.created_by,
                        customer_name: (activeBackendTask as any).customer_name || 'Customer',
                    };
                    setAssignedJob(restoredJob);
                }
            } else {
                setAssignedJob(null);
            }
        }).catch((err) => {
            console.warn('[ProLiveJobsView] Sync worker tasks error:', err);
        });
    }, [user?.id]);

    const handleTaskCancelledByCustomer = useCallback((taskId: number) => {
        const currentAssigned = useProTaskStore.getState().activeProTask;
        if (currentAssigned && Number(currentAssigned.id) === Number(taskId)) {
            setIsCancelledJob(true);
            setActiveModalJob(currentAssigned);
            setActiveModalVisible(true);
        }
    }, []);

    const handleJobAcceptedForPro = useCallback((jobId: number, bidPayload: any) => {
        console.log(`[ProLiveJobsView] handleJobAcceptedForPro called for job ${jobId}`);
        const found = wsJobs.find((j) => Number(j.id) === Number(jobId)) ||
            MOCK_JOBS.find((j) => Number(j.id) === Number(jobId)) ||
            (selectedJob && Number(selectedJob.id) === Number(jobId) ? selectedJob : null);

        if (found) {
            const assigned: LiveJob = {
                ...found,
                budget: bidPayload?.price || found.budget,
            };
            setAssignedJob(assigned);
            setActiveModalJob(assigned);
            setIsCancelledJob(false);
            setActiveModalVisible(true);
            setSheetVisible(false);
        }
    }, [wsJobs, selectedJob, setAssignedJob]);

    const handleTaskAssignedToOther = useCallback((closedTaskId: number) => {
        removeBid(closedTaskId);
        if (selectedJob && Number(selectedJob.id) === Number(closedTaskId)) {
            setSheetVisible(false);
            if (Platform.OS === 'android') {
                ToastAndroid.show('This job was assigned to another professional.', ToastAndroid.SHORT);
            } else {
                Alert.alert('Job Closed', 'This job was assigned to another professional.');
            }
        }
    }, [selectedJob, removeBid]);

    const handleCompleteTask = async () => {
        if (!assignedJob) return;
        const targetJob = assignedJob;
        try {
            const completedStatusId = await getCompletedStatusId();
            await updateTaskStatusOnBackend(targetJob.id, completedStatusId);
        } catch (err) {
            console.warn('[ProLiveJobsView] Complete task status update error:', err);
        }
        setAssignedJob(null);
        setActiveModalVisible(false);
        setCompletedJobForReview(targetJob);
        setReviewModalVisible(true);
        if (user?.id) fetchEarnings(user.id, true);
    };

    const handleProSubmitReview = async (rating: number, body: string) => {
        if (!completedJobForReview || !user?.id) return;
        const targetUserId = completedJobForReview.customer_id || 1;
        await createReview({
            user_id: targetUserId,
            task_id: completedJobForReview.id,
            given_by: user.id,
            rating,
            body,
        });
        setCompletedJobForReview(null);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await wsRefresh();
        if (user?.id) await fetchEarnings(user.id, true);
        setIsRefreshing(false);
    };

    const displayJobs = isOnline
        ? (useMockData ? MOCK_JOBS : wsJobs)
        : [];

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0A1810" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12) }]}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => setDrawerOpen(true)} style={styles.headerBtn}>
                        <Ionicons name="menu" size={24} color="#FFFFFF" />
                    </Pressable>
                    <View style={styles.headerTitleRow}>
                        <Text style={styles.headerTitle}>KaamKrwao Pro</Text>
                        <View style={styles.livePill}>
                            <View style={[styles.liveDot, { backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }]} />
                            <Text style={styles.livePillText}>{isOnline ? 'LIVE' : 'OFF'}</Text>
                        </View>
                    </View>
                </View>
                <Switch
                    value={isOnline}
                    onValueChange={toggleOnline}
                    trackColor={{ false: '#374151', true: '#22C55E' }}
                    thumbColor="#FFFFFF"
                />
            </View>

            {/* SubHeader / Earnings */}
            {isOnline && (
                <View style={styles.subHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.subLabel}>Today's Earnings</Text>
                        <Text style={styles.subValue}>
                            Rs. {(earnings?.daily_earning ?? (earnings as any)?.daily_earnings ?? (earnings as any)?.daily_amount ?? 0).toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.subDivider} />
                    <View style={styles.subRight}>
                        <Text style={styles.subLabel}>Jobs Completed</Text>
                        <Text style={styles.subValueRight}>
                            {earnings?.daily_jobs_done ?? earnings?.jobs_done ?? (earnings as any)?.total_jobs_done ?? 0}
                        </Text>
                    </View>
                </View>
            )}

            {/* Content Area */}
            {!isOnline ? (
                <OfflineState />
            ) : displayJobs.length === 0 ? (
                <SearchingState hasNoJobs={hasNoJobs} />
            ) : (
                <ScrollView
                    style={styles.jobList}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#22C55E']} />
                    }
                >
                    {displayJobs.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            onPress={(j) => {
                                setSelectedJob(j);
                                setSheetVisible(true);
                            }}
                            onQuickBid={(j, amt) => {
                                if (assignedJob) {
                                    Alert.alert(
                                        'Active Task in Progress',
                                        'You already have an accepted job in progress. Complete your current job before bidding.'
                                    );
                                    return;
                                }
                                sendQuickBidViaWebSocket(j.id, amt, user?.id || 1);
                                placeBid(j.id, amt);
                            }}
                            activeBid={getActiveBid(job.id)}
                            hasActiveTask={Boolean(assignedJob)}
                        />
                    ))}
                </ScrollView>
            )}

            {/* Bottom Sheet */}
            <JobDetailBottomSheet
                job={selectedJob}
                isVisible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                activeBid={selectedJob ? getActiveBid(selectedJob.id) : null}
                hasActiveTask={Boolean(assignedJob)}
                onPlaceBid={(job, amount) => {
                    if (assignedJob) {
                        Alert.alert(
                            'Active Task in Progress',
                            'You already have an accepted job in progress. Complete your current job before bidding.'
                        );
                        return;
                    }
                    placeBid(job.id, amount);
                }}
                onBidAccepted={(job, amount) => {
                    handleJobAcceptedForPro(job.id, { price: amount });
                }}
            />

            {/* Drawer */}
            <ProDrawerPanel
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                activeRoute="live-jobs"
                isOnline={isOnline}
                onToggleOnline={toggleOnline}
            />

            {/* Active Bids Socket Listeners */}
            {activeJobIds.map((id: number) => (
                <ActiveBidListener
                    key={id}
                    jobId={id}
                    userId={user?.id}
                    onAccepted={handleJobAcceptedForPro}
                    onAssignedToOther={handleTaskAssignedToOther}
                />
            ))}

            {/* Pro Active Task Modal */}
            <ProActiveTaskModal
                job={activeModalJob}
                isVisible={activeModalVisible}
                isCancelled={isCancelledJob}
                onClose={() => {
                    setActiveModalVisible(false);
                    setIsCancelledJob(false);
                }}
                onCompleteTask={handleCompleteTask}
            />

            {/* Pro Review Modal */}
            <ReviewModal
                isVisible={reviewModalVisible}
                onClose={() => {
                    setReviewModalVisible(false);
                    setCompletedJobForReview(null);
                }}
                onSubmit={handleProSubmitReview}
                targetName={completedJobForReview?.customer_name || 'Customer'}
                role="pro"
                taskTitle={completedJobForReview?.title}
            />
        </View>
    );
}
