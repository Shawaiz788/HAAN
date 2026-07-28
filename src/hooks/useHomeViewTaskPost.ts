import { useState, useEffect } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { getPaymentPreferencesFromBackend, PaymentPreference } from '@/services/task';
import useCategoryStore from '@/store/categoryStore';
import { getCustomerReviews } from '@/services/user';
import { initializeGeofenceService } from '@/services/geofenceService';
import { AppUser } from '@/types';
import { Task } from '@/types';

interface AttachmentItem {
  id: string;
  uri: string;
  uploading: boolean;
}

interface UseHomeViewTaskPostParams {
  user: AppUser | null;
  activeTask: Task | null;
  createTask: (
    subcategoryId: number,
    categoryName: string,
    subcategoryName: string,
    paymentPreferenceId: number,
    paymentPreferenceName: string,
    description: string,
    budget: number,
    locationName: string,
    attachmentUris?: string[] | null,
    latitude?: number,
    longitude?: number
  ) => void;
  mapCoords: { latitude: number; longitude: number };
  address: string;
  isLocationAvailable: boolean | null;
  setPinAdjusterVisible: (v: boolean) => void;
  setViewActiveTaskScreen: (v: boolean) => void;
}

export function useHomeViewTaskPost({
  user,
  activeTask,
  createTask,
  mapCoords,
  address,
  isLocationAvailable,
  setPinAdjusterVisible,
  setViewActiveTaskScreen,
}: UseHomeViewTaskPostParams) {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const { categories, loading: loadingCategories, ensureCategories, getSubcategoriesByCategory } = useCategoryStore();
  const [paymentPreferences, setPaymentPreferences] = useState<PaymentPreference[]>([]);
  const [loadingPaymentPrefs, setLoadingPaymentPrefs] = useState(true);
  const [selectedPaymentPrefId, setSelectedPaymentPrefId] = useState<number | null>(null);

  const [isConnected, setIsConnected] = useState(true);
  const [isRetryingData, setIsRetryingData] = useState(false);

  const hasMissingEssentialData =
    !loadingCategories &&
    !loadingPaymentPrefs &&
    (categories.length === 0 || paymentPreferences.length === 0);

  useEffect(() => {
    let isMounted = true;
    const bootstrapHomeData = async () => {
      setLoadingPaymentPrefs(true);
      const [catResult, paymentResult] = await Promise.allSettled([
        ensureCategories(),
        getPaymentPreferencesFromBackend(),
        initializeGeofenceService(),
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

      if (user?.id) {
        getCustomerReviews(user.id).catch(() => {});
      }
    };

    bootstrapHomeData();
    return () => { isMounted = false; };
  }, []);

  // Automatically pre-select the 1st subcategory whenever activeCategory updates
  useEffect(() => {
    if (!activeCategory || categories.length === 0) return;
    const selectedCategoryObj = categories.find(
      (c) => c.name.toLowerCase() === activeCategory.toLowerCase()
    );
    if (selectedCategoryObj && selectedCategoryObj.id) {
      const currentSubs = getSubcategoriesByCategory(selectedCategoryObj.id || selectedCategoryObj.name);
      if (currentSubs && currentSubs.length > 0) {
        const firstSub = currentSubs[0];
        setActiveSubcategory(firstSub.name);
        const bp = Number(firstSub.base_price ?? firstSub.basePrice ?? 0);
        if (bp > 0) {
          setBudget(bp.toString());
        }
      } else {
        setActiveSubcategory('');
      }
    }
  }, [activeCategory, categories, getSubcategoriesByCategory]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected && state.isInternetReachable !== false);
    });
    NetInfo.fetch().then((state) => {
      setIsConnected(!!state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  const handleSmartRetry = async () => {
    setIsRetryingData(true);
    try {
      const tasks: Promise<any>[] = [];
      if (categories.length === 0) tasks.push(ensureCategories());
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
      // non-fatal
    } finally {
      setIsRetryingData(false);
    }
  };

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

  let minBasePrice = 0;
  const selectedCategoryObj = categories.find(c => c.name === activeCategory);
  if (selectedCategoryObj && selectedCategoryObj.id) {
    const currentSubs = getSubcategoriesByCategory(selectedCategoryObj.id || selectedCategoryObj.name);
    let selectedSubcategoryObj = currentSubs.find(s => s.name.toLowerCase() === activeSubcategory.toLowerCase());
    if (!selectedSubcategoryObj && currentSubs.length > 0) {
      selectedSubcategoryObj = currentSubs[0];
    }
    if (selectedSubcategoryObj) {
      minBasePrice = Number(selectedSubcategoryObj.base_price ?? selectedSubcategoryObj.basePrice ?? 0);
    }
  }

  const handleRequestTask = () => {
    if (isLocationAvailable === false) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Services unavailable in selected location. Please adjust your pin.', ToastAndroid.LONG);
      }
      setTimeout(() => {
        Alert.alert(
          'Location Unavailable',
          'Services are currently not available in your selected location. Please move your pin to a supported city/area.',
          [{ text: 'Adjust Location', onPress: () => setPinAdjusterVisible(true) }]
        );
      }, 100);
      return;
    }

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

    if (!selectedCategoryObj || !selectedCategoryObj.id) {
      Alert.alert('Selection Required', 'Please select a valid category.');
      return;
    }

    const currentSubs = getSubcategoriesByCategory(selectedCategoryObj.id || selectedCategoryObj.name);
    let selectedSubcategoryObj = currentSubs.find(s => s.name.toLowerCase() === activeSubcategory.toLowerCase());
    if (!selectedSubcategoryObj && currentSubs.length > 0) {
      selectedSubcategoryObj = currentSubs[0];
    }

    if (!selectedSubcategoryObj || !selectedSubcategoryObj.id) {
      Alert.alert('Selection Required', 'Please select a specialty or subcategory.');
      return;
    }

    const selectedPrefObj = paymentPreferences.find(p => p.id === selectedPaymentPrefId);
    if (!selectedPrefObj) {
      Alert.alert('Payment Selection Required', 'Please select a payment preference.');
      return;
    }

    const userBudget = Number(budget);
    if (!budget || isNaN(userBudget) || userBudget <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid price/budget.');
      return;
    }

    const basePrice = Number(selectedSubcategoryObj.base_price ?? selectedSubcategoryObj.basePrice ?? 0);
    if (basePrice > 0 && userBudget < basePrice) {
      Alert.alert(
        'Price Below Base Price',
        `The budget for "${selectedSubcategoryObj.name}" cannot be lower than the base price of Rs. ${basePrice.toLocaleString()}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (description.trim().length < 5) {
      Alert.alert('Details Required', 'Please describe the work in at least 5 characters.');
      return;
    }

    const attachmentUris = attachments.map(item => item.uri);
    createTask(
      selectedSubcategoryObj.id,
      selectedCategoryObj.name,
      selectedSubcategoryObj.name,
      selectedPrefObj.id,
      selectedPrefObj.name,
      description,
      userBudget,
      address,
      attachmentUris,
      mapCoords.latitude,
      mapCoords.longitude
    );
    setViewActiveTaskScreen(true);
    setBudget('');
    setDescription('');
    setAttachments([]);
  };

  const handleSelectSubcategory = (subName: string) => {
    setActiveSubcategory(subName);
    const selectedCategoryObj = categories.find(c => c.name === activeCategory);
    if (selectedCategoryObj && selectedCategoryObj.id) {
      const currentSubs = getSubcategoriesByCategory(selectedCategoryObj.id || selectedCategoryObj.name);
      const matched = currentSubs.find(s => s.name.toLowerCase() === subName.toLowerCase());
      if (matched) {
        const bp = Number(matched.base_price ?? matched.basePrice ?? 0);
        if (bp > 0) {
          setBudget(bp.toString());
        }
      }
    }
  };

  return {
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
  };
}
