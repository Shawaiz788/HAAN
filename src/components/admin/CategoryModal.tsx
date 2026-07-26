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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '@/types/category';
import IconColorPicker from './category/IconColorPicker';

export interface AdminCategoryItem extends Category {}

interface CategoryModalProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cat: Category) => void;
}

export default function CategoryModal({
  category,
  isOpen,
  onClose,
  onSave,
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10B981');
  const [image, setImage] = useState('flash');

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setColor(category.color || '#10B981');
      setImage(category.image || 'flash');
    } else {
      setName('');
      setColor('#10B981');
      setImage('flash');
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }

    const payload: Category = {
      name: name.trim(),
      color,
      image,
    };
    if (category?.id) {
      payload.id = category.id;
    }

    onSave(payload);

    if (Platform.OS === 'android') {
      ToastAndroid.show(`Category ${category ? 'updated' : 'created'} successfully!`, ToastAndroid.SHORT);
    }
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{category ? 'Edit Service Category' : 'Create Service Category'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Category Name Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Category Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Electrician, Plumbing, AC Repair"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Icon & Theme Color Selector */}
            <IconColorPicker
              selectedIcon={image}
              selectedColor={color}
              onSelectIcon={setImage}
              onSelectColor={setColor}
            />

            {/* Save Action Button */}
            <Pressable style={styles.saveBtn} onPress={handleSubmit}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{category ? 'Save Changes' : 'Create Category'}</Text>
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
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  toggleBtnInactive: {
    backgroundColor: '#FEE2E2',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: '#0B5A3E',
  },
  toggleTextInactive: {
    color: '#EF4444',
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
