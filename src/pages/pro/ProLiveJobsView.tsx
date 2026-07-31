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
import { TASK_STATUS } from '@/constants/taskStatus';
import { getWorkerTasksFromBackend, getTaskByIdFromBackend, updateTaskStatusOnBackend, getCompletedStatusId } from '@/services/task';
import { getCustomerProfile, normalizeImageUrl } from '@/services/customer';
import { getLocationById } from '@/services/location';
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
        onTaskAssignedToWorker: (taskId, workerId) => {
            handleJobAcceptedForPro(taskId, { worker_id: workerId });
        },
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
        const workerId = Number(user.id);
        if (isNaN(workerId) || workerId <= 0) return;
        let isMounted = true;
        (async () => {
            try {
                const tasks = await getWorkerTasksFromBackend(workerId);
                if (!isMounted) return;
                const activeBackendTask = Array.isArray(tasks) ? tasks.find((t) => t.status_id !== TASK_STATUS.COMPLETED && t.status_id !== TASK_STATUS.CANCELLED) : undefined;
                if (activeBackendTask) {
                    const currentAssigned = useProTaskStore.getState().activeProTask;
                    if (!currentAssigned || Number(currentAssigned.id) !== Number(activeBackendTask.id)) {
                        const restoredJob: LiveJob = {
                            id: activeBackendTask.id!,
                            title: activeBackendTask.subject || 'Active Task',
                            description: activeBackendTask.body || '',
                            category: 'Active Service',
                            subcategory: (activeBackendTask as any).subcategory,
                            budget: activeBackendTask.price,
                            payment_preference_id: activeBackendTask.payment_preference_id,
                            location_name: 'Customer Location',
                            customer_id: activeBackendTask.created_by,
                            customer_name: (activeBackendTask as any).customer_name || 'Customer',
                        };
                        setAssignedJob(restoredJob);
                    }
                } else {
                    const currentAssigned = useProTaskStore.getState().activeProTask;
                    if (currentAssigned?.id) {
                        console.log(`[ProLiveJobsView] No active task in worker list. Verifying active task ${currentAssigned.id} individually...`);
                        const singleTask = await getTaskByIdFromBackend(Number(currentAssigned.id));
                        if (!isMounted) return;
                        if (!singleTask || singleTask.status_id === TASK_STATUS.COMPLETED || singleTask.status_id === TASK_STATUS.CANCELLED) {
                            console.log(`[ProLiveJobsView] Confirmed task ${currentAssigned.id} is ended. Clearing active pro task.`);
                            setAssignedJob(null);
                        } else {
                            console.log(`[ProLiveJobsView] Task ${currentAssigned.id} is still active on backend (status_id=${singleTask.status_id}). Retaining active pro task.`);
                        }
                    }
                }
            } catch (err) {
                console.warn('[ProLiveJobsView] Sync worker tasks error:', err);
            }
        })();

        return () => { isMounted = false; };
    }, [user?.id, setAssignedJob]);

    const handleTaskCancelledByCustomer = useCallback((taskId: number) => {
        const currentAssigned = useProTaskStore.getState().activeProTask;
        if (currentAssigned && Number(currentAssigned.id) === Number(taskId)) {
            setIsCancelledJob(true);
            setActiveModalJob(currentAssigned);
            setActiveModalVisible(true);
            setAssignedJob(null);
        }
    }, [setAssignedJob]);

    const handleJobAcceptedForPro = useCallback(async (jobId: number, bidPayload: any) => {
        console.log(`[ProLiveJobsView] handleJobAcceptedForPro called for job ${jobId}`);
        let found = wsJobs.find((j) => Number(j.id) === Number(jobId)) ||
            MOCK_JOBS.find((j) => Number(j.id) === Number(jobId)) ||
            (selectedJob && Number(selectedJob.id) === Number(jobId) ? selectedJob : null);

        const baseJob: LiveJob = found || {
            id: Number(jobId),
            title: `Task #${jobId}`,
            description: 'Accepted Task',
            category: 'Active Service',
            budget: Number(bidPayload?.price || 0),
            payment_preference_id: bidPayload?.payment_preference_id,
            location_name: 'Customer Location',
            customer_id: bidPayload?.created_by || 1,
            customer_name: 'Customer',
        };

        const assigned: LiveJob = {
            ...baseJob,
            budget: bidPayload?.price ? Number(bidPayload.price) : baseJob.budget,
            payment_preference_id: bidPayload?.payment_preference_id ?? baseJob.payment_preference_id,
        };

        setAssignedJob(assigned);
        setActiveModalJob(assigned);
        setIsCancelledJob(false);
        setActiveModalVisible(true);
        setSheetVisible(false);

        try {
            const taskData = await getTaskByIdFromBackend(Number(jobId));
            if (taskData) {
                const customerId = taskData.created_by || assigned.customer_id;
                const locationId = taskData.location_id;

                let cName = (taskData as any).customer_name || assigned.customer_name;
                let cImage = (taskData as any).customer_image || assigned.customer_image;
                let cRating = (taskData as any).customer_rating || assigned.customer_rating;
                let cProfile = assigned.customer_profile;
                let locName = assigned.location_name;

                const [pRes, lRes] = await Promise.allSettled([
                    customerId ? getCustomerProfile(customerId) : Promise.resolve(null),
                    locationId ? getLocationById(locationId) : Promise.resolve(null),
                ]);

                if (pRes.status === 'fulfilled' && pRes.value) {
                    const p = pRes.value;
                    cProfile = p;
                    const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
                    if (fullName) cName = fullName;
                    cImage = normalizeImageUrl(p.image) || cImage;
                    cRating = p.overall_rating ?? cRating;
                }

                if (lRes.status === 'fulfilled' && lRes.value) {
                    locName = lRes.value.formatted_address || locName;
                }

                const enrichedJob: LiveJob = {
                    ...assigned,
                    id: taskData.id ?? Number(jobId),
                    title: taskData.subject || assigned.title,
                    description: taskData.body || assigned.description,
                    category: 'Active Service',
                    subcategory: (taskData as any).subcategory ?? assigned.subcategory,
                    budget: taskData.price ?? assigned.budget,
                    payment_preference_id: taskData.payment_preference_id ?? assigned.payment_preference_id,
                    location_name: locName,
                    customer_id: customerId,
                    customer_name: cName,
                    customer_image: cImage,
                    customer_rating: cRating,
                    customer_profile: cProfile,
                };
                setAssignedJob(enrichedJob);
                setActiveModalJob(enrichedJob);
            }
        } catch (e) {
            console.warn('[ProLiveJobsView] Async fetch task by ID failed:', e);
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

            {/* Active Task Banner */}
            {isOnline && assignedJob && (
                <Pressable
                    style={{
                        backgroundColor: '#047857',
                        marginHorizontal: 16,
                        marginTop: 12,
                        marginBottom: 4,
                        borderRadius: 12,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                    onPress={() => {
                        setActiveModalJob(assignedJob);
                        setIsCancelledJob(false);
                        setActiveModalVisible(true);
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                        <Ionicons name="flash" size={20} color="#34D399" />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                                Active Job: {assignedJob.title}
                            </Text>
                            <Text style={{ color: '#A7F3D0', fontSize: 12 }}>
                                Tap to open chat & task details
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </Pressable>
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
                                sendQuickBidViaWebSocket(j.id, user?.id || 1, amt);
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
                    if (isCancelledJob) {
                        setAssignedJob(null);
                    }
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
