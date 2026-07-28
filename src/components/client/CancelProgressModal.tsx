import React from 'react';
import { Modal, View, ActivityIndicator, Text } from 'react-native';
import { styles } from '@/styles/activeTaskScreen.styles';

interface CancelProgressModalProps {
    visible: boolean;
    stepText: string;
}

export const CancelProgressModal: React.FC<CancelProgressModalProps> = ({ visible, stepText }) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.cancelOverlay}>
                <View style={styles.cancelCard}>
                    <ActivityIndicator size="large" color="#EF4444" style={{ marginBottom: 16 }} />
                    <Text style={styles.cancelTitle}>Cancelling Task...</Text>
                    <Text style={styles.cancelStepText}>{stepText}</Text>
                </View>
            </View>
        </Modal>
    );
};
