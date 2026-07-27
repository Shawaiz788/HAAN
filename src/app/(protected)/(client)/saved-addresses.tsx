import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { getLocationById, getOrCreateLocationChain, UserLocation } from '@/services/location';
import { getCities, City } from '@/services/city';
import { getAreas, Area } from '@/services/area';
import { updateUserOnBackend } from '@/services/user';
import getLeafletHtml from '@/components/profile-setup/leafletHtml';
import SavedAddressForm from '@/components/client/SavedAddressForm';
import { styles } from '@/styles/savedAddresses.styles';

export default function SavedAddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, login } = useAuth();
  const webViewRef = useRef<WebView | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const handleFocusInput = () => {
    scrollViewRef.current?.scrollTo({ y: 160, animated: true });
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // API list states
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [areasList, setAreasList] = useState<Area[]>([]);

  // Dropdown visibility states
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  // Form states
  const [houseNumber, setHouseNumber] = useState<number>(0);
  const [streetNumber, setStreetNumber] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [zipCode, setZipCode] = useState<number>(0);
  const [formattedAddress, setFormattedAddress] = useState('');

  // Use refs for lat/lng to avoid re-rendering the WebView on every map drag
  const latRef = useRef<number>(31.5204);
  const lngRef = useRef<number>(74.3587);
  // Initial map coords — set once after data loads, used as WebView source
  const [initialMapCoords, setInitialMapCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Filter areas based on currently selected city
  const matchedCityObj = citiesList.find(
    (c) => c.name.toLowerCase() === city.toLowerCase()
  );

  const filteredAreas = areasList.filter((a: any) => {
    if (!a || !a.name) return false;
    const areaCityId =
      a.city_id !== undefined && a.city_id !== null
        ? a.city_id
        : typeof a.city === 'object' && a.city !== null
        ? a.city.id
        : typeof a.city === 'number'
        ? a.city
        : null;

    const areaCityName =
      typeof a.city === 'object' && a.city?.name
        ? a.city.name
        : (a as any).city_name || (a as any).cityName || null;

    if (matchedCityObj && areaCityId !== null && areaCityId !== undefined) {
      return String(areaCityId) === String(matchedCityObj.id);
    }
    if (city && areaCityName) {
      return areaCityName.toLowerCase() === city.toLowerCase();
    }
    return true;
  });

  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Reverse geocode from map coordinates ──
  const reverseGeocodeMap = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const item = response[0];
        const rawStreet = item.street || item.name || '';
        setStreetNumber(rawStreet.slice(0, 30));

        // Try to extract house number from the name field (e.g. "42 Street Name")
        if (item.name) {
          const houseMatch = item.name.match(/^(\d+)/);
          if (houseMatch) {
            setHouseNumber(Number(houseMatch[1]));
          }
        }

        // Postal/zip code
        if (item.postalCode) {
          const zip = Number(item.postalCode);
          if (zip > 0) setZipCode(zip);
        }

        const parts = [
          item.name, item.street, item.district, item.subregion, item.city, item.region,
        ].filter(Boolean);
        setFormattedAddress(parts.join(', '));
      }
    } catch (e) {
      console.warn('[SavedAddresses] Reverse geocode error:', e);
    } finally {
      setIsGeocoding(false);
    }
  };

  // ── Map message handler (uses refs, no re-render) ──
  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'REGION_CHANGED') {
        latRef.current = data.latitude;
        lngRef.current = data.longitude;
        reverseGeocodeMap(data.latitude, data.longitude);
      }
    } catch (e) {
      // JSON parse error
    }
  };

  // ── Re-center map to current GPS location ──
  const reCenterMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = position.coords;
      latRef.current = lat;
      lngRef.current = lng;
      if (webViewRef.current) {
        const jsCode = `
          if (map) {
            map.setView([${lat}, ${lng}], 16);
          }
          true;
        `;
        webViewRef.current.injectJavaScript(jsCode);
      }
      reverseGeocodeMap(lat, lng);
    } catch (e) {
      console.warn('[SavedAddresses] Failed to get current location:', e);
      Alert.alert('Location Error', 'Could not get your current location. Please try again.');
    }
  };

  // ── Fetch address and metadata ──
  const fetchAddressAndMetadata = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      console.log('[SavedAddresses] Fetching cities and areas from API...');
      const citiesData = await getCities();
      const areasData = await getAreas();
      setCitiesList(citiesData);
      setAreasList(areasData);

      const locationId = user?.location_id || user?.location?.id;
      if (locationId) {
        try {
          console.log('[SavedAddresses] Fetching address details for location ID:', locationId);
          const loc = await getLocationById(locationId);

          setHouseNumber(loc.house_number || 0);
          setStreetNumber(loc.street_number || '');
          setZipCode(loc.zip_code || 0);
          setFormattedAddress(loc.formatted_address || '');
          if (loc.latitude) latRef.current = loc.latitude;
          if (loc.longitude) lngRef.current = loc.longitude;
          setInitialMapCoords({ lat: latRef.current, lng: lngRef.current });

          // Find city name from ID
          const cityId = loc.city_id || loc.city;
          const matchedCity = citiesData.find(c => c.id === cityId);
          if (matchedCity) {
            setCity(matchedCity.name);
          } else if (typeof loc.city === 'object' && (loc.city as any)?.name) {
            setCity((loc.city as any).name);
          }

          // Find area name from ID
          const areaId = loc.area_id || loc.area;
          const matchedArea = areasData.find(a => a.id === areaId);
          if (matchedArea) {
            setArea(matchedArea.name);
          } else if (typeof loc.area === 'object' && (loc.area as any)?.name) {
            setArea((loc.area as any).name);
          }
        } catch (locErr) {
          console.warn('[SavedAddresses] Non-fatal error fetching location details:', locErr);
          setInitialMapCoords({ lat: latRef.current, lng: lngRef.current });
        }
      } else {
        // No saved location — use defaults
        setInitialMapCoords({ lat: latRef.current, lng: lngRef.current });
      }

      setCountry('Pakistan');
    } catch (err: any) {
      console.error('[SavedAddresses] Error fetching address or metadata:', err);
      setFetchError(err?.message || 'Connection timed out. Server is not responding.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddressAndMetadata();
  }, [user?.location_id]);

  // ── Save handler ──
  const handleSave = async () => {
    if (houseNumber === 0) {
      Alert.alert('Validation Error', 'House number is required.');
      return;
    }
    if (!streetNumber.trim()) {
      Alert.alert('Validation Error', 'Street number/name is required.');
      return;
    }
    if (!area.trim()) {
      Alert.alert('Validation Error', 'Area/Sector selection is required.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Validation Error', 'City selection is required.');
      return;
    }
    if (zipCode === 0) {
      Alert.alert('Validation Error', 'Zip code is required.');
      return;
    }

    try {
      setIsSaving(true);
      const selectedCityObj = citiesList.find((c) => c.name.toLowerCase() === city.toLowerCase());
      const selectedAreaObj = areasList.find((a) => a.name.toLowerCase() === area.toLowerCase());

      const payload = {
        countryName: country,
        cityName: city,
        areaName: area,
        resolvedCountryId: 1,
        resolvedCityId: selectedCityObj?.id,
        resolvedAreaId: selectedAreaObj?.id,
        houseNumber: houseNumber.toString(),
        streetNumber,
        latitude: latRef.current,
        longitude: lngRef.current,
        zipCode: zipCode.toString(),
        formatted_address: formattedAddress || `${houseNumber}, ${streetNumber}, ${area}, ${city}`,
      };

      const newLocation = await getOrCreateLocationChain(payload);

      if (user && user.id) {
        await updateUserOnBackend(user.id, { location_id: newLocation.id });
        await login({ ...user, location_id: newLocation.id, location: newLocation });
      }

      Alert.alert('Success', 'Address updated successfully!');
      router.back();
    } catch (err: any) {
      console.error('[SavedAddresses] Failed to save address:', err);
      Alert.alert('Error', err?.message || 'Failed to update address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#0B5A3E" />
        <Text style={{ marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' }}>
          Loading address details...
        </Text>
      </View>
    );
  }

  // ── Error state ──
  if (fetchError) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Failed to Load Address</Text>
          <Text style={styles.errorMessage}>{fetchError}</Text>

          <Pressable style={styles.retryBtn} onPress={fetchAddressAndMetadata}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry / Refresh</Text>
          </Pressable>

          <Pressable style={styles.cancelLink} onPress={() => router.back()}>
            <Text style={styles.cancelLinkText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Saved Address</Text>
        </View>
      </View>

      {/* Interactive Map */}
      <View style={styles.mapSection}>
        {initialMapCoords && (
          <WebView
            ref={webViewRef}
            style={styles.mapWebView}
            source={{ html: getLeafletHtml(initialMapCoords.lat, initialMapCoords.lng) }}
            onMessage={handleMapMessage}
            nestedScrollEnabled
            overScrollMode="never"
          />
        )}

        {/* Pin overlay */}
        <View style={styles.mapPinContainer} pointerEvents="none">
          {isGeocoding && (
            <View style={styles.mapGeocodingBadge}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          )}
          <Ionicons name="location" size={44} color="#EF4444" style={styles.mapPinIcon} />
        </View>

        {/* Hint banner */}
        <View style={styles.mapHintBanner} pointerEvents="none">
          <Ionicons name="move-outline" size={16} color="#10B981" />
          <Text style={styles.mapHintText}>Drag the map to update your location</Text>
        </View>

        {/* Re-center button */}
        <Pressable style={styles.reCenterBtn} onPress={reCenterMap}>
          <Ionicons name="locate" size={22} color="#10B981" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tipContainer}>
          <Ionicons name="map-outline" size={24} color="#16A34A" style={{ marginRight: 10 }} />
          <Text style={styles.tipText}>
            Move the pin on the map to auto-fill your street and zip. Select your city and area from the dropdowns below.
          </Text>
        </View>

        <SavedAddressForm
          houseNumber={houseNumber}
          setHouseNumber={setHouseNumber}
          streetNumber={streetNumber}
          setStreetNumber={setStreetNumber}
          area={area}
          setArea={setArea}
          city={city}
          setCity={setCity}
          country={country}
          zipCode={zipCode}
          setZipCode={setZipCode}
          formattedAddress={formattedAddress}
          setFormattedAddress={setFormattedAddress}
          citiesList={citiesList}
          filteredAreas={filteredAreas}
          showCityDropdown={showCityDropdown}
          setShowCityDropdown={setShowCityDropdown}
          showAreaDropdown={showAreaDropdown}
          setShowAreaDropdown={setShowAreaDropdown}
          isSaving={isSaving}
          handleSave={handleSave}
          onFocusInput={handleFocusInput}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
