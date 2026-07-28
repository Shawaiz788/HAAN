import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { styles } from '@/styles/jobDetailBottomSheet.styles';

interface ImagePreviewOverlayProps {
    previewImage: string | null;
    onClose: () => void;
}

export const ImagePreviewOverlay: React.FC<ImagePreviewOverlayProps> = ({ previewImage, onClose }) => {
    if (!previewImage) return null;

    return (
        <View style={styles.modalBackdrop}>
            <TouchableOpacity
                style={styles.modalCloseArea}
                activeOpacity={1}
                onPress={onClose}
            />
            <View style={styles.modalImageContainer} pointerEvents="none">
                <Image
                    source={{ uri: previewImage }}
                    style={styles.modalFullImage}
                    resizeMode="contain"
                />
            </View>
            <TouchableOpacity
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
                onPress={onClose}
            >
                <Ionicons name="close" size={26} color={Colors.white} />
            </TouchableOpacity>
        </View>
    );
};
