import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAdminUser, CreateAdminUserPayload } from '@/services/adminUsers';
import { AdminUserItem } from '@/types/admin';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: AdminUserItem) => void;
}

const ROLE_OPTIONS = [
  { id: 2, label: 'Customer', desc: 'Standard Client App User' },
  { id: 3, label: 'Worker', desc: 'Service Provider / Pro' },
  { id: 1, label: 'Admin', desc: 'Full Dashboard Access' },
];

export default function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated,
}: CreateUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<number>(2);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setSelectedRole(2);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter a valid phone number.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Required Field', 'Please set an initial password for the account.');
      return;
    }

    try {
      setLoading(true);
      const payload: CreateAdminUserPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password: password.trim(),
        usertype_id: selectedRole,
      };

      const newUser = await createAdminUser(payload);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(`User ${newUser.name} created successfully!`, ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', `User ${newUser.name} created successfully!`);
      }

      onUserCreated(newUser);
      handleClose();
    } catch (err: any) {
      console.error('[CreateUserModal] Error creating user:', err);
      Alert.alert('Creation Failed', err?.message || 'Could not create user. Check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="person-add" size={20} color="#0B5A3E" />
              </View>
              <Text style={styles.sheetTitle}>Create New Platform User</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* User Role Selection */}
            <Text style={styles.label}>Select Account Role *</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTIONS.map((r) => {
                const active = selectedRole === r.id;
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.roleCard, active && styles.roleCardActive]}
                    onPress={() => setSelectedRole(r.id)}
                  >
                    <View style={styles.roleHeaderRow}>
                      <Ionicons
                        name={r.id === 1 ? 'shield-checkmark' : r.id === 3 ? 'construct' : 'person'}
                        size={18}
                        color={active ? '#0B5A3E' : '#6B7280'}
                      />
                      <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                        {r.label}
                      </Text>
                    </View>
                    <Text style={styles.roleDesc}>{r.desc}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* First Name & Last Name */}
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ali"
                  placeholderTextColor="#9CA3AF"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={styles.flex1}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Khan"
                  placeholderTextColor="#9CA3AF"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+92 300 1234567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {/* Email */}
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            {/* Password */}
            <Text style={styles.label}>Account Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Submit Button */}
            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Create Account</Text>
                </>
              )}
            </Pressable>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  formContainer: {
    padding: 18,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
  },
  roleCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#0B5A3E',
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  roleLabelActive: {
    color: '#0B5A3E',
  },
  roleDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#0B5A3E',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
