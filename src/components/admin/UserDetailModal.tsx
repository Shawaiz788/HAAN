import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateAdminUserById } from '@/services/adminUsers';
import { AdminUserItem } from '@/types/admin';

export { AdminUserItem };

interface UserDetailModalProps {
  user: AdminUserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (userId: number, newStatus: 'active' | 'suspended') => void;
  onVerifyToggle?: (userId: number) => void;
  onUserUpdated?: (updatedUser: AdminUserItem) => void;
}

const ROLE_OPTIONS = [
  { id: 2, label: 'Customer' },
  { id: 3, label: 'Worker' },
  { id: 1, label: 'Admin' },
];

export default function UserDetailModal({
  user,
  isOpen,
  onClose,
  onStatusChange,
  onVerifyToggle,
  onUserUpdated,
}: UserDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleId, setEditRoleId] = useState<number>(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditEmail(user.email || '');
      setEditRoleId(user.usertype_id || 2);
      setIsEditing(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleToggleStatus = () => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    Alert.alert(
      `${nextStatus === 'suspended' ? 'Suspend' : 'Activate'} User`,
      `Are you sure you want to ${nextStatus === 'suspended' ? 'suspend' : 'activate'} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: nextStatus === 'suspended' ? 'destructive' : 'default',
          onPress: () => {
            if (onStatusChange) onStatusChange(user.id, nextStatus);
          },
        },
      ]
    );
  };

  const handleToggleVerify = () => {
    if (onVerifyToggle) onVerifyToggle(user.id);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Please enter a name for the user.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Required Field', 'Please enter a phone number.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateAdminUserById(user.id, {
        name: editName.trim(),
        first_name: editName.trim().split(' ')[0],
        last_name: editName.trim().split(' ').slice(1).join(' '),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        usertype_id: editRoleId,
      });

      if (Platform.OS === 'android') {
        ToastAndroid.show(`User profile updated successfully!`, ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', `User profile updated successfully!`);
      }

      if (onUserUpdated) {
        onUserUpdated(updated);
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error('[UserDetailModal] Error updating user:', err);
      Alert.alert('Update Failed', err?.message || 'Could not update user profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {isEditing ? 'Edit User Profile' : 'User Profile Details'}
            </Text>
            
            <View style={styles.headerActions}>
              {!isEditing ? (
                <Pressable style={styles.editHeaderBtn} onPress={() => setIsEditing(true)}>
                  <Ionicons name="create-outline" size={18} color="#0B5A3E" />
                  <Text style={styles.editHeaderBtnText}>Edit</Text>
                </Pressable>
              ) : null}

              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isEditing ? (
              /* EDIT MODE FORM */
              <View style={styles.editForm}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full Name"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone Number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email Address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>User Role</Text>
                <View style={styles.rolePickerRow}>
                  {ROLE_OPTIONS.map((r) => {
                    const active = editRoleId === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        style={[styles.roleChip, active && styles.roleChipActive]}
                        onPress={() => setEditRoleId(r.id)}
                      >
                        <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                          {r.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Edit Form Actions */}
                <View style={styles.editActionRow}>
                  <Pressable
                    style={styles.cancelEditBtn}
                    onPress={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    <Text style={styles.cancelEditBtnText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.saveEditBtn, saving && styles.saveEditBtnDisabled]}
                    onPress={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.saveEditBtnText}>Save Changes</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              /* VIEW MODE DETAILS */
              <>
                {/* Header User Card */}
                <View style={styles.userCard}>
                  {user.profile_pic ? (
                    <Image source={{ uri: user.profile_pic }} style={styles.userAvatar} />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <Ionicons name="person" size={26} color="#6B7280" />
                    </View>
                  )}

                  <View style={styles.userTextCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{user.name}</Text>
                      {user.verified ? (
                        <Ionicons name="checkmark-circle" size={18} color="#0B5A3E" />
                      ) : null}
                    </View>
                    <Text style={styles.userPhone}>{user.phone}</Text>
                    <Text style={styles.userEmail}>{user.email || 'No email registered'}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          user.status === 'active'
                            ? '#ECFDF5'
                            : user.status === 'suspended'
                            ? '#FEE2E2'
                            : '#FEF3C7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            user.status === 'active'
                              ? '#0B5A3E'
                              : user.status === 'suspended'
                              ? '#EF4444'
                              : '#D97706',
                        },
                      ]}
                    >
                      {user.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Quick Stats Grid */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>User Role</Text>
                    <Text style={styles.statValue}>
                      {user.roleName} (ID {user.usertype_id})
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Rating</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.statValue}>{user.rating || 5.0}</Text>
                    </View>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Tasks</Text>
                    <Text style={styles.statValue}>{user.totalTasks || 0}</Text>
                  </View>
                </View>

                {/* Account Details List */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account Information</Text>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={styles.infoValue}>#{user.id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>KYC Verification</Text>
                    <Text style={[styles.infoValue, { color: user.verified ? '#0B5A3E' : '#D97706' }]}>
                      {user.verified ? 'Verified Account' : 'Pending Verification'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Joined Date</Text>
                    <Text style={styles.infoValue}>{user.joinedDate || 'Recently Joined'}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionGroup}>
                  <Pressable
                    style={[
                      styles.actionBtn,
                      user.status === 'active' ? styles.suspendBtn : styles.activateBtn,
                    ]}
                    onPress={handleToggleStatus}
                  >
                    <Ionicons
                      name={user.status === 'active' ? 'ban-outline' : 'checkmark-circle-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionBtnText}>
                      {user.status === 'active' ? 'Suspend User Account' : 'Activate Account'}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.verifyBtn} onPress={handleToggleVerify}>
                    <Ionicons
                      name={user.verified ? 'shield-checkmark' : 'shield-outline'}
                      size={18}
                      color="#0B5A3E"
                    />
                    <Text style={styles.verifyBtnText}>
                      {user.verified ? 'Revoke KYC Verification' : 'Approve KYC Verification'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  editHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B5A3E',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  editForm: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: '#0B5A3E',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelEditBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveEditBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0B5A3E',
  },
  saveEditBtnDisabled: {
    opacity: 0.7,
  },
  saveEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#0B5A3E',
  },
  userAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userPhone: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  actionGroup: {
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  suspendBtn: {
    backgroundColor: '#EF4444',
  },
  activateBtn: {
    backgroundColor: '#0B5A3E',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B5A3E',
  },
});
