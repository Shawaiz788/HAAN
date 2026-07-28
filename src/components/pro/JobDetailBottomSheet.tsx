import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
    ScrollView,
    TextInput,
    Alert,
    ToastAndroid,
    Platform,
    Keyboard,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { LiveJob } from '@/hooks/useProWebSocket';
import { useBiddingWebSocket } from '@/hooks/useBiddingWebSocket';
import { useAuth } from '@/context/auth';
import { getCategoryStyle } from '@/store/categoryStore';
import { getTaskAttachments } from '@/services/task';
import UserReviewsModal from '@/components/UserReviewsModal';
import { getPaymentPrefStyleById } from '@/store/paymentStore';
import { styles } from '@/styles/jobDetailBottomSheet.styles';
import { getNormalizedAttachments } from '@/utils/attachmentUtils';
import { ImagePreviewOverlay } from '@/components/pro/ImagePreviewOverlay';
import { ActiveBidState } from '@/hooks/useActiveBids';
import { logger } from '@/utils/logger';

const { height: WINDOW_H } = Dimensions.get('window');
const { height: SCREEN_H_SCREEN } = Dimensions.get('screen');
const SCREEN_H = Math.max(WINDOW_H, SCREEN_H_SCREEN);
const HALF_H = SCREEN_H * 0.58;
const CLOSED_Y = SCREEN_H;

type BidOption = 'plus5' | 'plus10' | 'plus15' | 'custom' | null;

interface JobDetailBottomSheetProps {
    job: LiveJob | null;
    isVisible: boolean;
    onClose: () => void;
    onBidAccepted?: (job: LiveJob, amount: number) => void;
    activeBid?: ActiveBidState | null;
    onPlaceBid?: (job: LiveJob, amount: number) => void;
    hasActiveTask?: boolean;
}

const SkeletonBox = ({ width, height, borderRadius = 4, style }: any) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    return (
        <Animated.View
            style={[
                { width, height, borderRadius, backgroundColor: '#E2E8F0', opacity: anim },
                style,
            ]}
        />
    );
};

