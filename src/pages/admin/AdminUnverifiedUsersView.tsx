import React, { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminDrawerPanel from '@/components/admin/AdminDrawerPanel';
import CnicImagePreviewModal from '@/components/admin/CnicImagePreviewModal';
import {
  useAdminUnverifiedUsers,
  useVerifyAdminUser,
} from '@/hooks/admin/useAdminUnverifiedUsers';
import { AdminUnverifiedUserItem } from '@/services/adminUnverifiedUsers';
import { styles } from '@/styles/adminUnverifiedUsers.styles';

export default function AdminUnverifiedUsersView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Image Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalAttachmentId, setModalAttachmentId] = useState<number | string | null>(null);

  // TanStack Query & Mutation
  const { data: users = [], isLoading, isRefetching, refetch } = useAdminUnverifiedUsers();
  const verifyMutation = useVerifyAdminUser();

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.id.toString().includes(query) ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.phone && u.phone.includes(query))
    );
  });

  const handleOpenPreview = (title: string, uri?: string, attachmentId?: number | string | null) => {
    if (!uri) {
      Alert.alert('No Image', 'This attachment does not have a valid image URL.');
      return;
    }
    setModalTitle(title);
    setModalImageUri(uri);
    setModalAttachmentId(attachmentId || null);
    setModalVisible(true);
  };

  const handleVerify = (userItem: AdminUnverifiedUserItem, approve: boolean) => {
    const actionText = approve ? 'Approve & Verify' : 'Reject';
    Alert.alert(
      `${actionText} User`,
      `Are you sure you want to ${approve ? 'verify' : 'reject'} CNIC identity for User #${userItem.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await verifyMutation.mutateAsync({
                userId: userItem.id,
                isVerified: approve,
              });

              if (Platform.OS === 'android') {
                ToastAndroid.show(
                  `User #${userItem.id} ${approve ? 'Verified' : 'Rejected'}`,
                  ToastAndroid.SHORT
                );
              } else {
                Alert.alert('Success', `User #${userItem.id} has been ${approve ? 'verified' : 'rejected'}.`);
              }
            } catch (e: any) {
              Alert.alert('Action Failed', e?.message || 'Could not update user verification status.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <View style={styles.headerTop}>
          <Pressable style={styles.menuBtn} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu" size={26} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>CNIC Verification</Text>
            <Text style={styles.headerSub}>Approve or reject unverified user ID documents</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={() => refetch()}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by User ID or Name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 30, 40) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#0B5A3E']} />
        }
      >
        {/* Stats Banner */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#16A34A' }]}>
              {users.filter((u) => u.verify_attachment_id_front && u.verify_attachment_id_back).length}
            </Text>
            <Text style={styles.statLabel}>Both CNICs Uploaded</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0B5A3E" />
            <Text style={styles.loadingText}>Fetching unverified users list...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="shield-checkmark" size={36} color="#16A34A" />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? 'No unverified users match your search criteria.'
                : 'There are no pending unverified user requests to review at this time.'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((userItem) => (
            <View key={userItem.id} style={styles.userCard}>
              {/* User Card Top Row */}
              <View style={styles.userCardHeader}>
                <View style={styles.roleBadge}>
                  <Ionicons
                    name={userItem.roleName === 'Worker' ? 'construct' : 'person'}
                    size={12}
                    color="#0F172A"
                  />
                  <Text style={styles.roleBadgeText}>{userItem.roleName || 'User'}</Text>
                </View>
              </View>

              <Text style={styles.userName}>{userItem.name}</Text>
              {userItem.phone ? (
                <Text style={styles.userPhone}>Phone: {userItem.phone}</Text>
              ) : null}

              <View style={styles.divider} />

              {/* Attachments Display Section */}
              <Text style={styles.attachmentsSectionTitle}>CNIC Attachments</Text>

              <View style={styles.attachmentsRow}>
                {/* Front Side Card */}
                <View style={styles.attachmentBox}>
                  <Text style={styles.attachmentLabel}>CNIC (Front)</Text>
                  {userItem.front_image_url ? (
                    <Pressable
                      style={styles.imageWrapper}
                      onPress={() =>
                        handleOpenPreview(
                          `User #${userItem.id} CNIC (Front)`,
                          userItem.front_image_url,
                          userItem.verify_attachment_id_front
                        )
                      }
                    >
                      <Image source={{ uri: userItem.front_image_url }} style={styles.thumbImage} resizeMode="cover" />
                      <View style={styles.zoomBadge}>
                        <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  ) : (
                    <View style={styles.missingBox}>
                      <Ionicons name="alert-circle-outline" size={20} color="#94A3B8" />
                      <Text style={styles.missingText}>
                        {userItem.verify_attachment_id_front ? `ID #${userItem.verify_attachment_id_front}` : 'Not Uploaded'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Back Side Card */}
                <View style={styles.attachmentBox}>
                  <Text style={styles.attachmentLabel}>CNIC (Back)</Text>
                  {userItem.back_image_url ? (
                    <Pressable
                      style={styles.imageWrapper}
                      onPress={() =>
                        handleOpenPreview(
                          `User #${userItem.id} CNIC (Back)`,
                          userItem.back_image_url,
                          userItem.verify_attachment_id_back
                        )
                      }
                    >
                      <Image source={{ uri: userItem.back_image_url }} style={styles.thumbImage} resizeMode="cover" />
                      <View style={styles.zoomBadge}>
                        <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  ) : (
                    <View style={styles.missingBox}>
                      <Ionicons name="alert-circle-outline" size={20} color="#94A3B8" />
                      <Text style={styles.missingText}>
                        {userItem.verify_attachment_id_back ? `ID #${userItem.verify_attachment_id_back}` : 'Not Uploaded'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.rejectBtn}
                  onPress={() => handleVerify(userItem, false)}
                  disabled={verifyMutation.isPending}
                >
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </Pressable>

                <Pressable
                  style={styles.approveBtn}
                  onPress={() => handleVerify(userItem, true)}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve & Verify</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Admin Navigation Drawer */}
      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="unverified-users"
      />

      {/* Fullscreen Image Preview Modal */}
      <CnicImagePreviewModal
        visible={modalVisible}
        imageUri={modalImageUri}
        title={modalTitle}
        attachmentId={modalAttachmentId}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
