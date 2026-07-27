import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '@/styles/savedAddresses.styles';
import { City, Area } from '@/types';

interface SavedAddressFormProps {
  // Form values
  houseNumber: number;
  setHouseNumber: (val: number) => void;
  streetNumber: string;
  setStreetNumber: (val: string) => void;
  area: string;
  setArea: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  country: string;
  zipCode: number;
  setZipCode: (val: number) => void;
  formattedAddress: string;
  setFormattedAddress: (val: string) => void;

  // Dropdown data
  citiesList: City[];
  filteredAreas: Area[];

  // Dropdown visibility
  showCityDropdown: boolean;
  setShowCityDropdown: (val: boolean) => void;
  showAreaDropdown: boolean;
  setShowAreaDropdown: (val: boolean) => void;

  // Save handler
  isSaving: boolean;
  handleSave: () => void;

  // Focus callback for keyboard scrolling
  onFocusInput?: () => void;
}

export default function SavedAddressForm({
  houseNumber,
  setHouseNumber,
  streetNumber,
  setStreetNumber,
  area,
  setArea,
  city,
  setCity,
  country,
  zipCode,
  setZipCode,
  formattedAddress,
  setFormattedAddress,
  citiesList,
  filteredAreas,
  showCityDropdown,
  setShowCityDropdown,
  showAreaDropdown,
  setShowAreaDropdown,
  isSaving,
  handleSave,
  onFocusInput,
}: SavedAddressFormProps) {
  return (
    <>
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
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '').slice(0, 5);
                  setHouseNumber(cleaned ? Number(cleaned) : 0);
                }}
                onFocus={onFocusInput}
                keyboardType="numeric"
                maxLength={5}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Street #</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 4B"
                value={streetNumber}
                onChangeText={(val) => setStreetNumber(val.slice(0, 5))}
                maxLength={5}
                onFocus={onFocusInput}
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
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                  setZipCode(cleaned ? Number(cleaned) : 0);
                }}
                onFocus={onFocusInput}
                keyboardType="numeric"
                maxLength={6}
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
              onFocus={onFocusInput}
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
    </>
  );
}
