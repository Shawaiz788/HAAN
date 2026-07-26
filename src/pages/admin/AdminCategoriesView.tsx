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
import CategoryModal, { AdminCategoryItem } from '@/components/admin/CategoryModal';
import EmptyState from '@/components/admin/common/EmptyState';
import { SkeletonCard } from '@/components/admin/common/SkeletonLoader';
import ConfirmDialog from '@/components/admin/common/ConfirmDialog';
import { masterDataService } from '@/services/masterData';

export default function AdminCategoriesView() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<AdminCategoryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await masterDataService.getCategories();
      const formatted: AdminCategoryItem[] = data.map((c: any) => ({
        id: Number(c.id),
        name: c.name || `Category #${c.id}`,
        commissionRate: Number(c.commission_rate || c.commissionRate || 10),
        active: c.active !== false && c.is_active !== false,
        totalJobs: Number(c.total_jobs || c.jobs_count || 0),
      }));
      setCategories(formatted);
    } catch (err: any) {
      console.warn('[AdminCategoriesView] Error loading categories from endpoint:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setSelectedCat(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: AdminCategoryItem) => {
    setSelectedCat(cat);
    setModalOpen(true);
  };

  const handleSaveCategory = async (savedCat: AdminCategoryItem) => {
    try {
      if (savedCat.id) {
        await masterDataService.updateCategory(savedCat.id, {
          name: savedCat.name,
          commission_rate: savedCat.commissionRate,
          is_active: savedCat.active,
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === savedCat.id ? { ...c, ...savedCat } : c))
        );
      } else {
        const created = await masterDataService.createCategory({
          name: savedCat.name,
          commission_rate: savedCat.commissionRate,
          is_active: savedCat.active,
        });
        const newCat: AdminCategoryItem = {
          id: Number(created.id || Date.now()),
          name: created.name || savedCat.name,
          commissionRate: savedCat.commissionRate,
          active: savedCat.active,
          totalJobs: 0,
        };
        setCategories((prev) => [newCat, ...prev]);
      }
    } catch (err: any) {
      console.error('[AdminCategoriesView] Save category error:', err);
      Alert.alert('Error', err?.message || 'Failed to save category.');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await masterDataService.deleteCategory(deleteId);
      setCategories((prev) => prev.filter((c) => c.id !== deleteId));
      if (Platform.OS === 'android') {
        ToastAndroid.show('Category deleted successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Deleted', 'Category deleted successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete category.');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Service Categories"
        subtitle={`Active Platform Categories (${filteredCategories.length})`}
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      {/* Action Bar & Search */}
      <View style={styles.topBar}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Pressable style={styles.addBtn} onPress={handleOpenAdd}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* Category List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCategories();
            }}
            tintColor="#0B5A3E"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={{ gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            title="No categories found"
            subtitle="No categories match your search query."
            iconName="construct-outline"
          />
        ) : (
          filteredCategories.map((c) => (
            <View key={c.id} style={styles.categoryCard}>
              <View style={styles.catIconBox}>
                <Ionicons name="construct" size={22} color="#0B5A3E" />
              </View>

              <View style={styles.catTextCol}>
                <Text style={styles.catName}>{c.name}</Text>
                <Text style={styles.catSub}>
                  Fee: {c.commissionRate}% • Jobs: {c.totalJobs || 0}
                </Text>
              </View>

              <View style={styles.rightCol}>
                <View style={[styles.statusTag, c.active ? styles.tagActive : styles.tagInactive]}>
                  <Text style={[styles.tagText, c.active ? styles.tagTextActive : styles.tagTextInactive]}>
                    {c.active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>

                <Pressable style={styles.editBtn} onPress={() => handleOpenEdit(c)}>
                  <Ionicons name="create-outline" size={18} color="#0B5A3E" />
                </Pressable>

                <Pressable style={styles.deleteBtn} onPress={() => c.id && setDeleteId(c.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <CategoryModal
        category={selectedCat}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCategory}
      />

      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteId(null)}
      />

      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="dashboard"
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
    gap: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  catIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catTextCol: {
    flex: 1,
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  catSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagActive: {
    backgroundColor: '#ECFDF5',
  },
  tagInactive: {
    backgroundColor: '#FEE2E2',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tagTextActive: {
    color: '#0B5A3E',
  },
  tagTextInactive: {
    color: '#EF4444',
  },
  editBtn: {
    padding: 6,
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
});
