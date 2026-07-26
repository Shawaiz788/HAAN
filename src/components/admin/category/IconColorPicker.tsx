import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PRESET_COLORS = [
  '#10B981', // Emerald / Green (Electrician)
  '#3B82F6', // Blue (AC Service)
  '#F59E0B', // Amber / Gold (Cleaning / Driver)
  '#EC4899', // Pink (Painter)
  '#8B5CF6', // Purple (Plumber)
  '#EF4444', // Red / Rose (Mason)
  '#06B6D4', // Cyan
  '#84CC16', // Lime (Mehndi / Cleaner)
  '#F97316', // Orange (Cook)
  '#64748B', // Slate / Gray (Other)
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

export const AVAILABLE_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'flash',
  'build',
  'snow',
  'school',
  'leaf',
  'sparkles',
  'brush',
  'hammer',
  'restaurant',
  'car',
  'construct',
  'color-palette',
  'home',
  'heart',
  'medkit',
  'cut',
  'desktop',
  'key',
  'paw',
  'tv',
  'shirt',
  'options',
  'grid',
  'ellipsis-horizontal',
];

interface IconColorPickerProps {
  selectedIcon: string;
  selectedColor: string;
  onSelectIcon: (icon: string) => void;
  onSelectColor: (color: string) => void;
  label?: string;
}

export default function IconColorPicker({
  selectedIcon,
  selectedColor,
  onSelectIcon,
  onSelectColor,
  label = 'Category Icon & Theme Color',
}: IconColorPickerProps) {
  const currentIcon = (selectedIcon || 'flash') as keyof typeof Ionicons.glyphMap;
  const currentColor = selectedColor || '#10B981';

  // Helper to convert hex to 15% opacity rgba background matching user's reference screenshot
  const getLightBg = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.12)`;
    }
    return 'rgba(16, 185, 129, 0.12)';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{label}</Text>

      {/* Live Preview Card */}
      <View style={styles.previewBox}>
        <View style={[styles.avatarCircle, { backgroundColor: getLightBg(currentColor) }]}>
          <Ionicons name={currentIcon} size={28} color={currentColor} />
        </View>
        <View style={styles.previewTextCol}>
          <Text style={styles.previewTitle}>Live Preview</Text>
          <Text style={styles.previewSub}>
            Icon: <Text style={{ fontWeight: '700', color: currentColor }}>{currentIcon}</Text> • Color:{' '}
            <Text style={{ fontWeight: '700', color: currentColor }}>{currentColor}</Text>
          </Text>
        </View>
      </View>

      {/* Color Selection Palette */}
      <Text style={styles.subLabel}>Theme Color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
        {PRESET_COLORS.map((c) => {
          const isSelected = selectedColor.toLowerCase() === c.toLowerCase();
          return (
            <Pressable
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                isSelected && styles.colorSwatchSelected,
              ]}
              onPress={() => onSelectColor(c)}
            >
              {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Icon Selection Grid */}
      <Text style={styles.subLabel}>Select Icon</Text>
      <View style={styles.iconGrid}>
        {AVAILABLE_ICONS.map((iconName) => {
          const isSelected = selectedIcon === iconName;
          return (
            <Pressable
              key={iconName}
              style={[
                styles.iconTile,
                isSelected ? { backgroundColor: getLightBg(currentColor), borderColor: currentColor } : null,
              ]}
              onPress={() => onSelectIcon(iconName)}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isSelected ? currentColor : '#6B7280'}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTextCol: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  previewSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#111827',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
