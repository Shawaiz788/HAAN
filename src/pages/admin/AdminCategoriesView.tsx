import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminDrawerPanel from '@/components/admin/AdminDrawerPanel';
import CategoryModal from '@/components/admin/CategoryModal';
import CategoryCard from '@/components/admin/category/CategoryCard';
import SubCategoryModal from '@/components/admin/category/SubCategoryModal';
import EmptyState from '@/components/admin/common/EmptyState';
import { SkeletonCard } from '@/components/admin/common/SkeletonLoader';
import ConfirmDialog from '@/components/admin/common/ConfirmDialog';
import { categoryService } from '@/services/category';
import { Category, SubCategory } from '@/types/category';

export default function AdminCategoriesView() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal state
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // SubCategory Modal state
  const [parentCatForSub, setParentCatForSub] = useState<Category | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<SubCategory | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'subcategory'; id: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catData, subData] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getSubcategories(),
      ]);

      const formattedCats: Category[] = catData.map((c: any) => ({
        id: Number(c.id),
        name: c.name || `Category #${c.id}`,
        color: c.color || '#10B981',
        image: c.image || 'flash',
      }));

      const formattedSubs: SubCategory[] = subData.map((s: any) => {
        const catId =
          s.category_id !== undefined && s.category_id !== null
            ? Number(s.category_id)
            : typeof s.category === 'object' && s.category !== null
            ? Number(s.category.id)
            : typeof s.category === 'number'
            ? Number(s.category)
            : undefined;

        return {
          id: Number(s.id),
          name: s.name || `Subcategory #${s.id}`,
          color: s.color || '#10B981',
          image: s.image || 'flash',
          category_id: catId,
          base_price: Number(s.base_price || s.basePrice || 0),
        };
      });

      setCategories(formattedCats);
      setSubcategories(formattedSubs);
    } catch (err: any) {
      console.warn('[AdminCategoriesView] Error loading data from endpoints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category Actions
  const handleOpenAddCategory = () => {
    setSelectedCat(null);
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setSelectedCat(cat);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (savedCat: Category) => {
    try {
      if (savedCat.id) {
        await categoryService.updateCategory(savedCat.id, {
          name: savedCat.name,
          color: savedCat.color || '#10B981',
          image: savedCat.image || 'flash',
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === savedCat.id ? { ...c, ...savedCat } : c))
        );
      } else {
        const created = await categoryService.createCategory({
          name: savedCat.name,
          color: savedCat.color || '#10B981',
          image: savedCat.image || 'flash',
        });
        const newCat: Category = {
          ...savedCat,
          id: Number(created.id || Date.now()),
          name: created.name || savedCat.name,
        };
        setCategories((prev) => [newCat, ...prev]);
      }
    } catch (err: any) {
      console.error('[AdminCategoriesView] Save category error:', err);
      Alert.alert('Error', err?.message || 'Failed to save category.');
    }
  };

  // SubCategory Actions (Create on Spot & Edit)
  const handleOpenAddSubCategory = (parentCat: Category) => {
    setParentCatForSub(parentCat);
    setSelectedSubCat(null);
    setSubModalOpen(true);
  };

  const handleOpenEditSubCategory = (sub: SubCategory, parentCat: Category) => {
    setParentCatForSub(parentCat);
    setSelectedSubCat(sub);
    setSubModalOpen(true);
  };

  const handleSubCategorySaved = (savedSub: SubCategory, isNew: boolean) => {
    if (isNew) {
      setSubcategories((prev) => [savedSub, ...prev]);
    } else {
      setSubcategories((prev) =>
        prev.map((s) => (s.id === savedSub.id ? { ...s, ...savedSub } : s))
      );
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      if (deleteTarget.type === 'category') {
        await categoryService.deleteCategory(deleteTarget.id);
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setSubcategories((prev) => prev.filter((s) => s.category_id !== deleteTarget.id));
        if (Platform.OS === 'android') {
          ToastAndroid.show('Category deleted', ToastAndroid.SHORT);
        }
      } else {
        await categoryService.deleteSubcategory(deleteTarget.id);
        setSubcategories((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        if (Platform.OS === 'android') {
          ToastAndroid.show('Subcategory deleted', ToastAndroid.SHORT);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete item.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const matchCat = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSub = subcategories.some(
      (s) => s.category_id === c.id && s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchCat || matchSub;
  });

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Service Categories"
        subtitle={`Categories (${categories.length}) • Subcategories (${subcategories.length})`}
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      {/* Top Search and Add Category Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories or subcategories..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Pressable style={styles.addBtn} onPress={handleOpenAddCategory}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Category</Text>
        </Pressable>
      </View>

      {/* Scrollable Categories List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#0B5A3E"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            title="No categories found"
            subtitle="No categories match your search query."
            iconName="grid-outline"
          />
        ) : (
          filteredCategories.map((cat) => {
            const catSubs = subcategories.filter((s) => s.category_id === cat.id);

            return (
              <CategoryCard
                key={cat.id}
                category={cat}
                subcategories={catSubs}
                onEditCategory={handleOpenEditCategory}
                onDeleteCategory={(id) => setDeleteTarget({ type: 'category', id })}
                onAddSubCategory={handleOpenAddSubCategory}
                onEditSubCategory={handleOpenEditSubCategory}
                onDeleteSubCategory={(subId) => setDeleteTarget({ type: 'subcategory', id: subId })}
              />
            );
          })
        )}
      </ScrollView>

      {/* Modals */}
      <CategoryModal
        category={selectedCat}
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />

      <SubCategoryModal
        parentCategory={parentCatForSub}
        subCategory={selectedSubCat}
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        onSuccess={handleSubCategorySaved}
      />

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'category' ? 'Delete Category' : 'Delete Subcategory'}
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="categories"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B5A3E',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
});
