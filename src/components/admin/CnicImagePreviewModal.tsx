import React from 'react';
import {
  Text,
  View,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '@/styles/cnicImagePreviewModal.styles';

interface CnicImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  title: string;
  attachmentId?: number | string | null;
  onClose: () => void;
}

export default function CnicImagePreviewModal({
  visible,
  imageUri,
  title,
  attachmentId,
  onClose,
}: CnicImagePreviewModalProps) {
  const insets = useSafeAreaInsets();

  if (!visible || !imageUri) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 10, 20) }]}>
          <View>
            <Text style={styles.titleText}>{title}</Text>
            {attachmentId && (
              <Text style={styles.attachmentIdText}>Attachment ID: #{attachmentId}</Text>
            )}
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Center Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.doneBtnText}>Close Preview</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
