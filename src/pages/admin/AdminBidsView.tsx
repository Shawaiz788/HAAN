import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminBids } from '@/hooks/admin/useAdminBids';
import { AdminBidItem } from '@/types/admin';
import EmptyState from '@/components/admin/common/EmptyState';

export default function AdminBidsView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const taskId = Number(params.taskId || 1);

  const { data: bids = [], isLoading: loading, isRefetching: refreshing, refetch } = useAdminBids(taskId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Task #{taskId} - Bids List</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch()}
            tintColor="#0B5A3E"
          />
        }
      >
        <Text style={styles.subTitle}>Submitted Professional Bids ({bids.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0B5A3E" style={{ marginTop: 24 }} />
        ) : bids.length === 0 ? (
          <EmptyState
            title="No bids submitted"
            subtitle="No professional has submitted a bid for this task yet."
            iconName="cash-outline"
          />
        ) : (
          bids.map((bid) => (
            <View key={bid.id} style={styles.bidCard}>
              <View style={styles.bidHeader}>
                <View style={styles.workerAvatar}>
                  <Ionicons name="person" size={20} color="#0B5A3E" />
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{bid.worker_name || `Worker #${bid.worker_id}`}</Text>
                  <Text style={styles.bidTime}>{bid.created_at || 'Recently'}</Text>
                </View>
                <View style={styles.priceBox}>
                  <Text style={styles.priceText}>Rs. {bid.amount}</Text>
                </View>
              </View>

              {bid.message ? (
                <Text style={styles.bidMessage}>"{bid.message}"</Text>
              ) : null}

              <View style={styles.bidFooter}>
                <Text style={styles.estimateText}>⏱️ Estimate: {bid.time_estimate || 'N/A'}</Text>
                <Pressable
                  style={styles.viewProBtn}
                  onPress={() => router.push({ pathname: '/(protected)/(admin)/pro-detail', params: { id: bid.worker_id } })}
                >
                  <Text style={styles.viewProText}>Pro Profile</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0B5A3E" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#0B5A3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  bidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  bidTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  priceBox: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B5A3E',
  },
  bidMessage: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  bidFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  estimateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  viewProBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B5A3E',
  },
});
