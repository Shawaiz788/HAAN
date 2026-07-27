import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    Alert,
    ToastAndroid,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { LiveJob } from '@/hooks/useProWebSocket';
import { getCategoryStyle } from '@/store/categoryStore';
import { ActiveBidState } from '@/hooks/useActiveBids';
import UserReviewsModal from '@/components/UserReviewsModal';
import { getPaymentPreferenceName, getPaymentPrefStyleById } from '@/utils/paymentCache';

const { width } = Dimensions.get('window');

interface JobCardProps {
    job: LiveJob;
    onPress: (job: LiveJob) => void;
    onQuickBid: (job: LiveJob, amount: number) => void;
    activeBid?: ActiveBidState | null;
    hasActiveTask?: boolean;
}

function SkeletonBox({
    width,
    height,
    borderRadius = 4,
    style,
}: {
    width: number | `${number}%`;
    height: number;
    borderRadius?: number;
    style?: any;
}) {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 650,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 650,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [pulseAnim]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: Colors.neutral[200] || '#E5E7EB',
                    opacity: pulseAnim,
                },
                style,
            ]}
        />
    );
}

function showToast(message: string) {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
        Alert.alert('Bid Placed', message);
    }
}

export default function JobCard({ job, onPress, onQuickBid, activeBid, hasActiveTask }: JobCardProps) {
    const progressAnim = useRef(new Animated.Value(1)).current;
    const [customerReviewsVisible, setCustomerReviewsVisible] = useState(false);
    const [countdown, setCountdown] = useState(10);

    const base = job.budget;
    const plus5 = Math.round(base * 1.05);
    const plus10 = Math.round(base * 1.1);

    const isWaiting = Boolean(activeBid);

    useEffect(() => {
        if (!activeBid) {
            progressAnim.setValue(1);
            return;
        }

        const elapsed = Date.now() - activeBid.startTimeMs;
        const remainingMs = Math.max(0, activeBid.durationMs - elapsed);

        if (remainingMs <= 0) return;

        const initialRatio = remainingMs / activeBid.durationMs;
        progressAnim.setValue(initialRatio);
        setCountdown(Math.ceil(remainingMs / 1000));

        Animated.timing(progressAnim, {
            toValue: 0,
            duration: remainingMs,
            useNativeDriver: false,
        }).start();

        const interval = setInterval(() => {
            const currentElapsed = Date.now() - activeBid.startTimeMs;
            const rem = Math.max(0, activeBid.durationMs - currentElapsed);
            const sec = Math.ceil(rem / 1000);
            setCountdown(sec);
            if (rem <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [activeBid]);

    const handleQuickBid = (amount: number) => {
        if (hasActiveTask) {
            Alert.alert(
                'Active Job in Progress',
                'You already have an active job in progress! Please complete your current job before bidding on another task.',
                [{ text: 'OK' }]
            );
            return;
        }
        if (isWaiting) return;
        onQuickBid(job, amount);
        showToast(`You have successfully placed a bid of Rs.${amount.toLocaleString()}.`);
    };

    // Resolve category icon + colour from the LiveJob fields (set by store) or fall back to name-based mapping
    const catStyle = getCategoryStyle(job.category);
    const categoryIcon = {
        name: job.category_icon ?? catStyle.icon,
        color: job.category_color ?? catStyle.color,
    };

    return (
        <Pressable style={styles.card} onPress={() => onPress(job)}>
            {/* Top Row: Job title + date + distance */}
            <View style={styles.topRow}>
                <View style={[styles.catIconBox, { backgroundColor: `${categoryIcon.color}18` }]}>
                    <Ionicons name={categoryIcon.name as any} size={18} color={categoryIcon.color} />
                </View>
                <View style={styles.titleSection}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginVertical: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: categoryIcon.color }}>
                            {job.category}
                        </Text>
                        {Boolean(job.subcategory) && (
                            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.neutral[300] }}>
                                • {job.subcategory}
                            </Text>
                        )}
                    </View>
                    <View style={styles.metaRow}>
                        {job.scheduled_date && (
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateBadgeText}>Today</Text>
                            </View>
                        )}
                        {job.distance_km !== undefined && (
                            <Text style={styles.distanceText}>
                                <Ionicons name="navigate-outline" size={11} color={Colors.neutral[400]} />{' '}
                                {job.distance_km.toFixed(1)} km
                            </Text>
                        )}
                        {(() => {
                            const payStyle = getPaymentPrefStyleById(job.payment_preference_id);
                            return (
                                <Text style={[styles.distanceText, { color: payStyle.logoColor, fontWeight: '600' }]}>
                                    <Ionicons name={payStyle.icon as any} size={11} color={payStyle.logoColor} />{' '}
                                    {payStyle.name}
                                </Text>
                            );
                        })()}
                    </View>
                </View>
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Colors.neutral[400]} />
                <View style={{ flex: 1 }}>
                    {job.is_location_loading || job.location_name === 'Loading location...' ? (
                        <SkeletonBox width={140} height={14} borderRadius={4} style={{ marginVertical: 2 }} />
                    ) : (
                        <Text style={styles.locationName} numberOfLines={1}>{job.location_name}</Text>
                    )}
                    {job.location_area && (
                        <Text style={styles.locationArea} numberOfLines={1}>{job.location_area}</Text>
                    )}
                </View>
            </View>

            {/* Budget + Customer */}
            <View style={styles.budgetRow}>
                <View>
                    <Text style={styles.budgetLabel}>Budget</Text>
                    <Text style={styles.budgetValue}>Rs. {base.toLocaleString()}</Text>
                </View>
                <View style={styles.customerBox}>
                    <Text style={styles.customerLabel}>Customer (Tap for reviews)</Text>
                    {job.is_customer_loading || job.customer_name === 'Loading customer...' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <SkeletonBox width={65} height={13} borderRadius={4} />
                            <SkeletonBox width={28} height={13} borderRadius={4} />
                        </View>
                    ) : (
                        <Pressable 
                            style={styles.customerRow}
                            onPress={() => {
                                if (job.customer_id) {
                                    setCustomerReviewsVisible(true);
                                }
                            }}
                        >
                            <Text style={styles.customerName}>{job.customer_name}</Text>
                            {job.customer_rating !== undefined && job.customer_rating !== null && (
                                <View style={styles.cardRatingRow}>
                                    <Ionicons name="star" size={11} color="#D97706" style={{ marginRight: 2 }} />
                                    <Text style={[styles.customerRating, { color: '#D97706' }]}>
                                        {Number(job.customer_rating).toFixed(1)}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Waiting Status */}
            {isWaiting && (
                <View style={styles.waitingBar}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                    <View style={styles.waitingContent}>
                        <Ionicons name="time-outline" size={14} color="#064E3B" style={{ marginRight: 6 }} />
                        <Text style={styles.waitingText}>
                            Waiting for user to accept/decline... ({countdown}s)
                        </Text>
                    </View>
                </View>
            )}

            {/* Quick Bid Buttons */}
            <View style={styles.bidRow}>
                <Pressable
                    style={[styles.bidBtn, isWaiting && styles.bidBtnDisabled]}
                    onPress={() => handleQuickBid(base)}
                    disabled={isWaiting}
                >
                    <Text style={[styles.bidBtnText, isWaiting && styles.bidBtnTextDisabled]}>
                        Rs.{base.toLocaleString()}
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.bidBtn, isWaiting && styles.bidBtnDisabled]}
                    onPress={() => handleQuickBid(plus5)}
                    disabled={isWaiting}
                >
                    <Text style={[styles.bidBtnText, isWaiting && styles.bidBtnTextDisabled]}>
                        Rs.{plus5.toLocaleString()}
                    </Text>
                    <Text style={[styles.bidBtnSub, isWaiting && styles.bidBtnTextDisabled]}>+5%</Text>
                </Pressable>
                <Pressable
                    style={[styles.bidBtn, isWaiting && styles.bidBtnDisabled]}
                    onPress={() => handleQuickBid(plus10)}
                    disabled={isWaiting}
                >
                    <Text style={[styles.bidBtnText, isWaiting && styles.bidBtnTextDisabled]}>
                        Rs.{plus10.toLocaleString()}
                    </Text>
                    <Text style={[styles.bidBtnSub, isWaiting && styles.bidBtnTextDisabled]}>+10%</Text>
                </Pressable>
            </View>

            {/* Customer Reviews Modal */}
            <UserReviewsModal
                isVisible={customerReviewsVisible}
                onClose={() => setCustomerReviewsVisible(false)}
                userId={job.customer_id}
                userName={job.customer_name || 'Customer'}
                role="customer"
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
        gap: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    catIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleSection: {
        flex: 1,
        gap: 4,
    },
    jobTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.neutral[800],
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateBadge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    dateBadgeText: {
        fontSize: 11,
        color: '#1D4ED8',
        fontWeight: '600',
    },
    distanceText: {
        fontSize: 11,
        color: Colors.neutral[400],
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        backgroundColor: Colors.neutral[50],
        borderRadius: 10,
        padding: 10,
    },
    locationName: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.neutral[700],
    },
    locationArea: {
        fontSize: 11,
        color: Colors.neutral[400],
        marginTop: 1,
    },
    budgetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    budgetLabel: {
        fontSize: 11,
        color: Colors.neutral[400],
        marginBottom: 2,
    },
    budgetValue: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.brand.medium,
    },
    customerBox: {
        alignItems: 'flex-end',
    },
    customerLabel: {
        fontSize: 11,
        color: Colors.neutral[400],
        marginBottom: 2,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    customerName: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.neutral[700],
    },
    customerRating: {
        fontSize: 12,
        color: '#EAB308',
        fontWeight: '600',
    },
    cardRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        gap: 2,
    },
    waitingBar: {
        height: 38,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#34D399',
    },
    waitingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        zIndex: 2,
    },
    waitingText: {
        fontSize: 12,
        color: '#064E3B',
        fontWeight: '700',
    },
    bidRow: {
        flexDirection: 'row',
        gap: 8,
    },
    bidBtn: {
        flex: 1,
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#BBF7D0',
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: 'center',
        gap: 1,
    },
    bidBtnDisabled: {
        backgroundColor: Colors.neutral[100],
        borderColor: Colors.neutral[200],
    },
    bidBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.brand.medium,
    },
    bidBtnSub: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.brand.medium,
    },
    bidBtnTextDisabled: {
        color: Colors.neutral[400],
    },
});
