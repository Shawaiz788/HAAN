import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { LiveJob } from '@/hooks/useProWebSocket';
import { getCategoryStyle } from '@/store/categoryStore';
import { getPaymentPrefStyleById } from '@/store/paymentStore';
import { styles } from '@/styles/jobDetailBottomSheet.styles';
import { SkeletonBox } from './SkeletonBox';

interface JobDetailHeaderSectionProps {
    job: LiveJob | null;
    baseBudget: number;
    onOpenCustomerReviews: () => void;
}

export const JobDetailHeaderSection: React.FC<JobDetailHeaderSectionProps> = ({
    job,
    baseBudget,
    onOpenCustomerReviews,
}) => {
    const catStyle = getCategoryStyle(job?.category ?? '');
    const categoryIcon = {
        name: job?.category_icon ?? catStyle.icon,
        color: job?.category_color ?? catStyle.color,
    };
    const payStyle = getPaymentPrefStyleById(job?.payment_preference_id);

    return (
        <View style={styles.topContainer}>
            {/* Job Header */}
            <View style={styles.jobHeader}>
                <View style={[styles.catIconLarge, { backgroundColor: `${categoryIcon.color}18` }]}>
                    <Ionicons name={categoryIcon.name as any} size={26} color={categoryIcon.color} />
                </View>
                <View style={styles.jobHeaderText}>
                    <Text style={styles.jobDetailTitle} numberOfLines={2}>
                        {job?.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: categoryIcon.color }}>
                            {job?.category}
                        </Text>
                        {Boolean(job?.subcategory) && (
                            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.neutral[600] }}>
                                • {job?.subcategory}
                            </Text>
                        )}
                    </View>
                    <View style={styles.jobMetaRow}>
                        <View style={styles.dateBadge}>
                            <Text style={styles.dateBadgeText}>Today</Text>
                        </View>
                        <Text style={styles.budgetPill}>
                            Rs. {baseBudget.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Location Detail */}
            <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={Colors.neutral[400]} />
                <View style={{ flex: 1 }}>
                    {job?.is_location_loading || job?.location_name === 'Loading location...' ? (
                        <SkeletonBox width={160} height={16} borderRadius={4} style={{ marginVertical: 2 }} />
                    ) : (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.detailPrimary}>{job?.location_name}</Text>
                            {job?.distance_km !== undefined && job?.distance_km !== null && (
                                <View style={styles.distanceBadge}>
                                    <Ionicons name="navigate-outline" size={12} color="#16A34A" style={{ marginRight: 2 }} />
                                    <Text style={styles.distanceText}>{job.distance_km.toFixed(1)} km away</Text>
                                </View>
                            )}
                        </View>
                    )}
                    {Boolean(job?.location_area) && (
                        <Text style={styles.detailSecondary}>{job?.location_area}</Text>
                    )}
                </View>
            </View>

            {/* Payment Method */}
            <View style={styles.detailRow}>
                <Ionicons name={payStyle.icon as any} size={16} color={payStyle.logoColor} />
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.detailPrimary}>Payment Method</Text>
                    <Text style={[styles.detailPrimary, { fontWeight: '700', color: payStyle.logoColor }]}>
                        {payStyle.name}
                    </Text>
                </View>
            </View>

            {/* Customer Section */}
            <View style={styles.customerSection}>
                <Text style={styles.subSectionLabel}>CUSTOMER</Text>
                <View style={styles.customerCard}>
                    {job?.is_customer_loading || job?.customer_name === 'Loading customer...' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <SkeletonBox width={42} height={42} borderRadius={21} />
                            <View style={{ gap: 6, flex: 1 }}>
                                <SkeletonBox width={130} height={16} borderRadius={4} />
                                <SkeletonBox width={70} height={14} borderRadius={4} />
                            </View>
                        </View>
                    ) : (
                        <Pressable
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
                            onPress={() => {
                                if (job?.customer_id) {
                                    onOpenCustomerReviews();
                                }
                            }}
                        >
                            <View style={styles.custAvatar}>
                                {job?.customer_image ? (
                                    <Image source={{ uri: job.customer_image }} style={styles.custAvatarImage} />
                                ) : (
                                    <Text style={styles.custAvatarText}>
                                        {(job?.customer_name || 'C')[0].toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.custInfo}>
                                <Text style={styles.custName}>{job?.customer_name}</Text>
                                {job?.customer_rating !== undefined && job?.customer_rating !== null ? (
                                    <Text style={styles.custRating}>
                                        ★ {Number(job.customer_rating).toFixed(1)} rating (Tap to view reviews)
                                    </Text>
                                ) : (
                                    <Text style={styles.custRating}>New customer (Tap to view profile)</Text>
                                )}
                            </View>
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
};
