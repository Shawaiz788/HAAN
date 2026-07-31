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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminDrawerPanel from '@/components/admin/AdminDrawerPanel';
import StatusBadge from '@/components/admin/common/StatusBadge';
import SearchBar from '@/components/admin/common/SearchBar';
import EmptyState from '@/components/admin/common/EmptyState';
import ConfirmDialog from '@/components/admin/common/ConfirmDialog';
import { SkeletonCard } from '@/components/admin/common/SkeletonLoader';
import TaskDetailModal from '@/components/admin/TaskDetailModal';
import { useAdminTasks, useDeleteAdminTask } from '@/hooks/admin/useAdminTasks';
import { BackendTask } from '@/types';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Tasks' },
  { id: 1, label: 'Open (1)' },
  { id: 2, label: 'In Progress (2)' },
  { id: 3, label: 'Completed (3)' },
  { id: 4, label: 'Cancelled (4)' },
];

export default function AdminTasksView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<number | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<BackendTask | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: tasks = [], isLoading, isRefetching, refetch } = useAdminTasks();
  const deleteTaskMutation = useDeleteAdminTask();

  const fetchTasks = () => {
    refetch();
  };

  const handleStatusChange = () => {
    refetch();
  };

  const confirmDeleteTask = async () => {
    if (!deleteId) return;
    try {
      await deleteTaskMutation.mutateAsync(deleteId);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Task deleted successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Deleted', 'Task deleted successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not delete task.');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = selectedStatus === 'all' || t.status_id === selectedStatus;
    const matchesQuery =
      (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.body || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.id).includes(searchQuery);
    return matchesStatus && matchesQuery;
  });

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Task Management"
        subtitle={`System Service Requests (${filteredTasks.length})`}
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {STATUS_FILTERS.map((f) => {
            const active = selectedStatus === f.id;
            return (
              <Pressable
                key={String(f.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedStatus(f.id as any)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search task by title, description or ID..."
        />
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => fetchTasks()}
            tintColor="#0B5A3E"
          />
        }
      >
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0B5A3E" />
            <Text style={styles.loadingText}>Fetching tasks...</Text>
            <View style={{ gap: 10, width: '100%', marginTop: 12 }}>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          </View>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            subtitle="Try adjusting your status filter or search text."
            iconName="documents-outline"
          />
        ) : (
          filteredTasks.map((t) => (
            <View key={t.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleRow}>
                  <Text style={styles.taskTitle}>{t.subject || 'Task Request'}</Text>
                  <StatusBadge status={t.status_id} />
                </View>
                <Text style={styles.taskBody} numberOfLines={2}>{t.body}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.priceText}>Rs. {t.price}</Text>
                <Text style={styles.metaText}>Customer #{t.created_by}</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.bidsBtn}
                  onPress={() => router.push({ pathname: '/(protected)/(admin)/bids', params: { taskId: t.id } })}
                >
                  <Ionicons name="cash-outline" size={16} color="#0B5A3E" />
                  <Text style={styles.bidsBtnText}>View Bids</Text>
                </Pressable>

                <Pressable
                  style={styles.detailBtn}
                  onPress={() => {
                    setSelectedTask(t);
                    setDetailModalOpen(true);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#2563EB" />
                  <Text style={styles.detailBtnText}>Manage</Text>
                </Pressable>

                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => setDeleteId(t.id!)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Task Details & Status Update Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onStatusChange={handleStatusChange}
      />

      {/* Confirmation Dialog before destructive action */}
      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Delete Task"
        message="Are you sure you want to delete this task? This operation cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteTaskMutation.isPending}
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteId(null)}
      />

      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="tasks"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#0B5A3E',
    borderColor: '#0B5A3E',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  taskHeader: {
    gap: 4,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  taskBody: {
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B5A3E',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bidsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bidsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B5A3E',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 'auto',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
