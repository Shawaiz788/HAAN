import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ToastAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, SubCategory } from '@/types/category';
import IconColorPicker from './IconColorPicker';
import { categoryService } from '@/services/category';

interface SubCategoryModalProps {
  parentCategory: Category | null;
  subCategory: SubCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subCat: SubCategory, isNew: boolean) => void;
}

export default function SubCategoryModal({
  parentCategory,
  subCategory,
  isOpen,
  onClose,
  onSuccess,
}: SubCategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10B981');
  const [image, setImage] = useState('flash');
  const [basePrice, setBasePrice] = useState('1000');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subCategory) {
      setName(subCategory.name || '');
      setColor(subCategory.color || parentCategory?.color || '#10B981');
      setImage(subCategory.image || parentCategory?.image || 'flash');
      setBasePrice(
        subCategory.base_price !== undefined
          ? String(subCategory.base_price)
          : subCategory.basePrice !== undefined
          ? String(subCategory.basePrice)
          : '1000'
      );
    } else {
      setName('');
      setColor(parentCategory?.color || '#10B981');
      setImage(parentCategory?.image || 'flash');
      setBasePrice('1000');
    }
  }, [subCategory, parentCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Subcategory name is required.');
      return;
    }
    const catId = parentCategory?.id || subCategory?.category_id;
    if (!catId) {
      Alert.alert('Validation Error', 'Parent category selection is missing.');
      return;
    }
    const priceNum = Number(basePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Validation Error', 'Base price must be a valid non-negative number.');
      return;
    }

    try {
      setLoading(true);
      if (subCategory?.id) {
        // Update Subcategory
        const updated = await categoryService.updateSubcategory(subCategory.id, {
          name: name.trim(),
          color,
          image,
          category_id: Number(catId),
          base_price: priceNum,
        });
        const finalSub: SubCategory = {
          ...subCategory,
          ...updated,
          name: name.trim(),
          color,
          image,
          category_id: Number(catId),
          base_price: priceNum,
        };
        onSuccess(finalSub, false);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Subcategory updated!', ToastAndroid.SHORT);
        }
      } else {
        // Create Subcategory on spot
        const created = await categoryService.createSubcategory({
          name: name.trim(),
          color,
          image,
          category_id: Number(catId),
          base_price: priceNum,
        });
        const finalSub: SubCategory = {
          id: Number(created.id || Date.now()),
          name: created.name || name.trim(),
          color: created.color || color,
          image: created.image || image,
          category_id: Number(catId),
          base_price: priceNum,
        };
        onSuccess(finalSub, true);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Subcategory created on spot!', ToastAndroid.SHORT);
        }
      }
      onClose();
    } catch (err: any) {
      console.error('[SubCategoryModal] Error saving subcategory:', err);
      Alert.alert('Error', err?.message || 'Failed to save subcategory.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {subCategory ? 'Edit Subcategory' : 'Add Subcategory'}
              </Text>
              {parentCategory?.name ? (
                <Text style={styles.sheetSubTitle}>Parent Category: {parentCategory.name}</Text>
              ) : null}
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Subcategory Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Subcategory Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. UPS Repair, Tap Installation, AC Fitting"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Base Price Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Standard Base Price (Rs.) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1500"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={basePrice}
                onChangeText={setBasePrice}
              />
            </View>

            {/* Icon & Theme Color Selector */}
            <IconColorPicker
              selectedIcon={image}
              selectedColor={color}
              onSelectIcon={setImage}
              onSelectColor={setColor}
              label="Subcategory Icon & Accent Color"
            />

            {/* Submit Action */}
            <Pressable style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {subCategory ? 'Save Subcategory' : 'Create Subcategory'}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  sheetSubTitle: {
    fontSize: 12,
    color: '#0B5A3E',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  inputWrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B5A3E',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
