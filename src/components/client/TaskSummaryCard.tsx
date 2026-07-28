import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/context/post-job';
import { styles } from '@/styles/activeTaskScreen.styles';

interface TaskSummaryCardProps {
  task: Task;
}

export function TaskSummaryCard({ task }: TaskSummaryCardProps) {
  return (
    <View style={styles.taskSummaryCard}>
      <View style={styles.summaryHeader}>
        <View
          style={[
            styles.statusIndicator,
            task.status === 'accepted' ? styles.statusActive : styles.statusSearching,
          ]}
        />
        <Text style={styles.summaryCategory}>{task.category}</Text>
      </View>
      <Text style={styles.summaryDetails} numberOfLines={2}>
        {task.description}
      </Text>
      <View style={styles.summaryMetaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="wallet-outline" size={14} color="#6B7280" />
          <Text style={styles.metaText}>Budget: Rs. {task.budget}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.metaText} numberOfLines={1}>
            Address: {task.locationName}
          </Text>
        </View>
      </View>
    </View>
  );
}
