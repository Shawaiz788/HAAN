import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { City, getCities, Area, getAreas } from '@/services/location';
import { getCountryFromPhone } from '@/constants/locationData';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

import ProfileHeader from '@/components/profile-setup/ProfileHeader';
import TextInputField from '@/components/profile-setup/TextInputField';
import SimpleTextInput from '@/components/profile-setup/SimpleTextInput';
import DropdownSelector from '@/components/profile-setup/DropdownSelector';
import GpsCoordinatesField from '@/components/profile-setup/GpsCoordinatesField';
import GenderSelector from '@/components/profile-setup/GenderSelector';
import RoleSelector, { Role } from '@/components/profile-setup/RoleSelector';
import MapPickerModal from '@/components/profile-setup/MapPickerModal';
import { useProfileSubmit } from '@/hooks/useProfileSubmit';
import styles from '@/styles/profileSetup.styles';

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const countryName = getCountryFromPhone(user?.phoneNumber);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [gender, setGender] = useState<string>('male');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Location state ───────────────────────────────────────────────────────────
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [areasList, setAreasList] = useState<Area[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Lahore');
  const [area, setArea] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);

  // ── Map picker state ─────────────────────────────────────────────────────────
  const [mapAddress, setMapAddress] = useState('');
  const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapWebViewRef = useRef<WebView>(null);
  const hasFetched = useRef(false);

  // ── Load cities & areas on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadAddressData = async () => {
      try {
        console.log('[profile-setup] Loading cities and areas from backend API...');
        const [cities, areas] = await Promise.all([getCities(), getAreas()]);
        setCitiesList(cities || []);
        setAreasList(areas || []);
        if (cities && cities.length > 0) setSelectedCity(cities[0].name);
      } catch (err) {
        console.error('[profile-setup] Failed to load cities/areas from backend:', err);
      }
    };
    loadAddressData();
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const countryCities = citiesList.map((c) => c.name);

  const matchedCityObj = citiesList.find(
    (c) => c.name.toLowerCase() === selectedCity.toLowerCase()
  );
  const cityAreas = matchedCityObj
    ? areasList
        .filter((a: any) => {
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

          if (areaCityId !== null && areaCityId !== undefined) {
            return String(areaCityId) === String(matchedCityObj.id);
          }
          if (areaCityName) {
            return areaCityName.toLowerCase() === selectedCity.toLowerCase();
          }
          // Fallback: If area has no city assigned (city: null), include it so list is not empty
          return true;
        })
        .map((a) => a.name)
    : areasList.filter((a) => a && a.name).map((a) => a.name);

  const isNameValid = fullName.trim().length >= 3;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Reset area when city changes
  useEffect(() => { setArea(''); }, [selectedCity]);

  // ── GPS helpers ──────────────────────────────────────────────────────────────
  const getInitialCoords = () => {
    if (latitude !== null && longitude !== null) return { lat: latitude, lng: longitude };
    return { lat: 31.5204, lng: 74.3587 }; // Default: Lahore
  };

  const fetchGpsLocation = async (silent = false) => {
    setLoadingGps(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) Alert.alert('Permission Denied', 'Permission to access location was denied. Please input pin location manually.');
        return;
      }
      let loc = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
        ]);
      } catch (e) {
        console.log('[profile-setup] fetchGpsLocation timed out. Fetching cached position...');
        loc = await Location.getLastKnownPositionAsync();
      }
      if (!loc) throw new Error('GPS lookup failed.');
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      try {
        const response = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (response && response.length > 0) {
          const item = response[0];
          const parts = [item.name, item.street, item.district || item.subregion, item.city].filter(Boolean);
          setFormattedAddress(parts.join(', '));
        }
      } catch (_) { /* Silently ignore */ }
    } catch (err: any) {
      if (!silent) Alert.alert('GPS Error', 'Failed to retrieve your current location.');
      console.error(err);
    } finally {
      setLoadingGps(false);
    }
  };

  // Auto-fetch GPS on mount
  useEffect(() => {
    if (latitude === null || longitude === null) fetchGpsLocation(true);
  }, []);

  // ── Map helpers ──────────────────────────────────────────────────────────────
  const reverseGeocodeMap = async (lat: number, lng: number) => {
    try {
      const response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const item = response[0];
        const parts = [item.name, item.street, item.district || item.subregion, item.city].filter(Boolean);
        setMapAddress(parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (_) {
      setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // Sync map state when picker opens
  useEffect(() => {
    if (showMapPicker) {
      const init = getInitialCoords();
      setMapCoords({ latitude: init.lat, longitude: init.lng });
      setMapAddress(latitude !== null && longitude !== null ? 'Selected Coordinates' : 'Loading address...');
      reverseGeocodeMap(init.lat, init.lng);
    }
  }, [showMapPicker]);

  const handleMapModalMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'REGION_CHANGED') {
        setMapCoords({ latitude: data.latitude, longitude: data.longitude });
        reverseGeocodeMap(data.latitude, data.longitude);
      }
    } catch (_) { /* ignore JSON parse errors */ }
  };

  const reCenterMapPicker = async () => {
    try {
      let loc = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
        ]);
      } catch (_) {
        console.log('[profile-setup] reCenterMapPicker timed out. Fetching cached position...');
        loc = await Location.getLastKnownPositionAsync();
      }
      if (loc) {
        const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setMapCoords(newCoords);
        reverseGeocodeMap(newCoords.latitude, newCoords.longitude);
        if (mapWebViewRef.current) {
          mapWebViewRef.current.injectJavaScript(`
            if (map) { map.setView([${newCoords.latitude}, ${newCoords.longitude}], 16); }
            true;
          `);
        }
      }
    } catch (_) { /* Silence errors */ }
  };

  const confirmSelectedMapLocation = () => {
    if (mapCoords) {
      setLatitude(mapCoords.latitude);
      setLongitude(mapCoords.longitude);
      if (mapAddress && mapAddress !== 'Loading address...') setFormattedAddress(mapAddress);
    }
    setShowMapPicker(false);
  };

  // ── Submit hook ──────────────────────────────────────────────────────────────
  // Look up IDs from already-loaded lists — no extra API call needed on submit
  const selectedCityId = matchedCityObj?.id;
  const selectedAreaObj = areasList.find(
    (a) => a && a.name && a.name.toLowerCase() === area.toLowerCase()
  );
  const selectedAreaId = selectedAreaObj?.id;

  const { handleGoToHome } = useProfileSubmit({
    user,
    params,
    countryName,
    fullName,
    email,
    role,
    gender,
    selectedCity,
    selectedCityId,
    area,
    selectedAreaId,
    houseNumber,
    streetNumber,
    zipCode,
    latitude,
    longitude,
    formattedAddress,
    setIsLoading,
    setErrorMsg,
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  const initialCoords = getInitialCoords();

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5A3E" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProfileHeader topInset={insets.top} />

          <View style={styles.formContainer}>
            {/* Error Banner */}
            {errorMsg && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <TextInputField
              label="Full Name"
              value={fullName}
              placeholder="John Doe"
              isValid={isNameValid}
              icon="person-outline"
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              onChangeText={(val) => setFullName(val.replace(/[0-9]/g, ''))}
            />

            <TextInputField
              label="Email Address"
              value={email}
              placeholder="you@example.com"
              isValid={isEmailValid}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              onChangeText={setEmail}
            />

            <DropdownSelector
              label="Select your City"
              value={selectedCity}
              options={countryCities}
              placeholder="Select City..."
              zIndex={2000}
              isOpen={showCityDropdown}
              onToggle={() => { setShowCityDropdown(!showCityDropdown); setShowAreaDropdown(false); }}
              onSelect={(val) => { setSelectedCity(val); setShowCityDropdown(false); if (errorMsg) setErrorMsg(null); }}
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
            />

            <DropdownSelector
              label="Area / Sector"
              value={area}
              options={cityAreas}
              placeholder="Select Area / Sector..."
              zIndex={1000}
              isOpen={showAreaDropdown}
              onToggle={() => setShowAreaDropdown(!showAreaDropdown)}
              onSelect={(val) => { setArea(val); setShowAreaDropdown(false); if (errorMsg) setErrorMsg(null); }}
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
            />

            <SimpleTextInput
              label="Formatted Address"
              value={formattedAddress}
              placeholder="E.g. House 42, Street 3, Phase 5 DHA, Lahore"
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              onChangeText={setFormattedAddress}
            />

            <SimpleTextInput
              label="House Number"
              value={houseNumber}
              placeholder="E.g. 42"
              keyboardType="numeric"
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              onChangeText={(val) => setHouseNumber(val.replace(/[^0-9]/g, ''))}
            />

            <SimpleTextInput
              label="Street Number"
              value={streetNumber}
              placeholder="E.g. Street 5"
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              onChangeText={setStreetNumber}
            />

            <SimpleTextInput
              label="Zip Code"
              value={zipCode}
              placeholder="E.g. 54000"
              keyboardType="numeric"
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              onChangeText={(val) => setZipCode(val.replace(/[^0-9]/g, ''))}
            />

            <GpsCoordinatesField
              latitude={latitude}
              longitude={longitude}
              loadingGps={loadingGps}
              onOpenMap={() => setShowMapPicker(true)}
              onFetchGps={() => fetchGpsLocation(false)}
            />

            <GenderSelector gender={gender} onSelectGender={setGender} />

            <RoleSelector role={role} onSelectRole={setRole} />
          </View>
        </ScrollView>

        {/* Fixed Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              isLoading && styles.saveButtonDisabled,
            ]}
            onPress={handleGoToHome}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Finish & Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialLat={initialCoords.lat}
        initialLng={initialCoords.lng}
        mapAddress={mapAddress}
        mapWebViewRef={mapWebViewRef}
        onMessage={handleMapModalMessage}
        onReCenter={reCenterMapPicker}
        onConfirm={confirmSelectedMapLocation}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}

