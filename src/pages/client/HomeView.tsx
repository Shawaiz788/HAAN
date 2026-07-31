import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Dimensions,
  Animated,
  Modal,
  Alert,
  PanResponder,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { getLocationById } from '@/services/location';
import { useAuth } from '@/context/auth';
import { usePostJob } from '@/context/post-job';
import ActiveTaskScreen from '@/pages/client/ActiveTaskScreen';
import DrawerPanel from '@/components/client/DrawerPanel';
import SearchLocationModal from '@/components/client/SearchLocationModal';
import PinAdjusterModal from '@/components/client/PinAdjusterModal';
import HomeMapView from '@/components/client/HomeMapView';
import HomeBottomSheet from '@/components/client/HomeBottomSheet';
import { useHomeViewLocation } from '@/hooks/useHomeViewLocation';
import { useHomeViewTaskPost } from '@/hooks/useHomeViewTaskPost';
import { styles } from '@/styles/homeView.styles';

const { width, height } = Dimensions.get('window');

const SHEET_HEIGHT = height * 0.8;
const DEFAULT_HEIGHT = 420;
const COLLAPSED_HEIGHT = 130;

interface HomeViewProps {
  userName: string;
  onNavigateToTab?: (tab: 'home' | 'browse' | 'messages' | 'profile') => void;
  onOpenPostJob?: (initialCategory?: string) => void;
  onSelectPro?: (proName: string) => void;
}

