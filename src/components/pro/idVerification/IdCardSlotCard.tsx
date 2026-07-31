import React from 'react';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IdSide } from '@/types/idVerification';

interface IdCardSlotCardProps {
  side: IdSide;
  imageUri: string | null;
  isReadOnly?: boolean;
  onOpenCamera: (side: IdSide) => void;
  onOpenGallery: (side: IdSide) => void;
  onRemovePhoto: (side: IdSide) => void;
}

export default function IdCardSlotCard({
  side,
  imageUri,
  isReadOnly = false,
  onOpenCamera,
  onOpenGallery,
  onRemovePhoto,
}: IdCardSlotCardProps) {
  const isFront = side === 'front';
  const title = isFront ? 'CNIC (Front Side)' : 'CNIC (Back Side)';
  const subtitle = isFront
    ? 'Front face showing full name, CNIC number & official photo'
    : 'Back face showing permanent address & issuing department';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name={isFront ? 'id-card-outline' : 'card-outline'} size={20} color="#16A34A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>

        {imageUri ? (
          <View style={styles.capturedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#15803D" />
            <Text style={styles.capturedBadgeText}>CAPTURED</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>REQUIRED</Text>
          </View>
        )}
      </View>

      {/* Thumbnail or Empty Upload Drop Box */}
      {imageUri ? (
        <View style={styles.thumbnailWrapper}>
          <Image source={{ uri: imageUri }} style={styles.thumbnailImage} resizeMode="cover" />
          <View style={styles.thumbnailBadgeOverlay}>
            <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
            <Text style={styles.thumbnailOverlayText}>Photo Ready</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptySlotBox}>
          <View style={styles.cameraIconBg}>
            <Ionicons name="camera" size={24} color="#D97706" />
          </View>
          <Text style={styles.emptySlotTitle}>No photo captured yet</Text>
          <Text style={styles.emptySlotSub}>Use live camera alignment to scan your CNIC</Text>
        </View>
      )}

      {/* Action Buttons Row */}
      {!isReadOnly && (
        <View style={styles.actionsRow}>
          {imageUri ? (
            <>
              <Pressable style={styles.retakeBtn} onPress={() => onOpenCamera(side)}>
                <Ionicons name="camera" size={16} color="#B45309" />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </Pressable>

              <Pressable style={styles.removeBtn} onPress={() => onRemovePhoto(side)}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.cameraPrimaryBtn} onPress={() => onOpenCamera(side)}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.cameraPrimaryText}>Camera Alignment</Text>
              </Pressable>

              <Pressable style={styles.gallerySecondaryBtn} onPress={() => onOpenGallery(side)}>
                <Ionicons name="images-outline" size={18} color="#16A34A" />
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardSub: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
    marginTop: 2,
  },
  capturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  capturedBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
  },
  thumbnailWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailBadgeOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailOverlayText: {
    color: '#1F2937',
    fontSize: 11,
    fontWeight: '700',
  },
  emptySlotBox: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 14,
  },
  cameraIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotTitle: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  emptySlotSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cameraPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    height: 44,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  cameraPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  gallerySecondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE047',
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  retakeBtnText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '700',
  },
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
