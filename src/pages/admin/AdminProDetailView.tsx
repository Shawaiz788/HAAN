import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminProDetail, useVerifyUserStatus } from '@/hooks/admin/useAdminProDetail';
import StatusBadge from '@/components/admin/common/StatusBadge';

export default function AdminProDetailView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = Number(params.id || 3);

  const { profile, rating, earnings, tasks, reviews, isLoading: loading } = useAdminProDetail(userId);
  const verifyMutation = useVerifyUserStatus();

  const isVerified = Boolean((profile as any)?.is_verified ?? profile?.verified);
  const verifying = verifyMutation.isPending;

  const handleToggleVerification = async () => {
    try {
      const newStatus = !isVerified;
      await verifyMutation.mutateAsync({ userId, isVerified: newStatus });
      const msg = newStatus ? 'Professional Verified' : 'Verification Revoked';
      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert('Status Updated', msg);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update verification status.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0B5A3E" />
        <Text style={styles.loadingText}>Loading Professional Details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Professional Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.proHeaderRow}>
            <View style={styles.avatarBox}>
              <Ionicons name="construct" size={28} color="#0B5A3E" />
            </View>
            <View style={styles.proTextCol}>
              <View style={styles.nameRow}>
                <Text style={styles.proName}>{profile?.first_name || 'Worker'} {profile?.last_name || `#${userId}`}</Text>
                {isVerified ? (
                  <Ionicons name="checkmark-circle" size={18} color="#0B5A3E" />
                ) : null}
              </View>
              <Text style={styles.proEmail}>{profile?.email || 'N/A'}</Text>
              <Text style={styles.proPhone}>{(profile as any)?.phone_number || profile?.phone || 'N/A'}</Text>
            </View>
          </View>

          {/* Verification Toggle */}
          <Pressable
            style={[styles.verifyBtn, isVerified ? styles.unverifyStyle : styles.verifyStyle]}
            onPress={handleToggleVerification}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={isVerified ? 'close-circle' : 'checkmark-circle'} size={18} color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>
                  {isVerified ? 'Revoke Verification' : 'Verify Professional'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Rating & Earnings Grid */}
        <View style={styles.gridRow}>
          <View style={styles.statBox}>
            <Ionicons name="star" size={22} color="#D97706" />
            <Text style={styles.statVal}>{rating.rating} / 5.0</Text>
            <Text style={styles.statLabel}>{rating.count} Total Ratings</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="wallet" size={22} color="#0B5A3E" />
            <Text style={styles.statVal}>Rs. {earnings?.total_earning ?? 0}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        {/* Assigned Tasks */}
        <Text style={styles.sectionTitle}>Assigned Tasks ({tasks.length})</Text>
        {tasks.length === 0 ? (
          <Text style={styles.emptyText}>No assigned tasks for this professional.</Text>
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskTextCol}>
                <Text style={styles.taskSubject}>{task.subject}</Text>
                <Text style={styles.taskPrice}>Budget: Rs. {task.price}</Text>
              </View>
              <StatusBadge status={task.status_id} />
            </View>
          ))
        )}

        {/* Reviews Received */}
        <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <Text style={styles.emptyText}>No reviews recorded.</Text>
        ) : (
          reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewItem}>
              <Text style={styles.reviewRating}>⭐ {rev.rating} / 5.0</Text>
              <Text style={styles.reviewBody}>{rev.body}</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    color: '#4B5563',
    fontWeight: '600',
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
    fontSize: 17,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  proHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proTextCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  proEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  proPhone: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  verifyStyle: {
    backgroundColor: '#0B5A3E',
  },
  unverifyStyle: {
    backgroundColor: '#EF4444',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  taskTextCol: {
    flex: 1,
  },
  taskSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  taskPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  reviewItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewRating: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewBody: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
});
