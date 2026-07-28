import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    StatusBar,
    Dimensions,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/colors';
import ProDrawerPanel from '@/components/pro/ProDrawerPanel';
import { getProEarnings } from '@/services/proEarnings';
import { getWorkerTasksFromBackend } from '@/services/task';
import useProEarningsStore from '@/store/proEarningsStore';
import useProOnlineStore from '@/store/proOnlineStore';
import { ProEarnings } from '@/types';
import styles from '@/styles/proDashboardView.styles';

const { width } = Dimensions.get('window');

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CHART_DATA = [
    { day: 'Mon', value: 2000 },
    { day: 'Tue', value: 3600 },
    { day: 'Wed', value: 1800 },
    { day: 'Thu', value: 4200 },
    { day: 'Fri', value: 5800 },
    { day: 'Sat', value: 9600 },
    { day: 'Sun', value: 6400 },
];
const MAX_CHART_VALUE = Math.max(...CHART_DATA.map((d) => d.value));

function formatLastSynced(timestamp: number | null): string {
    if (!timestamp) return 'Just now';
    const ageSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (ageSeconds < 60) return 'Just now';
    const ageMinutes = Math.floor(ageSeconds / 60);
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours}h ago`;
}

function getRemainingCacheTime(timestamp: number | null): string {
    if (!timestamp) return '10m';
    const CACHE_TTL_MS = 10 * 60 * 1000;
    const elapsed = Date.now() - timestamp;
    const remainingMs = Math.max(0, CACHE_TTL_MS - elapsed);
    const remainingMins = Math.ceil(remainingMs / (60 * 1000));
    return remainingMins <= 0 ? 'now' : `${remainingMins}m`;
}

const RECENT_JOBS = [
    { id: '1', title: 'AC repair service', address: 'Phase 2, Industrial Area', amount: 'Rs 8,500', icon: 'snow', color: '#3B82F6' },
    { id: '2', title: 'Appliance Repair', address: 'Model Town, Phase 2', amount: 'Rs 6,000', icon: 'flash', color: '#F97316' },
    { id: '3', title: 'Home Cleaning', address: 'Green Enclave, Phase 1', amount: 'Rs 4,200', icon: 'sparkles', color: '#EAB308' },
    { id: '4', title: 'Painting Service', address: 'Urban Vistas, Phase 3', amount: 'Rs 10,500', icon: 'brush', color: '#EC4899' },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    sub,
    subPositive,
    iconName,
    iconColor,
}: {
    label: string;
    value: string;
    sub: string;
    subPositive?: boolean;
    iconName: string;
    iconColor: string;
}) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: `${iconColor}18` }]}>
                <Ionicons name={iconName as any} size={20} color={iconColor} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statSub, subPositive && styles.statSubPositive]}>{sub}</Text>
        </View>
    );
}

function EarningsChart() {
    const CHART_H = 80;
    return (
        <View style={styles.chartContainer}>
            {CHART_DATA.map((item) => {
                const barH = Math.max(8, (item.value / MAX_CHART_VALUE) * CHART_H);
                return (
                    <View key={item.day} style={styles.chartBar}>
                        <View style={[styles.bar, { height: barH }]} />
                        <Text style={styles.chartDayLabel}>{item.day}</Text>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProDashboardView() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { isOnline, setIsOnline, toggleOnline } = useProOnlineStore();
    const { earnings, fetchEarnings, lastFetchedAt } = useProEarningsStore();
    const [loadingEarnings, setLoadingEarnings] = useState(true);
    const [recentJobs, setRecentJobs] = useState<any[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.id) return;
            try {
                const [, tasksRes] = await Promise.allSettled([
                    fetchEarnings(user.id),
                    getWorkerTasksFromBackend(user.id),
                ]);

                if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value)) {
                    const mapped = tasksRes.value.slice(0, 5).map((t) => ({
                        id: t.id?.toString() || Math.random().toString(),
                        title: t.subject || 'Service Task',
                        address: t.body || 'Specified Location',
                        amount: `Rs. ${t.price ? t.price.toLocaleString() : '0'}`,
                        icon: t.status_id === 4 ? 'checkmark-circle' : t.status_id === 5 ? 'close-circle' : 'briefcase',
                        color: t.status_id === 4 ? '#22C55E' : t.status_id === 5 ? '#EF4444' : '#3B82F6',
                        status: t.status_id === 4 ? 'Done' : t.status_id === 5 ? 'Cancelled' : 'Active',
                    }));
                    setRecentJobs(mapped);
                }
            } catch (err) {
                console.error('[ProDashboardView] Error fetching dashboard data:', err);
            } finally {
                setLoadingEarnings(false);
                setLoadingJobs(false);
            }
        };
        fetchDashboardData();
    }, [user?.id]);

    const initials = user?.displayName
        ? user.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
        : 'A';

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.pro.header} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => setDrawerOpen(true)} hitSlop={10} style={styles.headerBtn}>
                    <Ionicons name="menu" size={26} color={Colors.white} />
                </Pressable>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Pressable style={styles.avatarBtn} onPress={() => router.push('/edit-profile')}>
                    {user?.profile_pic ? (
                        <Image source={{ uri: user.profile_pic }} style={styles.headerAvatarImage} />
                    ) : (
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Offline/Online status pill */}
            <View style={[styles.statusBar, { backgroundColor: Colors.pro.header }]}>
                <View style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}>
                    <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.pro.accent : Colors.neutral[400] }]} />
                    <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Sync & Cache Indicator Bar */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: Colors.white,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginBottom: 4,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons name="time-outline" size={15} color={Colors.neutral[500]} />
                        <Text style={{ fontSize: 12, color: Colors.neutral[600], fontWeight: '500' }}>
                            Last synced: <Text style={{ fontWeight: '700', color: Colors.neutral[800] }}>{formatLastSynced(lastFetchedAt)}</Text> • Next update in <Text style={{ fontWeight: '700', color: Colors.pro.accent }}>{getRemainingCacheTime(lastFetchedAt)}</Text>
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => {
                            if (user?.id) fetchEarnings(user.id, true);
                        }}
                        hitSlop={8}
                        style={{ paddingLeft: 8 }}
                    >
                        <Ionicons name="refresh" size={16} color={Colors.pro.accent} />
                    </Pressable>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        label="This Week"
                        value={loadingEarnings ? "..." : `Rs. ${earnings?.weekly_earning?.toLocaleString() || '0'}`}
                        sub="Earned this week"
                        iconName="trending-up"
                        iconColor="#22C55E"
                    />
                    <StatCard
                        label="Total Earned"
                        value={loadingEarnings ? "..." : `Rs. ${earnings?.total_earning?.toLocaleString() || '0'}`}
                        sub={`${earnings?.total_jobs_done ?? earnings?.jobs_done ?? 0} jobs`}
                        iconName="wallet-outline"
                        iconColor="#F97316"
                    />
                    <StatCard
                        label="Jobs Done"
                        value={loadingEarnings ? "..." : `${earnings?.total_jobs_done ?? earnings?.jobs_done ?? 0}`}
                        sub="Completed jobs"
                        iconName="cube-outline"
                        iconColor="#3B82F6"
                    />
                    <StatCard
                        label="Avg Rating"
                        value={user?.overall_rating != null ? `${Number(user.overall_rating).toFixed(1)} ★` : "5.0 ★"}
                        sub="Recent rating"
                        iconName="star-outline"
                        iconColor="#EAB308"
                    />
                </View>

                {/* Weekly Earnings Chart */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>This Week's Earnings</Text>
                        <Pressable>
                            <Text style={styles.sectionLink}>Full report →</Text>
                        </Pressable>
                    </View>

                    <View style={styles.chartCard}>
                        <View style={styles.chartYAxis}>
                            <Text style={styles.chartAxisLabel}>12k</Text>
                            <Text style={styles.chartAxisLabel}>6k</Text>
                            <Text style={styles.chartAxisLabel}>0k</Text>
                        </View>
                        <EarningsChart />
                    </View>
                </View>

                {/* Go Online CTA Banner */}
                <Pressable
                    style={styles.ctaBanner}
                    onPress={() => {
                        setIsOnline(true);
                        router.push('/(protected)/(pro)/live-jobs');
                    }}
                >
                    <View style={styles.ctaIconBox}>
                        <Ionicons name="flash" size={22} color={Colors.white} />
                    </View>
                    <View style={styles.ctaText}>
                        <Text style={styles.ctaTitle}>Go online to receive jobs</Text>
                        <Text style={styles.ctaSub}>Jobs come to you</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={22} color={Colors.white} />
                </Pressable>

                {/* Recent Jobs */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Jobs</Text>
                        <Pressable onPress={() => router.push('/(protected)/(pro)/job-history')}>
                            <Text style={styles.sectionLink}>Full history →</Text>
                        </Pressable>
                    </View>

                    <View style={styles.recentJobsCard}>
                        {loadingJobs ? (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                                <Text style={{ color: Colors.neutral[400], fontSize: 13 }}>Loading recent jobs...</Text>
                            </View>
                        ) : recentJobs.length === 0 ? (
                            <View style={styles.emptyStateContainer}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="briefcase-outline" size={24} color={Colors.neutral[300]} />
                                </View>
                                <Text style={styles.emptyStateTitle}>No recent jobs</Text>
                                <Text style={styles.emptyStateSub}>Assigned/completed jobs will appear here</Text>
                            </View>
                        ) : (
                            recentJobs.map((job, index) => (
                                <View key={job.id}>
                                    <View style={styles.recentJobRow}>
                                        <View style={[styles.jobIconBox, { backgroundColor: `${job.color}18` }]}>
                                            <Ionicons name={job.icon as any} size={18} color={job.color} />
                                        </View>
                                        <View style={styles.jobInfo}>
                                            <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                                            <Text style={styles.jobAddress} numberOfLines={1}>{job.address}</Text>
                                        </View>
                                        <View style={styles.jobRight}>
                                            <Text style={styles.jobAmount}>{job.amount}</Text>
                                            <View style={[styles.doneBadge, { backgroundColor: `${job.color}18` }]}>
                                                <Text style={[styles.doneBadgeText, { color: job.color }]}>
                                                    {job.status}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    {index < recentJobs.length - 1 && <View style={styles.jobDivider} />}
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Drawer */}
            <ProDrawerPanel
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                activeRoute="dashboard"
                isOnline={isOnline}
                onToggleOnline={toggleOnline}
            />
        </View>
    );
}
