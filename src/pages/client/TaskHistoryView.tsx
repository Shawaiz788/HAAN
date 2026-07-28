import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostJob } from '@/context/post-job';

export default function TaskHistoryView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { taskHistory, clearHistory } = usePostJob();

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear your task history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearHistory();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#082C18" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Task History</Text>
        </View>
      </View>

      {/* History Scroll List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {taskHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyHistoryText}>No tasks created yet.</Text>
          </View>
        ) : (
          taskHistory.map((task) => (
            <View key={task.id} style={styles.historyItemCard}>
              <View style={styles.historyItemHeader}>
                <Text style={styles.historyItemCategory}>{task.category}</Text>
                <View
                  style={[
                    styles.historyStatusBadge,
                    {
                      backgroundColor:
                        task.status === 'completed' ? '#D1FAE5' : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.historyStatusText,
                      {
                        color: task.status === 'completed' ? '#065F46' : '#991B1B',
                      },
                    ]}
                  >
                    {task.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyItemDesc}>{task.description}</Text>
              <View style={styles.historyItemMeta}>
                <Text style={styles.historyItemCost}>Rs. {task.budget}</Text>
                <Text style={styles.historyItemTime}>{task.createdAt}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer Action to Clear History */}
      {taskHistory.length > 0 && (
        <Pressable
          style={[styles.clearHistoryBtn, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 16 }]}
          onPress={handleClearHistory}
        >
          <Text style={styles.clearHistoryBtnText}>Clear History</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#082C18',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '600',
  },
  historyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  historyItemCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    flexShrink: 1,
    marginRight: 4,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyItemDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 14,
  },
  historyItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  historyItemCost: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  historyItemTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  clearHistoryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FEF2F2',
  },
  clearHistoryBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 15,
  },
});
