import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeCategoryList from './HomeCategoryList';
import { styles } from '@/styles/homeView.styles';
import { getPaymentPrefStyle } from '@/utils/paymentCache';

export { getPaymentPrefStyle };

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.8;

interface HomeBottomSheetProps {
  bottomSheetStyle: any;
  panResponder: any;
  sheetState: 'collapsed' | 'default' | 'expanded';
  address: string;
  showAllCategories: boolean;
  setShowAllCategories: (show: boolean) => void;
  loadingCategories: boolean;
  shimmerAnim: Animated.Value;
  categories: any[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  activeSubcategory?: string;
  setActiveSubcategory?: (subCat: string) => void;
  locStreet: string;
  setLocStreet: (val: string) => void;
  locArea: string;
  setLocArea: (val: string) => void;
  locCity: string;
  setLocCity: (val: string) => void;
  locSearchLoading: boolean;
  updateMapFromFields: () => void;
  openSearchModal: () => void;
  budget: string;
  setBudget: (val: string) => void;
  minBasePrice?: number;
  loadingPaymentPrefs: boolean;
  paymentPreferences: any[];
  selectedPaymentPrefId: number | null;
  setSelectedPaymentPrefId: (id: number) => void;
  description: string;
  setDescription: (val: string) => void;
  attachments: Array<{ id: string; uri: string; uploading?: boolean }>;
  handleRemoveAttachment: (id: string) => void;
  handleAddAttachment: () => void;
  handleRequestTask: () => void;
  hasMissingEssentialData?: boolean;
  onSmartRetry?: () => void;
  isRetryingData?: boolean;
}

export default function HomeBottomSheet({
  bottomSheetStyle,
  panResponder,
  sheetState,
  address,
  showAllCategories,
  setShowAllCategories,
  loadingCategories,
  shimmerAnim,
  categories,
  activeCategory,
  setActiveCategory,
  activeSubcategory,
  setActiveSubcategory,
  locStreet,
  setLocStreet,
  locArea,
  setLocArea,
  locCity,
  setLocCity,
  locSearchLoading,
  updateMapFromFields,
  openSearchModal,
  budget,
  setBudget,
  minBasePrice,
  loadingPaymentPrefs,
  paymentPreferences,
  selectedPaymentPrefId,
  setSelectedPaymentPrefId,
  description,
  setDescription,
  attachments,
  handleRemoveAttachment,
  handleAddAttachment,
  handleRequestTask,
  hasMissingEssentialData,
  onSmartRetry,
  isRetryingData,
}: HomeBottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View style={bottomSheetStyle}>
      {/* Interactive Drag Handle Area (Tappable and Swipeable) */}
      <View style={styles.sheetHandleContainer} {...panResponder.panHandlers}>
        <View style={styles.sheetHandle} />
        {sheetState === 'collapsed' && (
          <View style={styles.collapsedHeader}>
            <Text style={styles.collapsedAddressText} numberOfLines={1}>
              📍 {address}
            </Text>
            <Text style={styles.collapsedSubText}>
              Tap or swipe up to set details & budget
            </Text>
          </View>
        )}
      </View>

      {/* Scrollable contents to handle short keyboard viewports */}
      <ScrollView
        style={{ maxHeight: sheetState === 'expanded' ? SHEET_HEIGHT - 60 : height * 0.4 }}
        contentContainerStyle={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={sheetState !== 'collapsed'}
      >
        {hasMissingEssentialData && onSmartRetry ? (
          <View style={styles.smartRetryCard}>
            <View style={styles.smartRetryHeaderRow}>
              <Ionicons name="warning-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.smartRetryTitle}>
                {categories.length === 0 && paymentPreferences.length === 0
                  ? 'Categories & Payment options failed to load'
                  : categories.length === 0
                  ? 'Service categories failed to load'
                  : 'Payment options failed to load'}
              </Text>
            </View>
            <Text style={styles.smartRetrySubText}>
              Essential app data could not be fetched from the backend. Tap below to retry.
            </Text>
            <Pressable
              style={[styles.smartRetryBtn, isRetryingData && styles.smartRetryBtnDisabled]}
              onPress={onSmartRetry}
              disabled={isRetryingData}
            >
              {isRetryingData ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.smartRetryBtnText}>Retry Loading Data</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        <HomeCategoryList
          sheetState={sheetState}
          showAllCategories={showAllCategories}
          setShowAllCategories={setShowAllCategories}
          loadingCategories={loadingCategories}
          shimmerAnim={shimmerAnim}
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          activeSubcategory={activeSubcategory}
          setActiveSubcategory={setActiveSubcategory}
        />

        <View style={styles.inputContainer}>
          {/* Location / Address display */}
          {sheetState === 'expanded' ? (
            <View style={styles.sheetLocFormContainer}>
              <Text style={styles.inputSectionTitle}>Update Location on Map</Text>

              <View style={styles.sheetLocFormRow}>
                <View style={[styles.sheetLocInputWrapper, { flex: 1 }]}>
                  <Text style={styles.sheetLocFieldLabel}>House / Street / Building</Text>
                  <TextInput
                    style={styles.sheetLocInput}
                    placeholder="e.g. House 42, Street 3"
                    placeholderTextColor="#9CA3AF"
                    value={locStreet}
                    onChangeText={setLocStreet}
                  />
                </View>
              </View>

              <View style={styles.sheetLocFormRow}>
                <View style={[styles.sheetLocInputWrapper, { flex: 0.5 }]}>
                  <Text style={styles.sheetLocFieldLabel}>Area / Neighborhood</Text>
                  <TextInput
                    style={styles.sheetLocInput}
                    placeholder="e.g. DHA Phase 5"
                    placeholderTextColor="#9CA3AF"
                    value={locArea}
                    onChangeText={setLocArea}
                  />
                </View>
                <View style={[styles.sheetLocInputWrapper, { flex: 0.5 }]}>
                  <Text style={styles.sheetLocFieldLabel}>City</Text>
                  <TextInput
                    style={styles.sheetLocInput}
                    placeholder="e.g. Lahore"
                    placeholderTextColor="#9CA3AF"
                    value={locCity}
                    onChangeText={setLocCity}
                  />
                </View>
              </View>

              <Pressable
                style={[styles.sheetLocSubmitBtn, locSearchLoading && { opacity: 0.7 }]}
                onPress={updateMapFromFields}
                disabled={locSearchLoading}
              >
                {locSearchLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="map-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetLocSubmitBtnText}>Locate & Update Map</Text>
                  </>
                )}
              </Pressable>

              {/* Display resolved address */}
              <View style={styles.sheetCurrentAddressBanner}>
                <Ionicons name="location" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.sheetCurrentAddressText} numberOfLines={2}>
                  Current Map Center: {address}
                </Text>
              </View>
            </View>
          ) : (
            <Pressable style={styles.addressPill} onPress={openSearchModal}>
              <Ionicons name="location" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.addressText} numberOfLines={1}>
                {address}
              </Text>
            </Pressable>
          )}

          {/* Budget Input & Payment selection in a Row */}
          <View style={styles.formRow}>
            <View style={styles.budgetInputContainer}>
              <Text style={styles.currencyPrefix}>Rs.</Text>
              <TextInput
                style={styles.budgetInput}
                placeholder="Enter Budget"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />
            </View>

            {/* Payment Method Selector */}
            <View style={styles.paymentSelectorContainer}>
              {loadingPaymentPrefs ? (
                [1, 2, 3].map((i) => (
                  <Animated.View
                    key={i}
                    style={[styles.paymentBtnSkeleton, { opacity: shimmerAnim }]}
                  />
                ))
              ) : (
                paymentPreferences.map((pm) => {
                  const isSelected = selectedPaymentPrefId === pm.id;
                  const style = getPaymentPrefStyle(pm.name);
                  return (
                    <Pressable
                      key={pm.id}
                      style={[styles.paymentBtn, isSelected && styles.paymentBtnSelected]}
                      onPress={() => setSelectedPaymentPrefId(pm.id)}
                    >
                      <Ionicons name={style.icon as any} size={18} color={isSelected ? '#10B981' : style.logoColor} />
                      <Text style={[styles.paymentBtnLabel, isSelected && styles.paymentLabelSelected]}>
                        {pm.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          {/* Base Price Helper & Validation Hint */}
          {minBasePrice && minBasePrice > 0 ? (
            <View style={{ marginTop: 4, paddingHorizontal: 2 }}>
              {budget !== '' && !isNaN(Number(budget)) && Number(budget) < minBasePrice ? (
                <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>
                  ⚠️ Minimum required budget is Rs. {minBasePrice.toLocaleString()}
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>
                  Min base price: Rs. {minBasePrice.toLocaleString()}
                </Text>
              )}
            </View>
          ) : null}

          {/* Description Input */}
          <View style={styles.descriptionContainer}>
            <Ionicons name="create-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.descriptionInput}
              placeholder="Provide details about the job..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Attachments Section */}
          <View style={styles.attachmentsContainer}>
            <Text style={styles.attachmentsTitle}>Attachments ({attachments.length}/3)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsRow}>
              {attachments.map((item) => (
                <View key={item.id} style={styles.attachmentCard}>
                  <Image source={{ uri: item.uri }} style={styles.attachmentImage} />

                  {item.uploading ? (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.uploadText}>Uploading</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => handleRemoveAttachment(item.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </Pressable>
                  )}
                </View>
              ))}

              {attachments.length < 3 && (
                <Pressable style={styles.addAttachmentBtn} onPress={handleAddAttachment}>
                  <Ionicons name="camera-outline" size={20} color="#6B7280" />
                  <Text style={styles.addAttachmentText}>Add Photo</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Find Professional Action Button */}
        <Pressable style={styles.actionButton} onPress={handleRequestTask}>
          <Text style={styles.actionButtonText}>Find Professional</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}
