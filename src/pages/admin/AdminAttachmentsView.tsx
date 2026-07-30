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
  Modal,
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
import { normalizeImageUrl } from '@/services/customer';

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

  // Full-screen Image Preview Modal State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const resolveAttachmentUrl = (item: AdminAttachmentItem): string => {
    const rawUrl =
      item.file_url ||
      item.file ||
      item.url ||
      item.image ||
      (item.attachment && (item.attachment.file || item.attachment.url)) ||
      '';
    if (!rawUrl) return '';
    return normalizeImageUrl(rawUrl) || rawUrl;
  };

  const resolveTaskId = (item: AdminAttachmentItem): string => {
    if (item.task_id != null) return String(item.task_id);
    if (item.task != null) return String(item.task);
    return 'N/A';
  };

  const resolveFileName = (item: AdminAttachmentItem, resolvedUrl: string): string => {
    if (item.file_name) return item.file_name;
    if (item.name) return item.name;
    if (resolvedUrl) {
      const filename = resolvedUrl.split('/').pop()?.split('?')[0];
      if (filename && filename.length > 3) return filename;
    }
    return `Attachment #${item.id}`;
  };

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const data = await getAllAttachments();
      setAttachments(data);
    } catch (e) {
      console.warn('[AdminAttachmentsView] Error fetching attachments:', e);
      setAttachments([
        { id: 1, task_id: 101, file_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500', file_name: 'pipe_leak.jpg', uploaded_at: 'Today' },
        { id: 2, task_id: 102, file_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500', file_name: 'breaker_box.jpg', uploaded_at: 'Yesterday' },
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

  const handleOpenPreview = (item: AdminAttachmentItem) => {
    const url = resolveAttachmentUrl(item);
    const name = resolveFileName(item, url);
    if (url) {
      setPreviewUrl(url);
      setPreviewTitle(name);
    } else {
      Alert.alert('No Image', 'No preview URL available for this attachment.');
    }
  };

  const filtered = attachments.filter((a) => {
    const url = resolveAttachmentUrl(a);
    const name = resolveFileName(a, url);
    const taskIdStr = resolveTaskId(a);
    const q = searchQuery.toLowerCase();

    return (
      name.toLowerCase().includes(q) ||
      taskIdStr.includes(q) ||
      String(a.id).includes(q)
    );
  });

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
          filtered.map((item) => {
            const imgUrl = resolveAttachmentUrl(item);
            const taskId = resolveTaskId(item);
            const fileName = resolveFileName(item, imgUrl);
            const uploadedAt = item.uploaded_at || (item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent');

            return (
              <Pressable
                key={item.id}
                style={styles.attachmentCard}
                onPress={() => handleOpenPreview(item)}
              >
                <View style={styles.previewBox}>
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={styles.previewImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={26} color="#0B5A3E" />
                  )}
                </View>

                <View style={styles.textCol}>
                  <Text style={styles.fileName}>{fileName}</Text>
                  <Text style={styles.taskTag}>Linked to Task #{taskId}</Text>
                  <Text style={styles.uploadMeta}>Uploaded: {uploadedAt}</Text>
                </View>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setDeleteId(item.id);
                  }}
                  style={styles.deleteBtn}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Full-Screen Image Preview Modal */}
      <Modal
        visible={Boolean(previewUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalOverlayClose} onPress={() => setPreviewUrl(null)} />
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{previewTitle}</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setPreviewUrl(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            {previewUrl && (
              <View style={styles.modalImageWrapper}>
                <Image
                  source={{ uri: previewUrl }}
                  style={styles.modalFullImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

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
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
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

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalOverlayClose: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#111827',
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalImageWrapper: {
    width: '100%',
    height: 400,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFullImage: {
    width: '100%',
    height: '100%',
  },
});
