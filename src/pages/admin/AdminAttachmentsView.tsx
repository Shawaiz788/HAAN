import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
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
import { getAllAttachments, deleteAttachment } from '@/services/attachment';
import { AdminAttachmentItem } from '@/types/admin';

export default function AdminAttachmentsView() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attachments, setAttachments] = useState<AdminAttachmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const data = await getAllAttachments();
      setAttachments(data);
    } catch (e) {
      console.warn('[AdminAttachmentsView] Error fetching attachments:', e);
      // Fallback demonstration mock for task media items
      setAttachments([
        { id: 1, task_id: 101, file_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300', file_name: 'pipe_leak.jpg', uploaded_at: 'Today' },
        { id: 2, task_id: 102, file_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300', file_name: 'breaker_box.jpg', uploaded_at: 'Yesterday' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteAttachment(deleteId);
      setAttachments((prev) => prev.filter((a) => a.id !== deleteId));
      if (Platform.OS === 'android') {
        ToastAndroid.show('Attachment deleted', ToastAndroid.SHORT);
      } else {
        Alert.alert('Deleted', 'Attachment removed successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not delete attachment.');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filtered = attachments.filter((a) =>
    (a.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(a.task_id || '').includes(searchQuery) ||
    String(a.id).includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Attachments & Media"
        subtitle={`Task File Attachments (${filtered.length})`}
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by file name or Task ID..."
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAttachments();
            }}
            tintColor="#0B5A3E"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={{ gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No attachments found"
            subtitle="Task file attachments will appear here."
            iconName="attach-outline"
          />
        ) : (
          filtered.map((item) => (
            <View key={item.id} style={styles.attachmentCard}>
              <View style={styles.previewBox}>
                {item.file_url ? (
                  <Image source={{ uri: item.file_url }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <Ionicons name="document-text" size={28} color="#6B7280" />
                )}
              </View>

              <View style={styles.textCol}>
                <Text style={styles.fileName}>{item.file_name || `Attachment #${item.id}`}</Text>
                <Text style={styles.taskTag}>Linked to Task #{item.task_id || 'N/A'}</Text>
                <Text style={styles.uploadMeta}>Uploaded: {item.uploaded_at || 'Recent'}</Text>
              </View>

              <Pressable onPress={() => setDeleteId(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Delete Attachment"
        message="Are you sure you want to permanently delete this media file?"
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="attachments"
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
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  previewBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  taskTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B5A3E',
    marginTop: 2,
  },
  uploadMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  deleteBtn: {
    padding: 8,
  },
});