export default function HomeView({ userName }: HomeViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeTask, createTask } = usePostJob();
  const webViewRef = useRef<WebView | null>(null);

  // Custom Hook for Map & Geocoding Logic
  const {
    mapCoords, setMapCoords, initialCoords, setInitialCoords,
    loadingLocation, setLoadingLocation, isGeocoding, address, setAddress,
    isLocationAvailable, unavailabilityReason,
    searchModalVisible, setSearchModalVisible, pinAdjusterVisible, setPinAdjusterVisible,
    searchQuery, searchResults, searchingLocation,
    locStreet, setLocStreet, locArea, setLocArea, locCity, setLocCity,
    locSearchLoading, reverseGeocode, reCenterMap, searchLocations, openSearchModal,
    selectSearchResult, confirmAdjustedLocation, updateMapFromFields, handleMapMessage,
  } = useHomeViewLocation({ webViewRef });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewActiveTaskScreen, setViewActiveTaskScreen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-width * 0.75)).current;

  // Custom Hook for Task Post State & Category Bootstrapping
  const {
    activeCategory,
    setActiveCategory,
    activeSubcategory,
    setActiveSubcategory: handleSelectSubcategory,
    budget,
    setBudget,
    description,
    setDescription,
    attachments,
    categories,
    loadingCategories,
    paymentPreferences,
    loadingPaymentPrefs,
    selectedPaymentPrefId,
    setSelectedPaymentPrefId,
    isConnected,
    isRetryingData,
    hasMissingEssentialData,
    minBasePrice,
    handleSmartRetry,
    handleAddAttachment,
    handleRemoveAttachment,
    handleRequestTask,
  } = useHomeViewTaskPost({
    user,
    activeTask,
    createTask,
    mapCoords,
    address,
    isLocationAvailable,
    setPinAdjusterVisible,
    setViewActiveTaskScreen,
  });

  // 3-state bottom sheet: 'collapsed', 'default', 'expanded'
  const [sheetState, setSheetState] = useState<'collapsed' | 'default' | 'expanded'>('default');
  const [lastNonDefaultState, setLastNonDefaultState] = useState<'collapsed' | 'expanded'>('expanded');
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT - DEFAULT_HEIGHT)).current;

  const stateRef = useRef({ sheetState, lastNonDefaultState });
  stateRef.current = { sheetState, lastNonDefaultState };

  const [showAllCategories, setShowAllCategories] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const getTranslateYValue = (state: 'collapsed' | 'default' | 'expanded') => {
    switch (state) {
      case 'expanded':
        return 0;
      case 'default':
        return SHEET_HEIGHT - DEFAULT_HEIGHT;
      case 'collapsed':
        return SHEET_HEIGHT - COLLAPSED_HEIGHT;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderRelease: (_, gestureState) => {
        const { sheetState: currentSheetState, lastNonDefaultState: currentLastNonDefault } = stateRef.current;
        const isTap = Math.abs(gestureState.dx) < 15 && Math.abs(gestureState.dy) < 15;
        const isSwipeDown = gestureState.dy > 25 || gestureState.vy > 0.25;
        const isSwipeUp = gestureState.dy < -25 || gestureState.vy < -0.25;

        if (isTap) {
          if (currentSheetState === 'collapsed' || currentSheetState === 'expanded') {
            setSheetState('default');
          } else {
            setSheetState(currentLastNonDefault === 'collapsed' ? 'expanded' : 'collapsed');
          }
        } else if (isSwipeDown) {
          setSheetState(currentSheetState === 'expanded' ? 'default' : 'collapsed');
        } else if (isSwipeUp) {
          setSheetState(currentSheetState === 'collapsed' ? 'default' : 'expanded');
        }
      },
    })
  ).current;

  useEffect(() => {
    if (sheetState !== 'default') {
      setLastNonDefaultState(sheetState);
    }
  }, [sheetState]);

  useEffect(() => {
    Animated.spring(sheetTranslateY, {
      toValue: getTranslateYValue(sheetState),
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [sheetState]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Asynchronously syncs saved user profile location ID (/v1/location/{id}/) to position map on user's primary address
  const [isLocationSyncing, setIsLocationSyncing] = useState(false);
  const hasSyncedLocationIdRef = useRef(false);

  useEffect(() => {
    if (!user?.location_id || hasSyncedLocationIdRef.current) return;
    hasSyncedLocationIdRef.current = true;
    let isMounted = true;
    setIsLocationSyncing(true);

    getLocationById(user.location_id)
      .then((savedLoc) => {
        if (!isMounted || !savedLoc) return;
        if (savedLoc.latitude !== undefined && savedLoc.longitude !== undefined) {
          const lat = Number(savedLoc.latitude);
          const lng = Number(savedLoc.longitude);
          const savedCoords = { latitude: lat, longitude: lng };

          setMapCoords(savedCoords);

          if (webViewRef.current) {
            // Vertical Map Offset Calculation: Shifts the Leaflet viewport center so the target GPS (lat, lng)
            // aligns directly under the UI map pin icon (which sits at 35% top screen height above the bottom sheet).
            const jsCode = `
              if (typeof map !== 'undefined' && map) {
                var currZoom = map.getZoom() || 15;
                // 1. Convert GPS coordinates to Leaflet LatLng object
                var targetLatLng = L.latLng(${lat}, ${lng});
                // 2. Project geographic (lat, lng) to 2D pixel coordinates (X, Y)
                var targetPoint = map.project(targetLatLng, currZoom);
                // 3. Get total viewport dimensions
                var size = map.getSize();
                // 4. Calculate vertical offset (50% screen center - 35% pin position = 15% vertical shift)
                var offset = L.point(0, size.y * (0.5 - 0.35));
                // 5. Shift pixel coordinates downwards by the offset
                var centerPoint = targetPoint.add(offset);
                // 6. Convert shifted pixel point back to geographic (lat, lng)
                var centerLatLng = map.unproject(centerPoint, currZoom);
                // 7. Pan map to new center so target coordinate sits directly underneath the 35% map pin
                map.setView(centerLatLng, currZoom);
              }
              true;
            `;
            webViewRef.current.injectJavaScript(jsCode);
          }

          if (savedLoc.formatted_address) {
            setAddress(savedLoc.formatted_address);
          } else {
            reverseGeocode(lat, lng);
          }
        }
      })
      .catch((err) => {
        // non-fatal
      })
      .finally(() => {
        if (isMounted) {
          setIsLocationSyncing(false);
        }
      });

    return () => { isMounted = false; };
  }, [user?.location_id]);

  const handleSignOut = async () => {
    toggleDrawer(false);
    try {
      await logout();
    } catch (err) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  useEffect(() => {
    if (activeTask && !viewActiveTaskScreen) {
      setViewActiveTaskScreen(true);
    }
  }, [activeTask?.id]);

  const activeTaskBannerStyle = [
    styles.activeTaskBanner,
    { top: insets.top > 0 ? insets.top + 10 : 20 }
  ];

  const valDefault = SHEET_HEIGHT - DEFAULT_HEIGHT;
  const valCollapsed = SHEET_HEIGHT - COLLAPSED_HEIGHT;

  const bottomSheetStyle = [
    styles.bottomSheet,
    {
      transform: [{ translateY: sheetTranslateY }],
      bottom: keyboardHeight,
      height: SHEET_HEIGHT,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16
    }
  ];

  const locateBtnStyle = [
    styles.locateBtn,
    {
      bottom: keyboardHeight > 0 ? keyboardHeight + DEFAULT_HEIGHT + 20 : DEFAULT_HEIGHT + 20,
      opacity: sheetTranslateY.interpolate({
        inputRange: [0, valDefault, valCollapsed],
        outputRange: [0, 1, 1],
        extrapolate: 'clamp',
      }),
      transform: [{
        translateY: sheetTranslateY.interpolate({
          inputRange: [0, valDefault, valCollapsed],
          outputRange: [100, 0, valCollapsed - valDefault],
          extrapolate: 'clamp',
        })
      }],
      pointerEvents: (sheetState === 'expanded' ? 'none' : 'auto') as any,
    }
  ];

  const toggleDrawer = (open: boolean) => {
    setDrawerOpen(open);
    Animated.timing(drawerAnim, {
      toValue: open ? 0 : -width * 0.75,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Interactive Leaflet Map Component */}
      <HomeMapView
        webViewRef={webViewRef}
        initialCoords={initialCoords}
        handleMapMessage={handleMapMessage}
        insets={insets}
        activeTask={activeTask}
        viewActiveTaskScreen={viewActiveTaskScreen}
        activeTaskBannerStyle={activeTaskBannerStyle}
        setViewActiveTaskScreen={setViewActiveTaskScreen}
        toggleDrawer={toggleDrawer}
        locateBtnStyle={locateBtnStyle}
        reCenterMap={reCenterMap}
        loadingLocation={loadingLocation || isLocationSyncing}
        isLocationSyncing={isLocationSyncing}
        isLocationAvailable={isLocationAvailable}
        isGeocoding={isGeocoding}
        isConnected={isConnected}
      />

      {/* Persistent 3-State Sliding Bottom Sheet */}
      <HomeBottomSheet
        bottomSheetStyle={bottomSheetStyle}
        panResponder={panResponder}
        sheetState={sheetState}
        address={address}
        isLocationAvailable={isLocationAvailable}
        showAllCategories={showAllCategories}
        setShowAllCategories={setShowAllCategories}
        loadingCategories={loadingCategories}
        shimmerAnim={shimmerAnim}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={(cat) => {
          setActiveCategory(cat);
          handleSelectSubcategory('');
        }}
        activeSubcategory={activeSubcategory}
        setActiveSubcategory={handleSelectSubcategory}
        locStreet={locStreet} setLocStreet={setLocStreet}
        locArea={locArea} setLocArea={setLocArea}
        locCity={locCity} setLocCity={setLocCity}
        locSearchLoading={locSearchLoading}
        updateMapFromFields={updateMapFromFields}
        openSearchModal={openSearchModal}
        budget={budget} setBudget={setBudget}
        minBasePrice={minBasePrice}
        loadingPaymentPrefs={loadingPaymentPrefs}
        paymentPreferences={paymentPreferences}
        selectedPaymentPrefId={selectedPaymentPrefId}
        setSelectedPaymentPrefId={setSelectedPaymentPrefId}
        description={description} setDescription={setDescription}
        attachments={attachments}
        handleRemoveAttachment={handleRemoveAttachment}
        handleAddAttachment={handleAddAttachment}
        handleRequestTask={handleRequestTask}
        hasMissingEssentialData={hasMissingEssentialData}
        onSmartRetry={handleSmartRetry}
        isRetryingData={isRetryingData}
      />

      {/* Slide-out Drawer */}
      <DrawerPanel
        open={drawerOpen}
        onClose={() => toggleDrawer(false)}
        activeTask={activeTask}
        onOpenActiveRequest={() => setViewActiveTaskScreen(true)}
        onOpenHistory={() => router.push('/task-history')}
        onSignOut={handleSignOut}
        drawerAnim={drawerAnim}
      />

      {/* Active Task Full Screen Overlay */}
      {viewActiveTaskScreen && (
        <Modal visible={viewActiveTaskScreen} animationType="slide">
          <ActiveTaskScreen onBack={() => setViewActiveTaskScreen(false)} />
        </Modal>
      )}

      {/* Search Location Modal */}
      <SearchLocationModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        searchQuery={searchQuery}
        onSearchQueryChange={searchLocations}
        searchResults={searchResults}
        searchingLocation={searchingLocation}
        onSelectResult={selectSearchResult}
        openPinAdjuster={() => setPinAdjusterVisible(true)}
        insets={insets}
      />

      {/* Map Pin Adjuster Modal */}
      <PinAdjusterModal
        visible={pinAdjusterVisible}
        onClose={() => setPinAdjusterVisible(false)}
        initialCoords={mapCoords}
        initialAddress={address}
        onConfirm={confirmAdjustedLocation}
        insets={insets}
      />
    </View>
  );
}
