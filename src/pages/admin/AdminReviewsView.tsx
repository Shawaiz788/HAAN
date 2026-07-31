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
import { useAuth } from '@/context/auth';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminDrawerPanel from '@/components/admin/AdminDrawerPanel';
import SearchBar from '@/components/admin/common/SearchBar';
import EmptyState from '@/components/admin/common/EmptyState';
import ConfirmDialog from '@/components/admin/common/ConfirmDialog';
import { SkeletonCard } from '@/components/admin/common/SkeletonLoader';
import { useAdminReviews, useDeleteAdminReview } from '@/hooks/admin/useAdminReviews';
import { AdminReviewItem } from '@/types/admin';

export default function AdminReviewsView() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: reviews = [], isLoading, isRefetching, refetch } = useAdminReviews();
  const deleteReviewMutation = useDeleteAdminReview();

  const fetchReviews = () => {
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReviewMutation.mutateAsync(deleteId);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Review deleted', ToastAndroid.SHORT);
      } else {
        Alert.alert('Deleted', 'Review deleted successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not delete review.');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredReviews = reviews.filter((r) =>
    (r.body || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.id).includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Reviews & Ratings"
        subtitle={`User Platform Reviews (${filteredReviews.length})`}
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by review text or user name..."
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => fetchReviews()}
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
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            title="No reviews found"
            subtitle="No user reviews match your search query."
            iconName="star-outline"
          />
        ) : (
          filteredReviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.cardHeader}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#D97706" />
                  <Text style={styles.ratingText}>{r.rating} / 5.0</Text>
                </View>
                <Text style={styles.taskMeta}>Task #{r.task_id}</Text>
              </View>

              <Text style={styles.reviewBody}>"{r.body}"</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.userText}>
                  For: <Text style={{ fontWeight: '700', color: '#111827' }}>{r.user_name || `User #${r.user_id}`}</Text>
                </Text>
                <Pressable onPress={() => setDeleteId(r.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Delete Review"
        message="Are you sure you want to remove this review?"
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteReviewMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="reviews"
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
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  taskMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewBody: {
    fontSize: 13.5,
    color: '#374151',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  userText: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteBtn: {
    padding: 4,
  },
});