export default function JobDetailBottomSheet({
    job,
    isVisible,
    onClose,
    onBidAccepted,
    activeBid: passedActiveBid,
    onPlaceBid,
    hasActiveTask = false,
}: JobDetailBottomSheetProps) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [selectedBid, setSelectedBid] = useState<BidOption>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [sheetState, setSheetState] = useState<'closed' | 'half' | 'expanded'>('closed');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const [isWaiting, setIsWaiting] = useState(false);
    const [bidAmountPlaced, setBidAmountPlaced] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [customerReviewsVisible, setCustomerReviewsVisible] = useState(false);
    const [localAttachments, setLocalAttachments] = useState<any[]>(job?.attachments || []);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const translateY = useRef(new Animated.Value(CLOSED_Y)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const activeBidForThisJob = (passedActiveBid && job && passedActiveBid.jobId === job.id) ? passedActiveBid : null;

    useEffect(() => {
        if (job) {
            setLocalAttachments(job.attachments || []);
            if (job.id) {
                getTaskAttachments(job.id)
                    .then((fetched) => {
                        if (Array.isArray(fetched) && fetched.length > 0) {
                            setLocalAttachments(fetched);
                        }
                    })
                    .catch((err) => {
                        logger.warn('[JobDetailBottomSheet] Failed to load attachments:', err);
                    });
            }
        }
    }, [job]);

    useEffect(() => {
        if (activeBidForThisJob) {
            setIsWaiting(true);
            setBidAmountPlaced(activeBidForThisJob.amount);
            const elapsedSec = Math.floor((Date.now() - activeBidForThisJob.startTimeMs) / 1000);
            const totalSec = Math.floor(activeBidForThisJob.durationMs / 1000);
            const remaining = Math.max(0, totalSec - elapsedSec);
            setCountdown(remaining);
            progressAnim.setValue(totalSec > 0 ? elapsedSec / totalSec : 0);
        } else {
            setIsWaiting(false);
            setBidAmountPlaced(null);
            setCountdown(60);
            progressAnim.setValue(0);
        }
    }, [activeBidForThisJob]);

    const handleWSBidAccepted = useCallback(
        (acceptedBid: any) => {
            if (job) {
                const finalAmount = acceptedBid.price || bidAmountPlaced || job.budget;
                if (Platform.OS === 'android') {
                    ToastAndroid.show(`🎉 Your bid of Rs.${finalAmount} was accepted!`, ToastAndroid.LONG);
                } else {
                    Alert.alert('Bid Accepted! 🎉', `Your bid of Rs.${finalAmount} was accepted!`);
                }
                onBidAccepted?.(job, finalAmount);
                onClose();
            }
        },
        [job, bidAmountPlaced, onBidAccepted, onClose]
    );

    const { placeBid: wsPlaceBid } = useBiddingWebSocket({
        taskId: job?.id,
        userId: user?.id,
        isCustomer: false,
        enabled: isVisible && Boolean(job?.id),
        onBidAccepted: handleWSBidAccepted,
    });

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const animateTo = useCallback(
        (targetY: number, toState: 'closed' | 'half' | 'expanded') => {
            Animated.spring(translateY, {
                toValue: targetY,
                useNativeDriver: false,
                bounciness: 4,
                speed: 14,
            }).start(() => {
                setSheetState(toState);
                if (toState === 'closed') {
                    onClose();
                }
            });
        },
        [translateY, onClose]
    );

    useEffect(() => {
        if (isVisible) {
            setSelectedBid(null);
            setCustomAmount('');
            animateTo(SCREEN_H - HALF_H, 'half');
        } else {
            animateTo(CLOSED_Y, 'closed');
        }
    }, [isVisible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                const currentBase = sheetState === 'expanded' ? 0 : SCREEN_H - HALF_H;
                const newY = currentBase + gestureState.dy;
                if (newY >= 0) {
                    translateY.setValue(newY);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const { dy, vy } = gestureState;
                if (sheetState === 'half') {
                    if (dy < -80 || vy < -0.5) {
                        animateTo(0, 'expanded');
                    } else if (dy > 80 || vy > 0.5) {
                        animateTo(CLOSED_Y, 'closed');
                    } else {
                        animateTo(SCREEN_H - HALF_H, 'half');
                    }
                } else if (sheetState === 'expanded') {
                    if (dy > 100 || vy > 0.5) {
                        animateTo(SCREEN_H - HALF_H, 'half');
                    } else {
                        animateTo(0, 'expanded');
                    }
                }
            },
        })
    ).current;

    const base = job?.budget ?? 0;
    const plus5 = Math.round(base * 1.05);
    const plus10 = Math.round(base * 1.10);
    const plus15 = Math.round(base * 1.15);

    let computedBidAmount = base;
    if (selectedBid === 'plus5') computedBidAmount = plus5;
    if (selectedBid === 'plus10') computedBidAmount = plus10;
    if (selectedBid === 'plus15') computedBidAmount = plus15;
    if (selectedBid === 'custom') {
        const parsed = parseInt(customAmount, 10);
        computedBidAmount = isNaN(parsed) ? base : parsed;
    }

    const displayAmount = isWaiting && bidAmountPlaced ? bidAmountPlaced : computedBidAmount;

    const handlePlaceBid = () => {
        if (!job) return;
        if (hasActiveTask) {
            Alert.alert(
                'Active Job in Progress',
                'You already have an accepted job in progress. Complete your active job before bidding on new tasks.',
                [{ text: 'OK' }]
            );
            return;
        }

        wsPlaceBid(computedBidAmount, 1);
        if (onPlaceBid) {
            onPlaceBid(job, computedBidAmount);
        }
    };

    if (!isVisible && sheetState === 'closed') return null;

    const categoryIcon = getCategoryStyle(job?.category ?? '');

    const scrimOpacity = translateY.interpolate({
        inputRange: [0, SCREEN_H - HALF_H, CLOSED_Y],
        outputRange: [1, 0.8, 0],
        extrapolate: 'clamp',
    });

    const isExpanded = sheetState === 'expanded';

    const animatedBorderRadius = translateY.interpolate({
        inputRange: [0, 50],
        outputRange: [0, 24],
        extrapolate: 'clamp',
    });

    const sheetStyle = [
        styles.sheet,
        {
            transform: [{ translateY }],
            bottom: keyboardHeight,
            paddingTop: isExpanded ? insets.top : 0,
            borderTopLeftRadius: animatedBorderRadius,
            borderTopRightRadius: animatedBorderRadius,
        }
    ];

    const scrollViewHeight = (isExpanded ? SCREEN_H - insets.top : HALF_H) - 36 - keyboardHeight;
    const attachmentList = getNormalizedAttachments(localAttachments);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Scrim */}
            <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {isExpanded && insets.top > 0 && (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: insets.top,
                        backgroundColor: Colors.white,
                        zIndex: 999,
                    }}
                />
            )}

            {/* Sheet */}
            <Animated.View style={sheetStyle}>
                {/* Drag Handle */}
                <View {...panResponder.panHandlers} style={styles.handleArea}>
                    <View style={styles.handle} />
                </View>

                <ScrollView
                    style={{ flex: 1, maxHeight: scrollViewHeight }}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    overScrollMode="always"
                >
                    {/* Top Container: Job details info */}
                    <View style={styles.topContainer}>
                        {/* Job Header */}
                        <View style={styles.jobHeader}>
                            <View style={[styles.catIconLarge, { backgroundColor: `${categoryIcon.color}18` }]}>
                                <Ionicons name={categoryIcon.icon as any} size={26} color={categoryIcon.color} />
                            </View>
                            <View style={styles.jobHeaderText}>
                                <Text style={styles.jobDetailTitle} numberOfLines={2}>{job?.title}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
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
                                        Rs. {base.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Location */}
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
                                {job?.location_area && (
                                    <Text style={styles.detailSecondary}>{job?.location_area}</Text>
                                )}
                            </View>
                        </View>

                        {/* Payment Method */}
                        {(() => {
                            const payStyle = getPaymentPrefStyleById(job?.payment_preference_id);
                            return (
                                <View style={styles.detailRow}>
                                    <Ionicons name={payStyle.icon as any} size={16} color={payStyle.logoColor} />
                                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.detailPrimary}>Payment Method</Text>
                                        <Text style={[styles.detailPrimary, { fontWeight: '700', color: payStyle.logoColor }]}>
                                            {payStyle.name}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Customer */}
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
                                                setCustomerReviewsVisible(true);
                                            }
                                        }}
                                    >
                                        {job?.customer_image ? (
                                            <Image source={{ uri: job.customer_image }} style={styles.custAvatarImage} />
                                        ) : (
                                            <View style={styles.custAvatar}>
                                                <Text style={styles.custAvatarText}>
                                                    {(job?.customer_name || 'C').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.custInfo}>
                                            <Text style={styles.custName}>{job?.customer_name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                <Ionicons name="star" size={13} color="#D97706" />
                                                <Text style={styles.custRating}>
                                                    {job?.customer_rating !== undefined && job?.customer_rating !== null
                                                        ? ` ${job.customer_rating.toFixed(1)}`
                                                        : ' New'}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: Colors.brand.dark, fontWeight: '700', marginLeft: 4 }}>
                                                    • View Ratings
                                                </Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {/* Description */}
                        {Boolean(job?.description) && (
                            <View style={styles.descriptionSection}>
                                <Text style={styles.subSectionLabel}>DESCRIPTION</Text>
                                <Text style={styles.descriptionText}>{job?.description}</Text>
                            </View>
                        )}

                        {/* Attachments Carousel */}
                        {attachmentList.length > 0 && (
                            <View style={styles.attachmentsSection}>
                                <Text style={styles.subSectionLabel}>ATTACHED PHOTOS ({attachmentList.length})</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsRow}>
                                    {attachmentList.map((uri, idx) => (
                                        <TouchableOpacity
                                            key={`att_${idx}`}
                                            activeOpacity={0.8}
                                            style={styles.attachmentCard}
                                            onPress={() => setPreviewImage(uri)}
                                        >
                                            <Image source={{ uri }} style={styles.attachmentImage} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Bottom Container: Bidding Options */}
                    <View style={styles.bottomContainer}>
                        <Text style={styles.subSectionLabel}>SELECT YOUR BID</Text>

                        {/* Quick Bid Options */}
                        <View style={styles.quickBidRow}>
                            {[
                                { key: 'plus5' as BidOption, label: `+5%`, sub: `Rs.${plus5.toLocaleString()}` },
                                { key: 'plus10' as BidOption, label: `+10%`, sub: `Rs.${plus10.toLocaleString()}` },
                                { key: 'plus15' as BidOption, label: `+15%`, sub: `Rs.${plus15.toLocaleString()}` },
                            ].map((opt) => {
                                const active = selectedBid === opt.key;
                                return (
                                    <Pressable
                                        key={opt.key}
                                        style={[styles.quickBidBtn, active && styles.quickBidBtnActive, isWaiting && styles.quickBidBtnDisabled]}
                                        onPress={() => {
                                            if (!isWaiting) {
                                                if (selectedBid === opt.key) {
                                                    setSelectedBid(null);
                                                    setCustomAmount('');
                                                } else {
                                                    setSelectedBid(opt.key);
                                                    if (opt.key === 'plus5') setCustomAmount(plus5.toString());
                                                    if (opt.key === 'plus10') setCustomAmount(plus10.toString());
                                                    if (opt.key === 'plus15') setCustomAmount(plus15.toString());
                                                }
                                            }
                                        }}
                                        disabled={isWaiting}
                                    >
                                        <Text style={[styles.quickBidAmount, active && styles.quickBidAmountActive, isWaiting && styles.disabledText]}>
                                            {opt.label}
                                        </Text>
                                        <Text style={[styles.quickBidSub, active && styles.quickBidSubActive, isWaiting && styles.disabledText]}>
                                            {opt.sub}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Custom Bid */}
                        <Text style={[styles.subSectionLabel, { marginTop: 14 }]}>CUSTOM BID</Text>
                        <View style={[styles.customBidInput, isWaiting && styles.customBidInputDisabled]}>
                            <Text style={styles.currencyPrefix}>Rs.</Text>
                            <TextInput
                                style={styles.customBidField}
                                placeholder="Enter amount"
                                placeholderTextColor={Colors.neutral[400]}
                                keyboardType="numeric"
                                value={customAmount}
                                onChangeText={(t) => {
                                    if (isWaiting) return;
                                    const clean = t.replace(/[^0-9]/g, '');
                                    setCustomAmount(clean);
                                    if (clean === '') {
                                        setSelectedBid(null);
                                    } else {
                                        setSelectedBid('custom');
                                    }
                                }}
                                editable={!isWaiting}
                            />
                        </View>

                        {/* Waiting Bar */}
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
                                    <Ionicons name="time-outline" size={16} color="#064E3B" style={{ marginRight: 8 }} />
                                    <Text style={styles.waitingText}>
                                        Waiting for user to accept/decline... ({countdown}s)
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Bid Button */}
                        <Pressable
                            style={[styles.bidButton, isWaiting && styles.bidButtonDisabled]}
                            onPress={handlePlaceBid}
                            disabled={isWaiting}
                        >
                            <Text style={styles.bidButtonText}>
                                {isWaiting
                                    ? `Bid Placed — Rs.${displayAmount.toLocaleString()}`
                                    : `Place Bid at Rs.${computedBidAmount.toLocaleString()}`}
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </Animated.View>

            {/* Image Preview Overlay */}
            <ImagePreviewOverlay
                previewImage={previewImage}
                onClose={() => setPreviewImage(null)}
            />

            {/* Customer Reviews Modal */}
            <UserReviewsModal
                isVisible={customerReviewsVisible}
                onClose={() => setCustomerReviewsVisible(false)}
                userId={job?.customer_id}
                userName={job?.customer_name || 'Customer'}
                role="customer"
            />
        </View>
    );
}
