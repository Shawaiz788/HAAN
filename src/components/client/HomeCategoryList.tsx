import React from 'react';
import { View, Text, ScrollView, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryStyle } from '@/store/categoryStore';
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
}: HomeCategoryListProps) {
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
                      onPress={() => setActiveCategory(cat.name)}
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
                        onPress={() => setActiveCategory(cat.name)}
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
                  onPress={() => setActiveCategory(cat.name)}
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
    </>
  );
}
