import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/colors';
import { getWorkerTasksFromBackend } from '@/services/task';
import { BackendTask } from '@/types';

export default function ProJobHistoryRoute() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();

    const [tasks, setTasks] = useState<BackendTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'completed' | 'active' | 'cancelled'>('all');

    const fetchWorkerTasks = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await getWorkerTasksFromBackend(user.id);
            setTasks(data || []);
        } catch (err) {
            console.error('[ProJobHistory] Error fetching worker tasks:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchWorkerTasks();
    }, [fetchWorkerTasks]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWorkerTasks();
    };

    const filteredTasks = tasks.filter((t) => {
        if (filter === 'completed') return t.status_id === 4;
        if (filter === 'cancelled') return t.status_id === 5;
        if (filter === 'active') return t.status_id !== 4 && t.status_id !== 5;
        return true;
    });

    const getStatusDetails = (statusId: number) => {
        if (statusId === 4) return { label: 'Completed', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' };
        if (statusId === 5) return { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' };
        return { label: 'In Progress', color: '#D97706', bg: '#FEF3C7', icon: 'time' };
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.pro.header} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </Pressable>
                <Text style={styles.headerTitle}>Worker Job History</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'active', 'completed', 'cancelled'] as const).map((tab) => (
                    <Pressable
                        key={tab}
                        style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
                        onPress={() => setFilter(tab)}
                    >
                        <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Tasks List */}
            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={Colors.pro.accent} />
                    <Text style={styles.loadingText}>Loading history...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pro.accent} />}
                >
                    {filteredTasks.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="briefcase-outline" size={48} color={Colors.neutral[500]} />
                            <Text style={styles.emptyTitle}>No Jobs Found</Text>
                            <Text style={styles.emptySub}>No jobs match the selected filter criteria.</Text>
                        </View>
                    ) : (
                        filteredTasks.map((item) => {
                            const status = getStatusDetails(item.status_id);
                            return (
                                <View key={item.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{item.subject || 'Service Task'}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                            <Ionicons name={status.icon as any} size={12} color={status.color} style={{ marginRight: 4 }} />
                                            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                        </View>
                                    </View>

                                    {Boolean(item.body) && (
                                        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                                    )}

                                    <View style={styles.cardFooter}>
                                        <Text style={styles.cardPrice}>Rs. {item.price ? item.price.toLocaleString() : '0'}</Text>
                                        {item.created_at && (
                                            <Text style={styles.cardDate}>
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.pro.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: Colors.pro.header,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.white,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1E293B',
        gap: 8,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    tabBtnActive: {
        backgroundColor: Colors.pro.accent,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    tabTextActive: {
        color: Colors.white,
    },
    loadingBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: Colors.neutral[400],
        fontSize: 14,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.white,
    },
    emptySub: {
        fontSize: 13,
        color: Colors.neutral[400],
        textAlign: 'center',
    },
    card: {
        backgroundColor: Colors.pro.card,
        borderRadius: 14,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
        flex: 1,
        flexShrink: 1,
        marginRight: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        flexShrink: 0,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardBody: {
        fontSize: 13,
        color: Colors.neutral[300],
        lineHeight: 18,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    cardPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.pro.accent,
    },
    cardDate: {
        fontSize: 12,
        color: Colors.neutral[400],
    },
});
