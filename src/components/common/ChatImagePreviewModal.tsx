import React from 'react';
import { Modal, View, Image, Pressable, StatusBar, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ChatImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ChatImagePreviewModal({ imageUrl, onClose }: ChatImagePreviewModalProps) {
  const insets = useSafeAreaInsets();

  if (!imageUrl) return null;

  return (
    <Modal visible={Boolean(imageUrl)} transparent={false} animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={15}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: '100%',
    height: '85%',
  },
});
