import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { validateCoordinatesServiceability, AREA_POLYGONS } from '@/services/geofenceService';

interface PinAdjusterModalProps {
  visible: boolean;
  onClose: () => void;
  initialCoords: { latitude: number; longitude: number };
  initialAddress: string;
  onConfirm: (coords: { latitude: number; longitude: number }, address: string) => void;
  insets: { top: number; bottom: number };
}

// Leaflet HTML template specific for the adjuster (centers directly on current viewport)
const getAdjusterLeafletHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background: #EAE6DF; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-control-zoom { display: none !important; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { 
      zoomControl: false, 
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true
    }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd'
    }).addTo(map);

    // Render green area polygon highlights on map
    var areaPolygons = ${JSON.stringify(AREA_POLYGONS)};
    for (var areaKey in areaPolygons) {
      if (Object.prototype.hasOwnProperty.call(areaPolygons, areaKey)) {
        var polygonCoords = areaPolygons[areaKey];
        L.polygon(polygonCoords, {
          color: '#059669',
          weight: 2,
          opacity: 0.85,
          fillColor: '#10B981',
          fillOpacity: 0.16,
          smoothFactor: 1.0
        }).addTo(map);
      }
    }

    map.on('moveend', function() {
      var center = map.getCenter();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'REGION_CHANGED',
          latitude: center.lat,
          longitude: center.lng
        }));
      }
    });
  </script>
</body>
</html>
`;

export default function PinAdjusterModal({
  visible,
  onClose,
  initialCoords,
  initialAddress,
  onConfirm,
  insets,
}: PinAdjusterModalProps) {
  const [adjusterCoords, setAdjusterCoords] = useState(initialCoords);
  const [adjusterAddress, setAdjusterAddress] = useState(initialAddress);
  const [isAvailable, setIsAvailable] = useState(true);
  const adjusterWebViewRef = useRef<WebView>(null);

  // Sync internal state when modal opens
  useEffect(() => {
    if (visible) {
      setAdjusterCoords(initialCoords);
      setAdjusterAddress(initialAddress);
      reverseGeocodeAdjuster(initialCoords.latitude, initialCoords.longitude);
    }
  }, [visible, initialCoords, initialAddress]);

  const reCenterAdjuster = async () => {
    try {
      let loc = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
        ]);
      } catch (e) {
        console.log('[PinAdjusterModal] reCenterAdjuster request timed out. Fetching cached position...');
        loc = await Location.getLastKnownPositionAsync();
      }
      if (loc) {
        const newCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setAdjusterCoords(newCoords);
        reverseGeocodeAdjuster(newCoords.latitude, newCoords.longitude);

        if (adjusterWebViewRef.current) {
          const jsCode = `
            if (map) {
              map.setView([${newCoords.latitude}, ${newCoords.longitude}], 16);
            }
            true;
          `;
          adjusterWebViewRef.current.injectJavaScript(jsCode);
        }
      }
    } catch (e) {
      // Silence location errors
    }
  };

  const handleAdjusterMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'REGION_CHANGED') {
        setAdjusterCoords({
          latitude: data.latitude,
          longitude: data.longitude,
        });
        reverseGeocodeAdjuster(data.latitude, data.longitude);
      }
    } catch (e) {
      // JSON parse error
    }
  };

  const reverseGeocodeAdjuster = async (lat: number, lng: number) => {
    try {
      let response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const item = response[0];
        const parts = [
          item.name,
          item.street,
          item.district || item.subregion,
          item.city,
        ].filter(Boolean);
        const resolvedAddr = parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const cityVal = item.city || '';
        const areaVal = item.district || item.subregion || '';
        setAdjusterAddress(resolvedAddr);

        const res = validateCoordinatesServiceability(lat, lng);
        setIsAvailable(res.isAvailable);
      } else {
        setAdjusterAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setIsAvailable(false);
      }
    } catch (e) {
      setAdjusterAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setIsAvailable(true);
    }
  };

  const handleDone = () => {
    if (!isAvailable) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Services not available in this location. Move pin to a covered area.', ToastAndroid.LONG);
      } else {
        setTimeout(() => {
          Alert.alert(
            'Location Unavailable',
            'We do not offer services in this location yet. Please move the pin to a supported area.'
          );
        }, 100);
      }
      return;
    }
    onConfirm(adjusterCoords, adjusterAddress);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.adjusterContainer}>
        {/* Full Screen Adjuster Map */}
        <WebView
          ref={adjusterWebViewRef}
          style={styles.adjusterMap}
          source={{ html: getAdjusterLeafletHtml(initialCoords.latitude, initialCoords.longitude) }}
          onMessage={handleAdjusterMapMessage}
          scrollEnabled={false}
          overScrollMode="never"
        />

        {/* Centered marker overlay */}
        <View style={styles.adjusterPinContainer} pointerEvents="none">
          {!isAvailable && (
            <View style={[styles.pinPill, styles.pinPillUnavailable]}>
              <Ionicons
                name="warning"
                size={12}
                color="#FFFFFF"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.pinPillText}>Services Not Available</Text>
            </View>
          )}
          <Ionicons name="location" size={44} color="#EF4444" style={styles.pinIcon} />
        </View>

        {/* Top Header floating banner */}
        <View style={[styles.adjusterHeader, { top: insets.top > 0 ? insets.top + 10 : 20 }]}>
          <Pressable onPress={onClose} style={styles.adjusterBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.adjusterHeaderTitle}>Swipe to move map</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Floating locate button inside adjuster */}
        <View style={styles.adjusterLocateBtn}>
          <Pressable onPress={reCenterAdjuster} style={styles.adjusterLocateBtnPressable}>
            <Ionicons name="locate" size={24} color="#10B981" />
          </Pressable>
        </View>

        {/* Bottom address adjustment confirmation card */}
        <View style={[styles.adjusterBottomCard, { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}>
          <Text style={styles.adjusterCardTitle}>DESTINATION ADDRESS</Text>
          <View style={styles.adjusterAddressRow}>
            <Ionicons name="flag" size={20} color="#111827" style={{ marginRight: 10 }} />
            <Text style={styles.adjusterAddressText} numberOfLines={2}>
              {adjusterAddress || 'Loading address...'}
            </Text>
          </View>

          {!isAvailable && (
            <View style={styles.unavailabilityBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.unavailabilityText}>
                Services are not available in this area. Move pin to a covered area.
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.adjusterDoneBtn, !isAvailable && styles.adjusterDoneBtnDisabled]}
            onPress={handleDone}
          >
            <Text style={styles.adjusterDoneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  adjusterContainer: {
    flex: 1,
    position: 'relative',
  },
  adjusterMap: {
    flex: 1,
  },
  adjusterPinContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -80,
    marginTop: -44, // Exact 44px pin height so bottom tip sits precisely at map center point
    width: 160,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  pinPill: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinPillAvailable: {
    backgroundColor: '#059669',
  },
  pinPillUnavailable: {
    backgroundColor: '#DC2626',
  },
  pinPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pinIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  unavailabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  unavailabilityText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  adjusterDoneBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  adjusterHeader: {
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
  adjusterBackBtn: {
    padding: 4,
  },
  adjusterHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  adjusterBottomCard: {
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
  adjusterCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  adjusterAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  adjusterAddressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  adjusterDoneBtn: {
    backgroundColor: '#082C18',
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
  adjusterDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  adjusterLocateBtn: {
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
  adjusterLocateBtnPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
