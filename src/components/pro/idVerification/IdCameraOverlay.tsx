import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IdSide } from '@/types/idVerification';
import { styles, CARD_WIDTH, CARD_HEIGHT } from '@/styles/idCameraOverlay.styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IdCameraOverlayProps {
  visible: boolean;
  side: IdSide;
  onClose: () => void;
  onConfirmPhoto: (side: IdSide, imageUri: string) => void;
}

export default function IdCameraOverlay({
  visible,
  side,
  onClose,
  onConfirmPhoto,
}: IdCameraOverlayProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  const isFront = side === 'front';
  const sideTitle = isFront ? 'CNIC (Front)' : 'CNIC (Back)';
  const sideInstruction = isFront
    ? 'Align CNIC FRONT with face photo inside frame'
    : 'Align CNIC BACK with address details inside frame';

  const toggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  };

  const handleCameraLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (photo?.uri && photo?.width && photo?.height) {
        const layoutW = containerSize.width || SCREEN_WIDTH;
        const layoutH = containerSize.height || SCREEN_HEIGHT;

        // Determine portrait orientation dimensions of the captured photo
        const imgW = Math.min(photo.width, photo.height);
        const imgH = Math.max(photo.width, photo.height);

        // CameraView renders in 'cover' scale mode to fill container
        const scale = Math.max(layoutW / imgW, layoutH / imgH);
        const renderedW = imgW * scale;
        const renderedH = imgH * scale;

        // Calculate offset of screen relative to full camera feed
        const offsetX = (renderedW - layoutW) / 2;
        const offsetY = (renderedH - layoutH) / 2;

        // On-screen guide box center position
        const boxLeftScreen = (layoutW - CARD_WIDTH) / 2;
        const boxTopScreen = (layoutH - CARD_HEIGHT) / 2;

        // Position of guide box relative to full camera feed
        const boxLeftInFeed = boxLeftScreen + offsetX;
        const boxTopInFeed = boxTopScreen + offsetY;

        // Convert screen feed pixels to actual image resolution
        let originX = Math.round(boxLeftInFeed / scale);
        let originY = Math.round(boxTopInFeed / scale);
        let cropW = Math.round(CARD_WIDTH / scale);
        let cropH = Math.round(CARD_HEIGHT / scale);

        // Clamp bounds within image boundaries
        originX = Math.max(0, Math.min(imgW - 10, originX));
        originY = Math.max(0, Math.min(imgH - 10, originY));
        cropW = Math.min(imgW - originX, cropW);
        cropH = Math.min(imgH - originY, cropH);

        try {
          const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
          const croppedResult = await manipulateAsync(
            photo.uri,
            [
              {
                crop: {
                  originX,
                  originY,
                  width: cropW,
                  height: cropH,
                },
              },
            ],
            { compress: 0.9, format: SaveFormat.JPEG }
          );

          setCapturedUri(croppedResult.uri);
        } catch (cropErr) {
          console.warn('[IdCameraOverlay] Auto-crop fallback to original photo:', cropErr);
          setCapturedUri(photo.uri);
        }
      } else if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Could not capture photo.');
    } finally {
      setCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1.58, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Gallery Error', 'Failed to pick image.');
    }
  };

  const handleConfirm = () => {
    if (capturedUri) {
      onConfirmPhoto(side, capturedUri);
      setCapturedUri(null);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Permission Denied View */}
        {!permission?.granted ? (
          <View style={[styles.permissionContainer, { paddingTop: insets.top + 20 }]}>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </Pressable>

            <View style={styles.permissionCard}>
              <View style={styles.permissionIconCircle}>
                <Ionicons name="camera" size={32} color="#16A34A" />
              </View>
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionDesc}>
                Allow camera access to capture clear, aligned photos of your CNIC for identity verification.
              </Text>

              <Pressable style={styles.allowBtn} onPress={requestPermission}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.allowBtnText}>Allow Camera Access</Text>
              </Pressable>

              <Pressable style={styles.galleryBtn} onPress={handlePickFromGallery}>
                <Ionicons name="images-outline" size={18} color="#B45309" />
                <Text style={styles.galleryBtnText}>Pick Photo from Gallery</Text>
              </Pressable>
            </View>
          </View>
        ) : capturedUri ? (
          /* Image Review Preview State (Shows Cropped Image) */
          <View style={[styles.previewContainer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>Review {sideTitle}</Text>
            </View>

            <View style={styles.previewImageWrapper}>
              <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />
              <View style={styles.previewCardFrameOverlay} />
            </View>

            <Text style={styles.previewHint}>
              Captured area cropped to CNIC guide frame. Ensure text and photo are readable.
            </Text>

            <View style={styles.previewActionsRow}>
              <Pressable style={styles.retakeBtn} onPress={() => setCapturedUri(null)}>
                <Ionicons name="refresh" size={18} color="#B45309" />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </Pressable>

              <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Use Photo</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Live Camera Viewfinder with ID Card Alignment Cutout */
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            flash={flash}
            onLayout={handleCameraLayout}
          >
            {/* Top Toolbar */}
            <View style={[styles.topToolbar, { paddingTop: Math.max(insets.top + 10, 20) }]}>
              <Pressable style={styles.iconCircleBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>

              <View style={styles.sideBadge}>
                <Ionicons name="card-outline" size={16} color="#FEF08A" />
                <Text style={styles.sideBadgeText}>{sideTitle}</Text>
              </View>

              <Pressable style={styles.iconCircleBtn} onPress={toggleFlash}>
                <Ionicons
                  name={flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off'}
                  size={20}
                  color={flash === 'off' ? '#9CA3AF' : '#F59E0B'}
                />
              </Pressable>
            </View>

            {/* Alignment Cutout Overlay */}
            <View style={styles.overlayCenterContent}>
              <Text style={styles.instructionPill}>{sideInstruction}</Text>

              <View style={styles.cardCutoutBox}>
                {/* 4 Corner Brackets */}
                <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
                <View style={[styles.cornerBracket, styles.bracketTopRight]} />
                <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
                <View style={[styles.cornerBracket, styles.bracketBottomRight]} />
                <View style={styles.scanLine} />
              </View>

              <Text style={styles.glareHintText}>Hold steady and avoid glare or shadow</Text>
            </View>

            {/* Bottom Shutter Controls */}
            <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom + 20, 30) }]}>
              <Pressable style={styles.galleryCircleBtn} onPress={handlePickFromGallery}>
                <Ionicons name="images-outline" size={22} color="#FFFFFF" />
              </Pressable>

              <Pressable style={styles.shutterOuterBtn} onPress={handleTakePicture} disabled={capturing}>
                <View style={styles.shutterInnerBtn}>
                  {capturing ? <ActivityIndicator size="small" color="#16A34A" /> : null}
                </View>
              </Pressable>

              <View style={{ width: 44 }} />
            </View>
          </CameraView>
        )}
      </View>
    </Modal>
  );
}
