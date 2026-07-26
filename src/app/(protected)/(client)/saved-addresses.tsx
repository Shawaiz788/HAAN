import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
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
import { getLocationById, getOrCreateLocationChain, UserLocation } from '@/services/location';
import { getCities, City } from '@/services/city';
import { getAreas, Area } from '@/services/area';
import { updateUserOnBackend } from '@/services/user';

export default function SavedAddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const [latitude, setLatitude] = useState<number>(31.5204); // Defaults
  const [longitude, setLongitude] = useState<number>(74.3587);

  // Filter areas based on the currently selected city
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
    // Fallback: If area has no city assigned (city: null), include it so list is not empty
    return true;
  });

  const [fetchError, setFetchError] = useState<string | null>(null);

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
          if (loc.latitude) setLatitude(loc.latitude);
          if (loc.longitude) setLongitude(loc.longitude);

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
        }
      }

      // Country is hardcoded as requested
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
        latitude,
        longitude,
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.tipContainer}>
          <Ionicons name="map-outline" size={24} color="#16A34A" style={{ marginRight: 10 }} />
          <Text style={styles.tipText}>
            Please select your city and area, and provide your home address details below.
          </Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          {/* House and Street */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>House #</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 42"
                  value={houseNumber ? houseNumber.toString() : ''}
                  onChangeText={(val) => setHouseNumber(val ? Number(val.replace(/[^0-9]/g, '')) : 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Street / Road</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Street 4"
                  value={streetNumber}
                  onChangeText={setStreetNumber}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* City Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            <View style={{ zIndex: 2000 }}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => {
                  setShowCityDropdown(!showCityDropdown);
                  setShowAreaDropdown(false);
                }}
              >
                <Text style={city ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                  {city || 'Select City...'}
                </Text>
                <Ionicons name={showCityDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#4B5563" />
              </Pressable>

              {showCityDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                    {citiesList.map((c) => (
                      <Pressable
                        key={c.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          if (city !== c.name) {
                            setCity(c.name);
                            setArea('');
                          }
                          setShowCityDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{c.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Area Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Area / Sector</Text>
            <View style={{ zIndex: 1000 }}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => {
                  setShowAreaDropdown(!showAreaDropdown);
                  setShowCityDropdown(false);
                }}
              >
                <Text style={area ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                  {area || 'Select Area / Sector...'}
                </Text>
                <Ionicons name={showAreaDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#4B5563" />
              </Pressable>

              {showAreaDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                    {filteredAreas.map((a) => (
                      <Pressable
                        key={a.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setArea(a.name);
                          setShowAreaDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{a.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Country and Zip */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Country</Text>
              <View style={[styles.inputWrapper, styles.disabledInput]}>
                <TextInput
                  style={[styles.textInput, { color: '#9CA3AF' }]}
                  value={country}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Zip Code</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 54000"
                  value={zipCode ? zipCode.toString() : ''}
                  onChangeText={(val) => setZipCode(val ? Number(val.replace(/[^0-9]/g, '')) : 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Formatted Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Formatted Full Address (Optional)</Text>
            <View style={[styles.inputWrapper, { height: 72, alignItems: 'flex-start', paddingVertical: 8 }]}>
              <Ionicons name="location-outline" size={18} color="#9CA3AF" style={[styles.inputIcon, { marginTop: 4 }]} />
              <TextInput
                style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                placeholder="Leave blank to auto-generate"
                value={formattedAddress}
                onChangeText={setFormattedAddress}
                multiline
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Address</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#082C18',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1B5E20',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 48,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    height: '100%',
  },
  disabledInput: {
    backgroundColor: '#E5E7EB',
    opacity: 0.7,
  },
  saveBtn: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  dropdownTextPlaceholder: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownTextSelected: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    maxHeight: 180,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  errorCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B5A3E',
    height: 46,
    borderRadius: 12,
    width: '100%',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  cancelLinkText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 13,
  },
});
