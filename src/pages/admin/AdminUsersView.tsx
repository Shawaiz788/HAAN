import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminDrawerPanel from '@/components/admin/AdminDrawerPanel';
import UserDetailModal, { AdminUserItem } from '@/components/admin/UserDetailModal';
import CreateUserModal from '@/components/admin/CreateUserModal';
import SearchBar from '@/components/admin/common/SearchBar';
import EmptyState from '@/components/admin/common/EmptyState';
import { SkeletonCard } from '@/components/admin/common/SkeletonLoader';
import ConfirmDialog from '@/components/admin/common/ConfirmDialog';
import { useAdminUsers, useDeleteAdminUser, useUpdateAdminUser } from '@/hooks/admin/useAdminUsers';
import { styles } from '@/styles/adminUsersView.styles';

const ROLE_FILTERS = [
  { id: 'all', label: 'All Roles' },
  { id: 1, label: 'Admin (1)' },
  { id: 2, label: 'Customer (2)' },
  { id: 3, label: 'Worker (3)' },
];

const PAGE_SIZE = 20;

export default function AdminUsersView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data, isLoading, isRefetching, refetch } = useAdminUsers(page, PAGE_SIZE);
  const deleteUserMutation = useDeleteAdminUser();
  const updateUserMutation = useUpdateAdminUser();

  const users = data?.users || [];
  const hasMore = data?.hasMore || false;

  const handleUserCreated = () => {
    refetch();
  };

  const handleUserUpdated = (updatedUser: AdminUserItem) => {
    refetch();
    if (selectedUser && selectedUser.id === updatedUser.id) {
      setSelectedUser({ ...selectedUser, ...updatedUser });
    }
  };

  const onRefresh = () => {
    refetch();
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleOpenUser = (u: AdminUserItem) => {
    if (u.usertype_id === 3) {
      router.push({ pathname: '/(protected)/(admin)/pro-detail', params: { id: u.id } });
    } else {
      setSelectedUser(u);
      setModalOpen(true);
    }
  };

  const handleStatusChange = async (userId: number, newStatus: 'active' | 'suspended') => {
    try {
      const is_active = newStatus === 'active';
      await updateUserMutation.mutateAsync({ id: userId, payload: { is_active, status: newStatus } });
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show(`User status updated to ${newStatus}`, ToastAndroid.SHORT);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update user status.');
    }
  };

  const handleVerifyToggle = async (userId: number) => {
    try {
      const currentUser = users.find((u) => u.id === userId);
      const newVerified = !currentUser?.verified;
      await updateUserMutation.mutateAsync({ id: userId, payload: { is_verified: newVerified } });
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, verified: newVerified });
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Verification status updated`, ToastAndroid.SHORT);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update verification status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteUserMutation.mutateAsync(deleteTargetId);
      if (Platform.OS === 'android') {
        ToastAndroid.show('User deleted successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'User deleted successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete user.');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRole === 'all' || u.usertype_id === selectedRole;
    const matchesQuery =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesQuery;
  });

  const renderUserItem = ({ item: u }: { item: AdminUserItem }) => (
    <View style={styles.userCardWrapper}>
      <Pressable style={styles.userCard} onPress={() => handleOpenUser(u)}>
        <View
          style={[
            styles.userIconBox,
            {
              backgroundColor:
                u.usertype_id === 1 ? '#ECFDF5' : u.usertype_id === 3 ? '#FEF3C7' : '#EFF6FF',
            },
          ]}
        >
          <Ionicons
            name={u.usertype_id === 1 ? 'shield-checkmark' : u.usertype_id === 3 ? 'construct' : 'person'}
            size={22}
            color={u.usertype_id === 1 ? '#0B5A3E' : u.usertype_id === 3 ? '#D97706' : '#2563EB'}
          />
        </View>

        <View style={styles.userInfoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{u.name}</Text>
            {u.verified ? <Ionicons name="checkmark-circle" size={16} color="#0B5A3E" /> : null}
          </View>
          <Text style={styles.userPhone}>{u.phone}</Text>
        </View>

        <View style={styles.badgeAndDeleteRow}>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  u.status === 'suspended'
                    ? '#FEE2E2'
                    : u.usertype_id === 1
                    ? '#ECFDF5'
                    : u.usertype_id === 3
                    ? '#FEF3C7'
                    : '#EFF6FF',
              },
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                {
                  color:
                    u.status === 'suspended'
                      ? '#EF4444'
                      : u.usertype_id === 1
                      ? '#0B5A3E'
                      : u.usertype_id === 3
                      ? '#D97706'
                      : '#2563EB',
                },
              ]}
            >
              {u.status === 'suspended' ? 'SUSPENDED' : `${u.roleName} (ID ${u.usertype_id})`}
            </Text>
          </View>

          <Pressable
            style={styles.deleteBtn}
            onPress={() => setDeleteTargetId(u.id)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || page === 1) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color="#0B5A3E" />
        <Text style={styles.footerText}>Loading more users (Page {page + 1})...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="User Management"
        subtitle={`Registered Platform Users (${filteredUsers.length})`}
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      {/* Role Filter & Add User Row */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipScroll}>
          {ROLE_FILTERS.map((f) => {
            const active = selectedRole === f.id;
            return (
              <Pressable
                key={String(f.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedRole(f.id as any)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.addUserBtn} onPress={() => setCreateModalOpen(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addUserBtnText}>Add User</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search user by name, email or phone..."
        />
      </View>

      {/* Paginated User Directory FlatList */}
      {isLoading && !isRefetching && users.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUserItem}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 24, 36) },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#0B5A3E']} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No users found"
              subtitle="Try adjusting your search query or role filter."
              onAction={onRefresh}
              actionLabel="Refresh List"
            />
          }
        />
      )}

      {/* User Detail & Edit Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusChange={handleStatusChange}
        onVerifyToggle={handleVerifyToggle}
        onUserUpdated={handleUserUpdated}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteTargetId !== null}
        title="Delete Platform User"
        message="Are you sure you want to delete this user? This action is permanent and cannot be undone."
        confirmLabel="Delete User"
        isDestructive
        isLoading={deleteUserMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Admin Drawer Navigation */}
      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="users"
      />
    </View>
  );
}


