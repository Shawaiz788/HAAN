import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ToastAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminDrawerPanel from '@/components/admin/AdminDrawerPanel';
import SearchBar from '@/components/admin/common/SearchBar';
import EmptyState from '@/components/admin/common/EmptyState';
import ConfirmDialog from '@/components/admin/common/ConfirmDialog';
import { SkeletonCard } from '@/components/admin/common/SkeletonLoader';
import { masterDataService } from '@/services/masterData';
import {
  useMasterDataList,
  useCreateMasterDataItem,
  useUpdateMasterDataItem,
  useDeleteMasterDataItem,
  MasterDataEndpoint,
} from '@/hooks/admin/useAdminMasterData';
import { styles } from '@/styles/adminMasterDataView.styles';

type MasterDomain =
  | 'countries'
  | 'cities'
  | 'areas'
  | 'locations'
  | 'usertypes'
  | 'paymentprefs'
  | 'statuses'
  | 'configs';

interface DomainOption {
  id: MasterDomain;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DOMAIN_OPTIONS: DomainOption[] = [
  { id: 'countries', label: 'Countries', icon: 'globe' },
  { id: 'cities', label: 'Cities', icon: 'business' },
  { id: 'areas', label: 'Areas', icon: 'map' },
  { id: 'locations', label: 'Locations', icon: 'location' },
  { id: 'usertypes', label: 'User Types', icon: 'people-circle' },
  { id: 'paymentprefs', label: 'Payment Prefs', icon: 'card' },
  { id: 'statuses', label: 'Statuses', icon: 'flag' },
  { id: 'configs', label: 'Configuration', icon: 'options' },
];

const DOMAIN_TO_ENDPOINT: Record<MasterDomain, MasterDataEndpoint> = {
  countries: 'country',
  cities: 'city',
  areas: 'area',
  locations: 'location',
  usertypes: 'usertype',
  paymentprefs: 'paymentpref',
  statuses: 'status',
  configs: 'config',
};

export default function AdminMasterDataView() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDomain, setActiveDomain] = useState<MasterDomain>('countries');
  const [searchQuery, setSearchQuery] = useState('');

  const endpoint = DOMAIN_TO_ENDPOINT[activeDomain];
  const { data: items = [], isLoading: loading, isRefetching: refreshing, refetch } = useMasterDataList(endpoint);
  const createItemMutation = useCreateMasterDataItem(endpoint);
  const updateItemMutation = useUpdateMasterDataItem(endpoint);
  const deleteItemMutation = useDeleteMasterDataItem(endpoint);

  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  useEffect(() => {
    masterDataService
      .getCities()
      .then((data) => setCitiesList(data || []))
      .catch(() => { });
  }, []);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleOpenAddModal = () => {
    setEditItem(null);
    setNameInput('');
    setSelectedCityId(citiesList[0]?.id || null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditItem(item);
    setNameInput(item.name || item.key || '');
    const cId =
      item.city_id !== undefined && item.city_id !== null
        ? item.city_id
        : typeof item.city === 'object' && item.city !== null
          ? item.city.id
          : typeof item.city === 'number'
            ? item.city
            : citiesList[0]?.id || null;
    setSelectedCityId(cId);
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Validation Error', 'Name / Key field cannot be empty.');
      return;
    }
    try {
      setSaving(true);
      let payload: any = { name: nameInput.trim() };
      if (activeDomain === 'areas') {
        if (!selectedCityId) {
          Alert.alert('Validation Error', 'Please select a parent city for this area.');
          setSaving(false);
          return;
        }
        payload = {
          name: nameInput.trim(),
          city_id: selectedCityId,
        };
      }

      if (editItem) {
        await updateItemMutation.mutateAsync({ id: editItem.id, payload });
      } else {
        await createItemMutation.mutateAsync(payload);
      }

      setModalVisible(false);
      refetch();
      if (Platform.OS === 'android') {
        ToastAndroid.show('Saved successfully', ToastAndroid.SHORT);
      }
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteId) return;
    try {
      await deleteItemMutation.mutateAsync(deleteId);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Deleted successfully', ToastAndroid.SHORT);
      }
    } catch (e: any) {
      Alert.alert('Delete Failed', e?.message || 'Could not delete item.');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredItems = items.filter((i) => {
    const text = (i.name || i.key || '').toLowerCase();
    return text.includes(searchQuery.toLowerCase()) || String(i.id).includes(searchQuery);
  });

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Master Data & Locations"
        subtitle="Manage Core System Tables & Lookups"
        onOpenDrawer={() => setDrawerOpen(true)}
        user={user}
      />

      {/* Domain Selection Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DOMAIN_OPTIONS.map((d) => {
            const active = activeDomain === d.id;
            return (
              <Pressable
                key={d.id}
                style={[styles.tabChip, active && styles.tabChipActive]}
                onPress={() => {
                  if (activeDomain !== d.id) {
                    setSearchQuery('');
                    setActiveDomain(d.id);
                  }
                }}
              >
                <Ionicons name={d.icon} size={14} color={active ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search & Add Action */}
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${activeDomain}...`}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={handleOpenAddModal}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch()}
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
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={`No ${activeDomain} found`}
            subtitle="Tap the '+' button above to create a new entry."
            iconName="folder-open-outline"
          />
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemName}>{item.name || item.key || `ID #${item.id}`}</Text>
                <Text style={styles.itemMeta}>
                  ID: {item.id}
                  {activeDomain === 'areas' && (
                    <>
                      {' • '}
                      <Text style={{ fontWeight: '600', color: item.city || item.city_id ? '#0B5A3E' : '#EF4444' }}>
                        {(() => {
                          const cId =
                            item.city_id !== undefined && item.city_id !== null
                              ? item.city_id
                              : typeof item.city === 'object' && item.city !== null
                                ? item.city.id
                                : item.city;
                          const cObj = citiesList.find((c) => c.id === cId) || (typeof item.city === 'object' ? item.city : null);
                          return cObj ? `City: ${cObj.name}` : 'Unassigned City';
                        })()}
                      </Text>
                    </>
                  )}
                </Text>
              </View>

              <View style={styles.actionGroup}>
                <Pressable onPress={() => handleOpenEditModal(item)} style={styles.editBtn}>
                  <Ionicons name="pencil" size={16} color="#2563EB" />
                </Pressable>
                <Pressable onPress={() => setDeleteId(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal for Add / Edit */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editItem ? 'Edit Entry' : 'Create Entry'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name or Title"
              placeholderTextColor="#9CA3AF"
              value={nameInput}
              onChangeText={setNameInput}
            />

            {/* City Selector when creating/editing an Area */}
            {activeDomain === 'areas' && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>
                  Assign to City:
                </Text>
                {citiesList.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>No cities found. Create a city first.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                    {citiesList.map((c) => {
                      const active = selectedCityId === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.cityChip,
                            active && styles.cityChipActive,
                          ]}
                          onPress={() => setSelectedCityId(c.id)}
                        >
                          <Ionicons name="business-outline" size={14} color={active ? '#FFFFFF' : '#4B5563'} />
                          <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>
                            {c.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSaveItem} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Delete Entry"
        message="Are you sure you want to delete this master data record?"
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteItemMutation.isPending}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteId(null)}
      />

      <AdminDrawerPanel
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="masterdata"
      />
    </View>
  );
}

