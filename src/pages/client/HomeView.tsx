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
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { getPaymentPreferencesFromBackend, PaymentPreference } from '@/services/task';
import useCategoryStore from '@/store/categoryStore';
import { getLocationById } from '@/services/location';
import { getCustomerReviews } from '@/services/user';
import { useAuth } from '@/context/auth';
import { usePostJob } from '@/context/post-job';
import ActiveTaskScreen from '@/pages/client/ActiveTaskScreen';
import DrawerPanel from '@/components/client/DrawerPanel';
import SearchLocationModal from '@/components/client/SearchLocationModal';
import PinAdjusterModal from '@/components/client/PinAdjusterModal';
import HomeMapView from '@/components/client/HomeMapView';
import HomeBottomSheet from '@/components/client/HomeBottomSheet';
import { useHomeViewLocation } from '@/hooks/useHomeViewLocation';
import { styles } from '@/styles/homeView.styles';
import { Pro } from '@/types';

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
    searchModalVisible, setSearchModalVisible, pinAdjusterVisible, setPinAdjusterVisible,
    searchQuery, searchResults, searchingLocation,
    locStreet, setLocStreet, locArea, setLocArea, locCity, setLocCity,
    locSearchLoading, reverseGeocode, reCenterMap, searchLocations, openSearchModal,
    selectSearchResult, confirmAdjustedLocation, updateMapFromFields, handleMapMessage,
  } = useHomeViewLocation({ user, webViewRef });

  // 3-state bottom sheet: 'collapsed', 'default', 'expanded'
  const [sheetState, setSheetState] = useState<'collapsed' | 'default' | 'expanded'>('default');
  const [lastNonDefaultState, setLastNonDefaultState] = useState<'collapsed' | 'expanded'>('expanded');
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT - DEFAULT_HEIGHT)).current;

  // Ref to hold current state to prevent PanResponder stale closures
  const stateRef = useRef({ sheetState, lastNonDefaultState });
  stateRef.current = { sheetState, lastNonDefaultState };

  // Bottom sheet categories toggle
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Shimmering Shared Animation
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  // Categories from shared Zustand store
  const { categories, loading: loadingCategories, ensureCategories } = useCategoryStore();

  // Dynamic Payment Preferences API State
  const [paymentPreferences, setPaymentPreferences] = useState<PaymentPreference[]>([]);
  const [loadingPaymentPrefs, setLoadingPaymentPrefs] = useState(true);
  const [selectedPaymentPrefId, setSelectedPaymentPrefId] = useState<number | null>(null);

  // Production-Ready NetInfo State
  const [isConnected, setIsConnected] = useState(true);

  // Smart Retry State
  const [isRetryingData, setIsRetryingData] = useState(false);

  const hasMissingEssentialData =
    !loadingCategories &&
    !loadingPaymentPrefs &&
    (categories.length === 0 || paymentPreferences.length === 0);

  const handleSmartRetry = async () => {
    setIsRetryingData(true);
    try {
      const tasks: Promise<any>[] = [];

      if (categories.length === 0) {
        tasks.push(ensureCategories());
      }

      if (paymentPreferences.length === 0) {
        tasks.push(
          getPaymentPreferencesFromBackend().then((data) => {
            const list = data || [];
            setPaymentPreferences(list);
            if (list.length > 0 && selectedPaymentPrefId === null) {
              setSelectedPaymentPrefId(list[0].id);
            }
          })
        );
      }

      await Promise.allSettled(tasks);

      const { categories: updatedCats } = useCategoryStore.getState();
      if (updatedCats.length > 0 && !activeCategory) {
        setActiveCategory(updatedCats[0].name);
      }
    } catch (err) {
      console.warn('[HomeView] Smart retry error:', err);
    } finally {
      setIsRetryingData(false);
    }
  };

  // Form Inputs State
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');

  // Form Attachments State
  const [attachments, setAttachments] = useState<Array<{ id: string; uri: string; uploading: boolean }>>([]);

  // Keyboard height state
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Navigation / Drawer / History Modals State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewActiveTaskScreen, setViewActiveTaskScreen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-width * 0.75)).current;

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

  // Animated swipe handling via PanResponder
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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected && state.isInternetReachable !== false);
    });
    NetInfo.fetch().then((state) => {
      setIsConnected(!!state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  // Home Data Bootstrapper (Categories & Payment Prefs)
  useEffect(() => {
    let isMounted = true;

    const bootstrapHomeData = async () => {
      setLoadingPaymentPrefs(true);

      const [catResult, paymentResult] = await Promise.allSettled([
        ensureCategories(),
        getPaymentPreferencesFromBackend(),
      ]);

      if (!isMounted) return;

      if (catResult.status === 'fulfilled') {
        const { categories: cats } = useCategoryStore.getState();
        if (cats.length > 0 && !activeCategory) {
          setActiveCategory(cats[0].name);
        }
      }

      if (paymentResult.status === 'fulfilled') {
        const data = paymentResult.value || [];
        setPaymentPreferences(data);
        if (data.length > 0 && selectedPaymentPrefId === null) {
          setSelectedPaymentPrefId(data[0].id);
        }
      } else {
        setPaymentPreferences([]);
      }
      setLoadingPaymentPrefs(false);

      // Background non-blocking pre-fetch of user reviews and ratings
      if (user?.id) {
        const fetchBackgroundReviews = async (userId: number) => {
          try {
            await getCustomerReviews(userId);
          } catch (err) {
            console.warn('[HomeView] Non-fatal background reviews prefetch error:', err);
          }
        };
        fetchBackgroundReviews(user.id);
      }
    };

    bootstrapHomeData();
    return () => { isMounted = false; };
  }, []);

  // Independent Location Sync from Profile / Backend Location API
  const [isLocationSyncing, setIsLocationSyncing] = useState(false);

  useEffect(() => {
    if (!user?.location_id) return;
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

          // Update Leaflet map view
          if (webViewRef.current) {
            const jsCode = `
              if (typeof map !== 'undefined' && map) {
                var targetLatLng = L.latLng(${lat}, ${lng});
                var targetPoint = map.project(targetLatLng, 15);
                var size = map.getSize();
                var offset = L.point(0, size.y * (0.5 - 0.35));
                var centerPoint = targetPoint.add(offset);
                var centerLatLng = map.unproject(centerPoint, 15);
                map.setView(centerLatLng, 15);
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
        console.log('[HomeView] Independent location fetch non-fatal error:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLocationSyncing(false);
        }
      });

    return () => { isMounted = false; };
  }, [user?.location_id]);

  const handleAddAttachment = async () => {
    const remaining = 3 - attachments.length;
    if (remaining <= 0) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 3 attachments per task.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is required to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      allowsEditing: remaining === 1,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newItems = result.assets.slice(0, remaining).map((asset, idx) => ({
        id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        uri: asset.uri,
        uploading: false,
      }));
      setAttachments(prev => [...prev, ...newItems]);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(item => item.id !== id));
  };

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

  const handleRequestTask = () => {
    if (activeTask && (activeTask.status === 'searching' || activeTask.status === 'bidding' || activeTask.status === 'accepted')) {
      Alert.alert(
        'Active Request in Progress',
        'You already have an active job request in progress. Please complete or cancel your existing task before creating a new one.',
        [
          { text: 'View Active Request', onPress: () => setViewActiveTaskScreen(true) },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    const selectedCategoryObj = categories.find(c => c.name === activeCategory);
    if (!selectedCategoryObj || !selectedCategoryObj.id) {
      Alert.alert('Selection Required', 'Please select a valid category.');
      return;
    }

    const selectedPrefObj = paymentPreferences.find(p => p.id === selectedPaymentPrefId);
    if (!selectedPrefObj) {
      Alert.alert('Payment Selection Required', 'Please select a payment preference.');
      return;
    }

    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid price/budget.');
      return;
    }
    if (description.trim().length < 5) {
      Alert.alert('Details Required', 'Please describe the work in at least 5 characters.');
      return;
    }

    const attachmentUris = attachments.map(item => item.uri);
    createTask(
      selectedCategoryObj.id,
      selectedCategoryObj.name,
      selectedPrefObj.id,
      selectedPrefObj.name,
      description,
      Number(budget),
      address,
      attachmentUris
    );
    setViewActiveTaskScreen(true);
    setBudget('');
    setDescription('');
    setAttachments([]);
  };

  return (
    <View style={styles.container}>
      <HomeMapView
        loadingLocation={loadingLocation}
        isGeocoding={isGeocoding}
        isLocationSyncing={isLocationSyncing}
        initialCoords={initialCoords}
        webViewRef={webViewRef}
        handleMapMessage={handleMapMessage}
        isConnected={isConnected}
        insets={insets}
        toggleDrawer={toggleDrawer}
        locateBtnStyle={locateBtnStyle}
        reCenterMap={reCenterMap}
        activeTask={activeTask}
        viewActiveTaskScreen={viewActiveTaskScreen}
        activeTaskBannerStyle={activeTaskBannerStyle}
        setViewActiveTaskScreen={setViewActiveTaskScreen}
      />

      <HomeBottomSheet
        bottomSheetStyle={bottomSheetStyle}
        panResponder={panResponder}
        sheetState={sheetState}
        address={address}
        showAllCategories={showAllCategories}
        setShowAllCategories={setShowAllCategories}
        loadingCategories={loadingCategories}
        shimmerAnim={shimmerAnim}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeSubcategory={activeSubcategory}
        setActiveSubcategory={setActiveSubcategory}
        locStreet={locStreet} setLocStreet={setLocStreet}
        locArea={locArea} setLocArea={setLocArea}
        locCity={locCity} setLocCity={setLocCity}
        locSearchLoading={locSearchLoading}
        updateMapFromFields={updateMapFromFields}
        openSearchModal={openSearchModal}
        budget={budget} setBudget={setBudget}
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
        user={user}
        activeTask={activeTask}
        onOpenActiveRequest={() => setViewActiveTaskScreen(true)}
        onOpenHistory={() => router.push('/task-history')}
        onSignOut={handleSignOut}
        drawerAnim={drawerAnim}
        insets={insets}
        router={router}
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
