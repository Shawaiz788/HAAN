import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { LiveJob } from '@/hooks/useProWebSocket';
import { styles } from '@/styles/jobDetailBottomSheet.styles';
import { SkeletonBox } from './SkeletonBox';

interface JobDetailDescriptionSectionProps {
    job: LiveJob | null;
    attachmentList: string[];
    isAttachmentsLoading: boolean;
    onPreviewImage: (uri: string) => void;
}

export const JobDetailDescriptionSection: React.FC<JobDetailDescriptionSectionProps> = ({
    job,
    attachmentList,
    isAttachmentsLoading,
    onPreviewImage,
}) => {
    const descriptionText = job?.description || (job as any)?.body || 'No description provided.';

    return (
        <View style={styles.expandedDetails}>
            {/* Description Section */}
            <View style={styles.descriptionSection}>
                <Text style={styles.subSectionLabel}>DESCRIPTION</Text>
                <Text style={styles.descriptionText}>{descriptionText}</Text>
            </View>

            {/* Attachments Section */}
            <View style={styles.attachmentsSection}>
                <View style={styles.attachmentsHeaderRow}>
                    <Text style={styles.subSectionLabel}>ATTACHMENTS ({attachmentList.length})</Text>
                    {attachmentList.length > 0 && (
                        <Text style={styles.tapToViewHint}>Tap image to view</Text>
                    )}
                </View>

                {isAttachmentsLoading && attachmentList.length === 0 ? (
                    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
                        <SkeletonBox width={80} height={80} borderRadius={8} />
                        <SkeletonBox width={80} height={80} borderRadius={8} />
                    </View>
                ) : attachmentList.length > 0 ? (
                    <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.attachmentsRow}
                        keyboardShouldPersistTaps="handled"
                    >
                        {attachmentList.map((uri, idx) => (
                            <TouchableOpacity
                                key={`att_${idx}`}
                                style={styles.attachmentCard}
                                activeOpacity={0.7}
                                onPress={() => onPreviewImage(uri)}
                            >
                                <Image
                                    source={{ uri }}
                                    style={styles.attachmentImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.zoomIconOverlay} pointerEvents="none">
                                    <Ionicons name="expand-outline" size={12} color={Colors.white} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.noAttachmentBox}>
                        <Ionicons name="images-outline" size={18} color={Colors.neutral[400]} />
                        <Text style={styles.noAttachmentText}>No attachments provided</Text>
                    </View>
                )}
            </View>

            <View style={styles.sheetDivider} />
        </View>
    );
};
