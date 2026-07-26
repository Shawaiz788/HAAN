import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, SubCategory } from '@/types/category';

interface CategoryCardProps {
  category: Category;
  subcategories: SubCategory[];
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: number) => void;
  onAddSubCategory: (cat: Category) => void;
  onEditSubCategory: (sub: SubCategory, parentCat: Category) => void;
  onDeleteSubCategory: (subId: number) => void;
}

export default function CategoryCard({
  category,
  subcategories,
  onEditCategory,
  onDeleteCategory,
  onAddSubCategory,
  onEditSubCategory,
  onDeleteSubCategory,
}: CategoryCardProps) {
  const [expanded, setExpanded] = useState(true);

  const iconName = (category.image || 'flash') as keyof typeof Ionicons.glyphMap;
  const themeColor = category.color || '#10B981';

  // Helper to construct tinted light background matching reference UI
  const getLightBg = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.14)`;
    }
    return 'rgba(16, 185, 129, 0.14)';
  };

  return (
    <View style={styles.cardContainer}>
      {/* Category Header Row */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: getLightBg(themeColor) }]}>
          <Ionicons name={iconName} size={22} color={themeColor} />
        </View>

        <Pressable style={styles.headerInfoCol} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.catName}>{category.name}</Text>
          <Text style={styles.catSub}>
            {subcategories.length} {subcategories.length === 1 ? 'Subcategory' : 'Subcategories'}
          </Text>
        </Pressable>

        {/* Action Controls */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => onEditCategory(category)}>
            <Ionicons name="create-outline" size={18} color="#0B5A3E" />
          </Pressable>

          <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => category.id && onDeleteCategory(category.id)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>

          <Pressable style={styles.expandBtn} onPress={() => setExpanded(!expanded)}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </Pressable>
        </View>
      </View>

      {/* Expanded Subcategories Section */}
      {expanded && (
        <View style={styles.subSection}>
          <View style={styles.subHeaderRow}>
            <Text style={styles.subHeaderTitle}>Subcategories</Text>

            <Pressable style={styles.addSubBtn} onPress={() => onAddSubCategory(category)}>
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={styles.addSubBtnText}>Subcategory</Text>
            </Pressable>
          </View>

          {subcategories.length === 0 ? (
            <View style={styles.emptySubBox}>
              <Text style={styles.emptySubText}>No subcategories assigned yet.</Text>
            </View>
          ) : (
            <View style={styles.subList}>
              {subcategories.map((sub) => {
                const subIcon = (sub.image || iconName) as keyof typeof Ionicons.glyphMap;
                const subColor = sub.color || themeColor;
                const price = sub.base_price ?? sub.basePrice ?? 0;

                return (
                  <View key={sub.id} style={styles.subRow}>
                    <View style={[styles.subIconBadge, { backgroundColor: getLightBg(subColor) }]}>
                      <Ionicons name={subIcon} size={15} color={subColor} />
                    </View>

                    <View style={styles.subTextCol}>
                      <Text style={styles.subName}>{sub.name}</Text>
                      {price > 0 && <Text style={styles.subPrice}>Rs. {price}</Text>}
                    </View>

                    <View style={styles.subActions}>
                      <Pressable style={styles.subEditBtn} onPress={() => onEditSubCategory(sub, category)}>
                        <Ionicons name="pencil" size={14} color="#3B82F6" />
                      </Pressable>

                      <Pressable style={styles.subDeleteBtn} onPress={() => sub.id && onDeleteSubCategory(sub.id)}>
                        <Ionicons name="trash" size={14} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  catSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagActive: {
    backgroundColor: '#ECFDF5',
  },
  tagInactive: {
    backgroundColor: '#FEE2E2',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  tagTextActive: {
    color: '#0B5A3E',
  },
  tagTextInactive: {
    color: '#EF4444',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  expandBtn: {
    padding: 6,
  },
  subSection: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  addSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B5A3E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  addSubBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  subList: {
    gap: 8,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  subIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTextCol: {
    flex: 1,
  },
  subName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  subPrice: {
    fontSize: 11,
    color: '#6B7280',
  },
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subEditBtn: {
    padding: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  subDeleteBtn: {
    padding: 5,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
});
