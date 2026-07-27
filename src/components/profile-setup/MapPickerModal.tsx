import React, { RefObject } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import getLeafletHtml from './leafletHtml';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  initialLat: number;
  initialLng: number;
  mapAddress: string;
  mapWebViewRef: RefObject<WebView | null>;
  onMessage: (event: any) => void;
  onReCenter: () => void;
  onConfirm: () => void;
  bottomInset?: number;
  topInset?: number;
}

export default function MapPickerModal({
  visible,
  onClose,
  initialLat,
  initialLng,
  mapAddress,
  mapWebViewRef,
  onMessage,
  onReCenter,
  onConfirm,
  bottomInset: passedBottomInset,
  topInset: passedTopInset,
}: MapPickerModalProps) {
  const insets = useSafeAreaInsets();
  const topInset = passedTopInset ?? insets.top;
  const bottomInset = passedBottomInset ?? insets.bottom;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.mapModalContainer}>
        {/* Full Screen Leaflet Map */}
        <WebView
          ref={mapWebViewRef}
          style={styles.mapWebview}
          source={{ html: getLeafletHtml(initialLat, initialLng) }}
          onMessage={onMessage}
          scrollEnabled={false}
          overScrollMode="never"
        />

        {/* Centered marker overlay */}
        <View style={styles.mapPinContainer} pointerEvents="none">
          <Ionicons name="location" size={44} color="#EF4444" style={styles.mapPinIcon} />
        </View>

        {/* Top Header floating banner */}
        <View style={[styles.mapHeader, { top: topInset > 0 ? topInset + 10 : 20 }]}>
          <Pressable onPress={onClose} style={styles.mapBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.mapHeaderTitle}>Select your location</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Floating locate button */}
        <View style={styles.mapLocateBtn}>
          <Pressable onPress={onReCenter} style={styles.mapLocateBtnPressable}>
            <Ionicons name="locate" size={24} color="#10B981" />
          </Pressable>
        </View>

        {/* Bottom address confirmation card */}
        <View style={[styles.mapBottomCard, { paddingBottom: bottomInset > 0 ? bottomInset + 16 : 24 }]}>
          <Text style={styles.mapCardTitle}>PINPOINT LOCATION</Text>
          <View style={styles.mapAddressRow}>
            <Ionicons name="flag" size={20} color="#111827" style={{ marginRight: 10 }} />
            <Text style={styles.mapAddressText} numberOfLines={2}>
              {mapAddress || 'Loading address...'}
            </Text>
          </View>
          <Pressable style={styles.mapDoneBtn} onPress={onConfirm}>
            <Text style={styles.mapDoneBtnText}>Confirm Location</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mapModalContainer: {
    flex: 1,
    position: 'relative',
  },
  mapWebview: {
    flex: 1,
  },
  mapPinContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -22,
    marginTop: -44,
    zIndex: 3,
  },
  mapPinIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mapHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 5,
  },
  mapBackBtn: {
    padding: 4,
  },
  mapHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 5,
  },
  mapCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  mapAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  mapAddressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  mapDoneBtn: {
    backgroundColor: '#0B5A3E',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  mapDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  mapLocateBtn: {
    position: 'absolute',
    right: 16,
    bottom: 215,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 5,
  },
  mapLocateBtnPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
