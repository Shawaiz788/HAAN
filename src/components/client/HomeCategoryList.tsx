import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useCategoryStore, { getCategoryStyle } from '@/store/categoryStore';
import { styles } from '@/styles/homeView.styles';

export const CategorySkeleton = ({ grid, opacity }: { grid?: boolean; opacity: Animated.Value }) => {
  return (
    <Animated.View
      style={[
        grid ? styles.skeletonGridCard : styles.skeletonCard,
        { opacity },
      ]}
    />
  );
};

interface HomeCategoryListProps {
  sheetState: 'collapsed' | 'default' | 'expanded';
  showAllCategories: boolean;
  setShowAllCategories: (show: boolean) => void;
  loadingCategories: boolean;
  shimmerAnim: Animated.Value;
  categories: any[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  activeSubcategory?: string;
  setActiveSubcategory?: (subCategory: string) => void;
}

const getLightBg = (hex: string) => {
  const cleanHex = (hex || '').replace('#', '');
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.14)`;
  }
  return 'rgba(16, 185, 129, 0.14)';
};

export default function HomeCategoryList({
  sheetState,
  showAllCategories,
  setShowAllCategories,
  loadingCategories,
  shimmerAnim,
  categories,
  activeCategory,
  setActiveCategory,
  activeSubcategory = '',
  setActiveSubcategory,
}: HomeCategoryListProps) {
  const getSubcategoriesByCategory = useCategoryStore((state) => state.getSubcategoriesByCategory);
  const subAnim = useRef(new Animated.Value(0)).current;

  // Resolve the active main category object
  const activeCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === activeCategory.toLowerCase()
  );

  // Retrieve subcategories dynamically for the active category
  const currentSubcategories = activeCategory
    ? getSubcategoriesByCategory(activeCategoryObj?.id || activeCategoryObj?.name || activeCategory)
    : [];

  // Animate subcategories row when active category or subcategories list changes
  useEffect(() => {
    if (activeCategory && currentSubcategories.length > 0) {
      subAnim.setValue(0);
      Animated.timing(subAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [activeCategory, currentSubcategories.length]);

  const handleMainCategoryPress = (catName: string) => {
    if (activeCategory !== catName) {
      setActiveCategory(catName);
      // Reset subcategory selection when switching main categories
      if (setActiveSubcategory) {
        setActiveSubcategory('');
      }
    }
  };

  return (
    <>
      <View style={styles.sheetHeaderWithAction}>
        <Text style={styles.sheetTitle}>What service do you need?</Text>
      </View>

      {sheetState === 'expanded' ? (
        <>
          {showAllCategories ? (
            <View style={styles.categoriesGrid}>
              {loadingCategories ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <CategorySkeleton key={i} grid opacity={shimmerAnim} />
                ))
              ) : (
                categories.map((cat) => {
                  const style = getCategoryStyle(cat);
                  const isSelected = activeCategory === cat.name;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[styles.categoryGridCard, isSelected && styles.categoryGridCardSelected]}
                      onPress={() => handleMainCategoryPress(cat.name)}
                    >
                      <View style={[styles.categoryIconCircle, { backgroundColor: getLightBg(style.color) }]}>
                        <Ionicons name={style.icon as any} size={22} color={isSelected ? '#10B981' : style.color} />
                      </View>
                      <Text style={[styles.categoryGridLabel, isSelected && styles.categoryGridLabelSelected]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : (
            <View style={styles.categoriesGridScrollContainer}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoriesGrid}
              >
                {loadingCategories ? (
                  [1, 2, 3, 4].map((i) => (
                    <CategorySkeleton key={i} grid opacity={shimmerAnim} />
                  ))
                ) : (
                  categories.map((cat) => {
                    const style = getCategoryStyle(cat);
                    const isSelected = activeCategory === cat.name;
                    return (
                      <Pressable
                        key={cat.id}
                        style={[styles.categoryGridCard, isSelected && styles.categoryGridCardSelected]}
                        onPress={() => handleMainCategoryPress(cat.name)}
                      >
                        <View style={[styles.categoryIconCircle, { backgroundColor: getLightBg(style.color) }]}>
                          <Ionicons name={style.icon as any} size={22} color={isSelected ? '#10B981' : style.color} />
                        </View>
                        <Text style={[styles.categoryGridLabel, isSelected && styles.categoryGridLabelSelected]} numberOfLines={1}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {/* Render the See All button below the grid when expanded */}
          <Pressable
            onPress={() => setShowAllCategories(!showAllCategories)}
            style={[styles.seeAllBtn, { alignSelf: 'flex-end', marginTop: 10, marginBottom: 8 }]}
          >
            <Text style={styles.seeAllBtnText}>
              {showAllCategories ? 'Show Less' : 'See All'}
            </Text>
            <Ionicons
              name={showAllCategories ? 'chevron-up' : 'chevron-down'}
              size={12}
              color="#10B981"
              style={{ marginLeft: 4 }}
            />
          </Pressable>
        </>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {loadingCategories ? (
            [1, 2, 3, 4, 5].map((i) => (
              <CategorySkeleton key={i} opacity={shimmerAnim} />
            ))
          ) : (
            categories.map((cat) => {
              const style = getCategoryStyle(cat);
              const isSelected = activeCategory === cat.name;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                  onPress={() => handleMainCategoryPress(cat.name)}
                >
                  <View style={[styles.categoryIconCircle, { backgroundColor: getLightBg(style.color) }]}>
                    <Ionicons name={style.icon as any} size={22} color={isSelected ? '#10B981' : style.color} />
                  </View>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Subcategories Horizontal Filter Chips / Pill Tags Row ──────── */}
      {activeCategory && currentSubcategories.length > 0 ? (
        <Animated.View
          style={[
            styles.subCategoryContainer,
            {
              opacity: subAnim,
              transform: [
                {
                  translateY: subAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.subCategoryLabel}>Select Specialty / Subcategory</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subCategoryScroll}
          >
            {currentSubcategories.map((sub: any) => {
              const isSubSelected =
                activeSubcategory.toLowerCase() === sub.name.toLowerCase();
              const subColor = sub.color || activeCategoryObj?.color || '#10B981';

              return (
                <Pressable
                  key={sub.id || sub.name}
                  style={[
                    styles.subChip,
                    isSubSelected && [
                      styles.subChipActive,
                      { borderColor: subColor, backgroundColor: getLightBg(subColor) },
                    ],
                  ]}
                  onPress={() => {
                    if (isSubSelected) {
                      if (setActiveSubcategory) setActiveSubcategory('');
                    } else {
                      if (setActiveSubcategory) setActiveSubcategory(sub.name);
                    }
                  }}
                >
                  {sub.image ? (
                    <Ionicons
                      name={sub.image as any}
                      size={14}
                      color={isSubSelected ? subColor : '#6B7280'}
                      style={{ marginRight: 5 }}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.subChipText,
                      isSubSelected && [styles.subChipTextActive, { color: subColor }],
                    ]}
                  >
                    {sub.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : null}
    </>
  );
}
