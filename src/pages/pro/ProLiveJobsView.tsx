import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    StatusBar,
    ScrollView,
    RefreshControl,
    Switch,
    Animated,
    Dimensions,
    ToastAndroid,
    Platform,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/colors';
import { getWorkerTasksFromBackend, getTaskByIdFromBackend } from '@/services/task';
import useProEarningsStore from '@/store/proEarningsStore';
import { useProWebSocket, LiveJob } from '@/hooks/useProWebSocket';
import { sendQuickBidViaWebSocket, useBiddingWebSocket } from '@/hooks/useBiddingWebSocket';
import JobCard from '@/components/pro/JobCard';
import JobDetailBottomSheet from '@/components/pro/JobDetailBottomSheet';
import ProDrawerPanel from '@/components/pro/ProDrawerPanel';
import ProActiveTaskModal from '@/components/pro/ProActiveTaskModal';
import ReviewModal from '@/components/ReviewModal';
import { useActiveBids } from '@/hooks/useActiveBids';
import { updateTaskStatusOnBackend, getCompletedStatusId } from '@/services/task';
import { createReview } from '@/services/review';

function ActiveBidListener({
    jobId,
    userId,
    onAccepted,
    onAssignedToOther,
}: {
    jobId: number;
    userId: number | undefined;
    onAccepted: (jobId: number, bid: any) => void;
    onAssignedToOther: (jobId: number) => void;
}) {
    useBiddingWebSocket({
        taskId: jobId,
        userId,
        isCustomer: false,
        enabled: Boolean(jobId && userId),
        onBidAccepted: (bid) => {
            console.log(`[ActiveBidListener] bid_accepted for job ${jobId}, user_id=${bid.user_id}, myUserId=${userId}`);
            if (String(bid.user_id) === String(userId)) {
                onAccepted(jobId, bid);
            }
        },
        onTaskAssignedToOther: (closedId) => {
            console.log(`[ActiveBidListener] Task ${closedId} assigned to another pro`);
            onAssignedToOther(closedId);
        },
    });
    return null;
}

const { width } = Dimensions.get('window');

// ─── MOCK jobs for when WS isn't connected yet ────────────────────────────────
const MOCK_JOBS: LiveJob[] = [
    {
        id: 1,
        title: 'Split AC install — 1.5 ton',
        category: 'AC Service',
        budget: 4200,
        distance_km: 5.0,
        location_name: 'Cavalry Ground, Lahore',
        location_area: 'Main Cavalry Chowk',
        customer_name: 'Zara Anwar',
        customer_rating: 4.8,
        scheduled_date: new Date().toISOString(),
        description: 'Looking for a professional to install a new split AC (1.5 ton) in my living room. Low floor installation, mounting bracket is already fixed. Please bring vacuum pump and basic installation tools.',
        attachments: [
            'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500',
            'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500'
        ]
    },
    {
        id: 2,
        title: 'DB wiring — 3-bed apartment',
        category: 'Electrician',
        budget: 3500,
        distance_km: 2.3,
        location_name: 'DHA Phase 5, Lahore',
        location_area: 'Block E Commercial',
        customer_name: 'Ali Hassan',
        customer_rating: 4.5,
        description: 'Complete Distribution Box (DB) wiring for a new 3-bedroom apartment. Phase selector switch and main breaker installation required. Wiring cables are already provided.',
        attachments: [
            'https://images.unsplash.com/photo-1558224494-ef8b217500d6?w=500'
        ]
    },
    {
        id: 3,
        title: 'Bathroom tap + shower replacement',
        category: 'Plumber',
        budget: 2800,
        distance_km: 7.1,
        location_name: 'Gulberg III, Lahore',
        location_area: 'Main Boulevard',
        customer_name: 'Sana Khan',
        customer_rating: 4.9,
        description: 'Replace the existing leaking mixer tap in the master bathroom and install a new wall-mounted shower head. All hardware and taps are purchased and ready for installation.',
        attachments: []
    },
];

// ─── State Display Components ─────────────────────────────────────────────────

