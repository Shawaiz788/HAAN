import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { styles } from '@/styles/homeView.styles';

export const getLeafletHtml = (lat: number, lng: number) => `
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
    }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd'
    }).addTo(map);

    // Initial offset so coordinates align under the pin (at 35% height)
    map.whenReady(function() {
      var size = map.getSize();
      var tgt = L.point(size.x / 2, size.y * 0.35);
      var ctr = L.point(size.x / 2, size.y / 2);
      map.panBy(ctr.subtract(tgt), { animate: false });
    });

    map.on('moveend', function() {
      // Read coordinates directly under the visual pin at 35% screen height
      var size = map.getSize();
      var pinPoint = L.point(size.x / 2, size.y * 0.35);
      var pinCoords = map.containerPointToLatLng(pinPoint);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'REGION_CHANGED',
          latitude: pinCoords.lat,
          longitude: pinCoords.lng
        }));
      }
    });

    // Signal React Native that map is fully ready
    map.whenReady(function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    });
  </script>
</body>
</html>
`;

interface HomeMapViewProps {
  loadingLocation: boolean;
  isGeocoding?: boolean;
  isLocationSyncing?: boolean;
  isLocationAvailable?: boolean;
  initialCoords: { latitude: number; longitude: number } | null;
  webViewRef: React.RefObject<any>;
  handleMapMessage: (event: any) => void;
  isConnected: boolean;
  insets: any;
  toggleDrawer: (open: boolean) => void;
  locateBtnStyle: any;
  reCenterMap: () => void;
  activeTask: any;
  viewActiveTaskScreen: boolean;
  activeTaskBannerStyle: any;
  setViewActiveTaskScreen: (visible: boolean) => void;
}

export default function HomeMapView({
  loadingLocation,
  isGeocoding,
  isLocationSyncing,
  isLocationAvailable = true,
  initialCoords,
  webViewRef,
  handleMapMessage,
  isConnected,
  insets,
  toggleDrawer,
  locateBtnStyle,
  reCenterMap,
  activeTask,
  viewActiveTaskScreen,
  activeTaskBannerStyle,
  setViewActiveTaskScreen,
}: HomeMapViewProps) {
  return (
    <>
      {/* 1. MAP BACKGROUND */}
      <View style={styles.mapContainer}>
        {initialCoords && (
          <WebView
            ref={webViewRef}
            style={styles.map}
            source={{ html: getLeafletHtml(initialCoords.latitude, initialCoords.longitude) }}
            onMessage={handleMapMessage}
            scrollEnabled={false}
            overScrollMode="never"
          />
        )}

        {/* 2. MAP OVERLAY PIN IN MIDDLE */}
        <View style={styles.centerMarkerContainer} pointerEvents="none">
          {!isLocationAvailable && !(isLocationSyncing || isGeocoding) && (
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

          {(isLocationSyncing || isGeocoding) && (
            <View style={styles.pinLoadingBadge}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          )}
          <Ionicons name="pin" size={40} color="#EF4444" style={styles.pinIcon} />
        </View>
      </View>

      {/* NO INTERNET CONNECTION FLOATING INDICATOR */}
      {!isConnected && (
        <View style={[styles.noInternetBanner, { top: insets.top > 0 ? insets.top + 68 : 78 }]}>
          <Ionicons name="wifi-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.noInternetText}>No Internet Connection</Text>
        </View>
      )}

      {/* 3. FLOATING HAMBURGER MENU BUTTON */}
      <Pressable
        style={[styles.menuBtn, { top: insets.top > 0 ? insets.top + 10 : 20 }]}
        onPress={() => toggleDrawer(true)}
      >
        <Ionicons name="menu" size={26} color="#111827" />
      </Pressable>

      {/* FLOATING LOCATION RE-CENTER BUTTON */}
      {!loadingLocation && initialCoords && (
        <Animated.View style={locateBtnStyle}>
          <Pressable onPress={reCenterMap} style={styles.locateBtnPressable} disabled={isGeocoding}>
            {isGeocoding ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="locate" size={24} color="#10B981" />
            )}
          </Pressable>
        </Animated.View>
      )}

      {/* 4. FLOATING ACTIVE TASK FEEDBACK BAR */}
      {activeTask && !viewActiveTaskScreen && (
        <Pressable
          style={activeTaskBannerStyle}
          onPress={() => setViewActiveTaskScreen(true)}
        >
          <View style={styles.bannerIndicator} />
          <Text style={styles.bannerText}>
            ⚡ Active Request: <Text style={styles.boldText}>{activeTask.category}</Text> (Rs. {activeTask.budget})
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#10B981" style={{ marginLeft: 8 }} />
        </Pressable>
      )}
    </>
  );
}
