import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminDrawerPanel from '@/components/admin/AdminDrawerPanel';
import SearchBar from '@/components/admin/common/SearchBar';
import EmptyState from '@/components/admin/common/EmptyState';
import ConfirmDialog from '@/components/admin/common/ConfirmDialog';
import { SkeletonCard } from '@/components/admin/common/SkeletonLoader';
import { useAdminEarnings, useDeleteWorkerEarnings } from '@/hooks/admin/useAdminEarnings';
import { AdminEarningItem } from '@/types/admin';

export default function AdminEarningsView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteWorkerId, setDeleteWorkerId] = useState<number | string | null>(null);

  const { data: earnings = [], isLoading, isRefetching, refetch } = useAdminEarnings();
  const deleteEarningMutation = useDeleteWorkerEarnings();

  const fetchEarnings = () => {
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteWorkerId) return;
    try {
      await deleteEarningMutation.mutateAsync(deleteWorkerId);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Earning record deleted', ToastAndroid.SHORT);
      } else {
        Alert.alert('Deleted', 'Earning record deleted successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not delete earnings.');
    } finally {
      setDeleteWorkerId(null);
    }
  };

  const filtered = earnings.filter((e) =>
    (e.worker_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(e.worker_id).includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Worker Earnings"
        subtitle={`Professional Financial Ledger (${filtered.length})`}
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by worker name or worker ID..."
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => fetchEarnings()}
            tintColor="#0B5A3E"
          />
        }
      >
        {isLoading && !isRefetching ? (
          <View style={{ gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No earnings records"
            subtitle="No professional earnings record matches your search."
            iconName="wallet-outline"
          />
        ) : (
          filtered.map((item) => (
            <View key={item.worker_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons name="cash" size={20} color="#0B5A3E" />
                </View>
                <View style={styles.headerTextCol}>
                  <Text style={styles.workerName}>{item.worker_name || `Worker #${item.worker_id}`}</Text>
                  <Text style={styles.jobsMeta}>{item.jobs_done} Jobs Completed</Text>
                </View>
                <Pressable
                  style={styles.proLinkBtn}
                  onPress={() => router.push({ pathname: '/(protected)/(admin)/pro-detail', params: { id: item.worker_id } })}
                >
                  <Ionicons name="person-outline" size={16} color="#0B5A3E" />
                </Pressable>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCol}>
                  <Text style={styles.kpiLabel}>Daily</Text>
                  <Text style={styles.kpiVal}>Rs. {item.daily_earning}</Text>
                </View>
                <View style={styles.kpiCol}>
                  <Text style={styles.kpiLabel}>Weekly</Text>
                  <Text style={styles.kpiVal}>Rs. {item.weekly_earning}</Text>
                </View>
                <View style={styles.kpiCol}>
                  <Text style={styles.kpiLabel}>Total</Text>
                  <Text style={[styles.kpiVal, { color: '#0B5A3E' }]}>Rs. {item.total_earning}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Pressable onPress={() => setDeleteWorkerId(item.worker_id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteText}>Delete Ledger</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ConfirmDialog
        visible={Boolean(deleteWorkerId)}
        title="Delete Earning Record"
        message="Are you sure you want to delete this worker's earning ledger record?"
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteEarningMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteWorkerId(null)}
      />

      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="earnings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  jobsMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  proLinkBtn: {
    padding: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-around',
  },
  kpiCol: {
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  kpiVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
});