function OfflineState() {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <View style={states.center}>
            <Animated.View style={[states.pulseCircle, { opacity: pulseAnim }]}>
                <Ionicons name="wifi-outline" size={42} color={Colors.neutral[300]} />
            </Animated.View>
            <Animated.Text style={[states.stateText, { opacity: pulseAnim }]}>
                You are not online.
            </Animated.Text>
            <Text style={states.stateSub}>Toggle online above to start receiving jobs.</Text>
        </View>
    );
}

function SearchingState({ hasNoJobs }: { hasNoJobs: boolean }) {
    const dotAnim1 = useRef(new Animated.Value(0.3)).current;
    const dotAnim2 = useRef(new Animated.Value(0.3)).current;
    const dotAnim3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = (anim: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                ])
            );

        const a1 = pulse(dotAnim1, 0);
        const a2 = pulse(dotAnim2, 200);
        const a3 = pulse(dotAnim3, 400);
        a1.start(); a2.start(); a3.start();
        return () => { a1.stop(); a2.stop(); a3.stop(); };
    }, []);

    return (
        <View style={states.center}>
            <View style={states.searchIconBox}>
                <Ionicons name="search" size={36} color={Colors.pro.accent} />
            </View>
            {hasNoJobs ? (
                <>
                    <Text style={states.stateText}>There are no jobs at the moment.</Text>
                    <Text style={states.stateSub}>Pull down to refresh, or wait for new jobs.</Text>
                </>
            ) : (
                <>
                    <View style={states.dotsRow}>
                        <Text style={states.stateText}>Searching for jobs</Text>
                        <View style={states.dots}>
                            {[dotAnim1, dotAnim2, dotAnim3].map((a, i) => (
                                <Animated.View key={i} style={[states.dot, { opacity: a }]} />
                            ))}
                        </View>
                    </View>
                    <Text style={states.stateSub}>Stay online to receive incoming jobs.</Text>
                </>
            )}
        </View>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

import useProTaskStore from '@/store/proTaskStore';

export default function ProLiveJobsView() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, logout } = useAuth();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const { earnings, fetchEarnings } = useProEarningsStore();
    const [selectedJob, setSelectedJob] = useState<LiveJob | null>(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const { activeProTask: assignedJob, setActiveProTask: setAssignedJob } = useProTaskStore();
    const [activeModalJob, setActiveModalJob] = useState<LiveJob | null>(null);
    const [activeModalVisible, setActiveModalVisible] = useState(false);
    const [isCancelledJob, setIsCancelledJob] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [useMockData, setUseMockData] = useState(false); // Fallback while WS not configured
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [completedJobForReview, setCompletedJobForReview] = useState<LiveJob | null>(null);

    const { jobs: wsJobs, wsStatus, hasNoJobs, refresh: wsRefresh } = useProWebSocket({
        userId: user?.id,
        isOnline,
        onTaskCancelledForWorker: (taskId, workerId) => {
            handleTaskCancelledByCustomer(taskId);
        },
    });

    const { placeBid, removeBid, getActiveBid, activeJobIds } = useActiveBids(10);

    // Fetch pro earnings on mount/user load
    useEffect(() => {
        if (user?.id) {
            fetchEarnings(user.id);
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
                        created_at: activeBackendTask.created_at,
                        payment_preference_id: activeBackendTask.payment_preference_id,
                    };
                    setAssignedJob(restoredJob);
                }
            } else {
                // If backend has no active task for worker, clear stale MMKV assigned job!
                const currentAssigned = useProTaskStore.getState().activeProTask;
                if (currentAssigned) {
                    console.log('[ProLiveJobsView] Backend has no active task for worker. Clearing stale MMKV assigned job.');
                    setAssignedJob(null);
                }
            }
        }).catch((err) => {
            console.warn('[ProLiveJobsView] Sync worker active task error:', err);
        });
    }, [user?.id, setAssignedJob]);

    // Verify active assigned job directly against backend endpoint periodically
    useEffect(() => {
        if (!assignedJob?.id) return;
        let isMounted = true;
        const verifyAssignedJob = async () => {
            try {
                const backendTask = await getTaskByIdFromBackend(Number(assignedJob.id));
                if (!isMounted) return;
                if (!backendTask || backendTask.status_id === 5 || backendTask.status_id === 3) {
                    console.log(`[ProLiveJobsView] Assigned job ${assignedJob.id} no longer exists or was cancelled on backend. Clearing local MMKV.`);
                    setAssignedJob(null);
                    Alert.alert('Task Removed', 'This assigned task was deleted or cancelled.');
                }
            } catch (e) {
                console.warn('[ProLiveJobsView] Error verifying assigned job:', e);
            }
        };

        verifyAssignedJob();
        const interval = setInterval(verifyAssignedJob, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [assignedJob?.id, setAssignedJob]);

    // Filter available live jobs to exclude assigned job
    const displayJobs: LiveJob[] = (wsJobs.length > 0)
        ? wsJobs.filter((j) => !assignedJob || Number(j.id) !== Number(assignedJob.id))
        : (isOnline && useMockData ? MOCK_JOBS.filter((j) => !assignedJob || Number(j.id) !== Number(assignedJob.id)) : []);

    const handleTaskCancelledByCustomer = useCallback((cancelledTaskId: number) => {
        console.log(`[ProLiveJobsView] handleTaskCancelledByCustomer triggered for taskId=${cancelledTaskId}`);
        const targetId = Number(cancelledTaskId);

        // Always clear assignedJob to immediately remove top "Active Job in Progress" indicator banner
        setAssignedJob(null);

        // Find cancelled job details from assignedJob, activeModalJob, displayJobs, or fallback
        let job = (assignedJob && Number(assignedJob.id) === targetId ? assignedJob : null)
            || (activeModalJob && Number(activeModalJob.id) === targetId ? activeModalJob : null)
            || displayJobs.find((j) => Number(j.id) === targetId)
            || wsJobs.find((j) => Number(j.id) === targetId);

        if (!job) {
            job = {
                id: targetId,
                title: `Task #${targetId}`,
                category: 'Service',
                budget: 0,
                location_name: 'Customer Location',
                customer_name: 'Customer',
                description: 'This task was cancelled by the customer.',
            };
        }

        setIsCancelledJob(true);
        setActiveModalJob(job);
        setActiveModalVisible(true);
    }, [assignedJob, activeModalJob, displayJobs, wsJobs]);

    const isJobsAvailable = isOnline && displayJobs.length > 0;

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await wsRefresh();
        } finally {
            setIsRefreshing(false);
        }
    }, [wsRefresh]);

    const handleJobAcceptedForPro = useCallback((jobId: number, bid?: any) => {
        console.log(`[ProLiveJobsView] handleJobAcceptedForPro called for jobId=${jobId}`, bid);
        const targetId = Number(jobId);
        let job = displayJobs.find((j) => Number(j.id) === targetId) || (selectedJob?.id === targetId ? selectedJob : null);

        if (!job) {
            job = {
                id: targetId,
                title: `Task #${targetId}`,
                category: 'Service',
                budget: bid?.price || 0,
                location_name: 'Customer Location',
                customer_name: bid?.user_name || 'Customer',
                customer_rating: 4.8,
                description: bid?.estimated_hours ? `Estimated duration: ${bid.estimated_hours} hours` : 'Job accepted',
            };
        } else if (bid?.price) {
            job = { ...job, budget: bid.price };
        }

        setAssignedJob(job);
        setActiveModalJob(job);
        setActiveModalVisible(true);
        setSheetVisible(false);
        removeBid(targetId);
    }, [displayJobs, selectedJob, removeBid]);

    const handleTaskAssignedToOther = useCallback((jobId: number) => {
        console.log(`[ProLiveJobsView] Cleaning up active bid for assigned task ${jobId}`);
        removeBid(jobId);
    }, [removeBid]);

    const handleCompleteTask = useCallback(async (job: LiveJob) => {
        console.log(`[ProLiveJobsView] Marking task ${job.id} as completed...`);
        try {
            const completedStatusId = await getCompletedStatusId();
            await updateTaskStatusOnBackend(job.id, completedStatusId);
            console.log(`[ProLiveJobsView] Backend task ${job.id} updated to Completed status (${completedStatusId}).`);

            // Only clear assigned job and show review modal if API call succeeded
            setAssignedJob(null);
            setActiveModalVisible(false);

            // Force refresh earnings metrics from backend immediately
            if (user?.id) {
                fetchEarnings(user.id, true).catch(() => {});
            }

            // Open review modal for pro to rate customer
            setCompletedJobForReview(job);
            setReviewModalVisible(true);
        } catch (err: any) {
            console.error('[ProLiveJobsView] Failed to update backend task status to Completed:', err);
            Alert.alert(
                'Connection Error',
                'Failed to mark task as completed due to a connection error. Please check your internet connection and try again.'
            );
            throw err;
        }
    }, []);

    const handleProSubmitReview = useCallback(async (rating: number, body: string) => {
        if (!completedJobForReview || !user?.id) return;
        const targetUserId = completedJobForReview.customer_id || 1;
        await createReview({
            user_id: targetUserId,
            task_id: completedJobForReview.id,
            given_by: user.id,
            rating,
            body,
        });
    }, [completedJobForReview, user?.id]);

    const handleQuickBid = (job: LiveJob, amount: number) => {
        if (assignedJob) {
            Alert.alert(
                'Active Job in Progress',
                'You already have an active job in progress! Please complete your current job before bidding on another task.',
                [{ text: 'OK' }]
            );
            return;
        }
        console.log(`[ProLiveJobsView] Quick bid: job=${job.id}, amount=${amount}`);
        placeBid(job.id, amount);
        if (user?.id && job.id) {
            sendQuickBidViaWebSocket(job.id, user.id, amount, 1).catch((err) => {
                console.warn('[ProLiveJobsView] WS quick bid dispatch error:', err);
            });
        }
    };

    const handleOpenJobDetail = (job: LiveJob) => {
        setSelectedJob(job);
        setSheetVisible(true);
    };

    const initials = user?.displayName
        ? user.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
        : 'A';

    const totalEarningsVal = earnings?.total_earning ?? earnings?.daily_earning ?? 0;
    const totalJobsVal = earnings?.total_jobs_done ?? earnings?.jobs_done ?? earnings?.daily_jobs_done ?? 0;
    const totalEarningsText = `Rs. ${totalEarningsVal.toLocaleString()}`;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.pro.header} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => setDrawerOpen(true)} hitSlop={10} style={styles.headerBtn}>
                        <Ionicons name="menu" size={26} color={Colors.white} />
                    </Pressable>
                    <View style={styles.headerTitleRow}>
                        <Text style={styles.headerTitle}>Live Jobs</Text>
                        {isOnline && (
                            <View style={styles.livePill}>
                                <View style={styles.liveDot} />
                                <Text style={styles.livePillText}>LIVE</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Pressable style={styles.avatarBtn} onPress={() => setDrawerOpen(true)}>
                    {user?.profile_pic ? (
                        <Image source={{ uri: user.profile_pic }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Persistent Active Job Banner */}
            {assignedJob && (
                <Pressable
                    style={styles.activeJobBanner}
                    onPress={() => {
                        setActiveModalJob(assignedJob);
                        setActiveModalVisible(true);
                    }}
                >
                    <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                    <View style={styles.activeBannerTextCol}>
                        <Text style={styles.activeBannerTitle}>Active Job In Progress</Text>
                        <Text style={styles.activeBannerSub} numberOfLines={1}>
                            {assignedJob.title} — Tap to view details & contact customer
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.white} />
                </Pressable>
            )}

            {/* Sub-header: earnings + jobs count */}
            <View style={styles.subHeader}>
                <View>
                    <Text style={styles.subLabel}>Total Earnings</Text>
                    <Text style={styles.subValue}>{totalEarningsText}</Text>
                </View>
                <View style={styles.subDivider} />
                <View style={styles.subRight}>
                    <Text style={styles.subLabel}>Jobs Done</Text>
                    <Text style={styles.subValueRight}>{totalJobsVal}</Text>
                </View>
            </View>

            {/* Online Toggle Bar */}
            <View style={styles.onlineBar}>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? Colors.pro.accent : Colors.neutral[500] }]} />
                <Text style={styles.onlineBarText}>
                    {isOnline ? "You're Online — receiving jobs" : "You're Offline"}
                </Text>
                <Switch
                    value={isOnline}
                    onValueChange={setIsOnline}
                    trackColor={{ false: Colors.neutral[600], true: Colors.pro.accentDim }}
                    thumbColor={Colors.white}
                />
            </View>

            {/* Main Content */}
            {!isOnline ? (
                <OfflineState />
            ) : !isJobsAvailable ? (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={Colors.pro.accent}
                            colors={[Colors.pro.accent]}
                        />
                    }
                >
                    <SearchingState hasNoJobs={hasNoJobs} />
                </ScrollView>
            ) : (
                <ScrollView
                    style={styles.jobList}
                    contentContainerStyle={[styles.jobListContent, { paddingBottom: insets.bottom + 24 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={Colors.pro.accent}
                            colors={[Colors.pro.accent]}
                        />
                    }
                >
                    {isRefreshing && (
                        <View style={styles.refreshingBanner}>
                            <Text style={styles.refreshingText}>Refreshing...</Text>
                        </View>
                    )}
                    {displayJobs.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            onPress={handleOpenJobDetail}
                            onQuickBid={handleQuickBid}
                            activeBid={getActiveBid(job.id)}
                            hasActiveTask={Boolean(assignedJob)}
                        />
                    ))}
                </ScrollView>
            )}

            {/* Job Detail Bottom Sheet */}
            <JobDetailBottomSheet
                job={selectedJob}
                isVisible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                activeBid={selectedJob ? getActiveBid(selectedJob.id) : null}
                hasActiveTask={Boolean(assignedJob)}
                onPlaceBid={(job, amount) => {
                    if (assignedJob) {
                        Alert.alert(
                            'Active Job in Progress',
                            'You already have an active job in progress! Please complete your current job before bidding on another task.',
                            [{ text: 'OK' }]
                        );
                        return;
                    }
                    placeBid(job.id, amount);
                }}
                onBidAccepted={(job, amount) => {
                    console.log(`[ProLiveJobsView] onBidAccepted from detail sheet for job ${job.id}, amount ${amount}`);
                    handleJobAcceptedForPro(job.id, { price: amount });
                }}
            />

            {/* Drawer */}
            <ProDrawerPanel
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                activeRoute="live-jobs"
                isOnline={isOnline}
                onToggleOnline={() => setIsOnline((v) => !v)}
            />
            {/* Active Bids Socket Listeners (for quick bids feedback) */}
            {activeJobIds.map((id) => (
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

// ─── State Styles ─────────────────────────────────────────────────────────────
const states = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    pulseCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    searchIconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(34,197,94,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stateText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    stateSub: {
        color: Colors.neutral[400],
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dots: {
        flexDirection: 'row',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.pro.accent,
    },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.pro.bg,
    },
    header: {
        backgroundColor: Colors.pro.header,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerBtn: {
        padding: 4,
    },
    activeJobBanner: {
        backgroundColor: '#059669',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    activeBannerTextCol: {
        flex: 1,
    },
    activeBannerTitle: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    activeBannerSub: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        marginTop: 2,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: '700',
    },
    livePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.pro.liveChip,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.pro.accent,
    },
    livePillText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    avatarBtn: {},
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.pro.accentDim,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    subHeader: {
        backgroundColor: Colors.pro.header,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 16,
    },
    subLabel: {
        color: Colors.neutral[500],
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 3,
    },
    subValue: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: '700',
    },
    subDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    subRight: {
        alignItems: 'flex-end',
    },
    subValueRight: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'right',
    },
    onlineBar: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    onlineBarText: {
        flex: 1,
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    jobList: {
        flex: 1,
    },
    jobListContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    refreshingBanner: {
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    refreshingText: {
        color: Colors.pro.accent,
        fontSize: 13,
        fontWeight: '600',
    },
});
