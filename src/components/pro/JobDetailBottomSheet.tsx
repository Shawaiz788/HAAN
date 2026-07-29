import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Animated,
    PanResponder,
    Dimensions,
    ScrollView,
    Alert,
    ToastAndroid,
    Platform,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { LiveJob } from '@/hooks/useProWebSocket';
import { useBiddingWebSocket } from '@/hooks/useBiddingWebSocket';
import { useAuth } from '@/context/auth';
import { getTaskAttachments } from '@/services/task';
import UserReviewsModal from '@/components/UserReviewsModal';
import { styles } from '@/styles/jobDetailBottomSheet.styles';
import { getNormalizedAttachments } from '@/utils/attachmentUtils';
import { ImagePreviewOverlay } from '@/components/pro/ImagePreviewOverlay';
import { ActiveBidState } from '@/hooks/useActiveBids';
import { logger } from '@/utils/logger';

import { JobDetailHeaderSection } from './jobDetailBottomSheet/JobDetailHeaderSection';
import { JobDetailDescriptionSection } from './jobDetailBottomSheet/JobDetailDescriptionSection';
import { JobDetailBiddingSection, BidOption } from './jobDetailBottomSheet/JobDetailBiddingSection';

const { height: WINDOW_H } = Dimensions.get('window');
const { height: SCREEN_H_SCREEN } = Dimensions.get('screen');
const SCREEN_H = Math.max(WINDOW_H, SCREEN_H_SCREEN);
const HALF_H = SCREEN_H * 0.58;
const CLOSED_Y = SCREEN_H;

interface JobDetailBottomSheetProps {
    job: LiveJob | null;
    isVisible: boolean;
    onClose: () => void;
    onBidAccepted?: (job: LiveJob, amount: number) => void;
    activeBid?: ActiveBidState | null;
    onPlaceBid?: (job: LiveJob, amount: number) => void;
    hasActiveTask?: boolean;
}

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
    const [sheetState, setSheetState] = useState<'default' | 'expanded'>('default');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [localVisible, setLocalVisible] = useState(false);

    const [isWaiting, setIsWaiting] = useState(false);
    const [bidAmountPlaced, setBidAmountPlaced] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [customerReviewsVisible, setCustomerReviewsVisible] = useState(false);
    const [localAttachments, setLocalAttachments] = useState<any[]>(job?.attachments || []);
    const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const translateY = useRef(new Animated.Value(CLOSED_Y)).current;
    const currentY = useRef(CLOSED_Y);
    const progressAnim = useRef(new Animated.Value(0)).current;

    const activeBidForThisJob = (passedActiveBid && job && passedActiveBid.jobId === job.id) ? passedActiveBid : null;

    useEffect(() => {
        if (isVisible && job?.id) {
            setLocalAttachments(job.attachments || []);
            setIsAttachmentsLoading(true);
            getTaskAttachments(job.id)
                .then((fetched) => {
                    if (Array.isArray(fetched) && fetched.length > 0) {
                        setLocalAttachments(fetched);
                    }
                })
                .catch((err) => {
                    logger.warn('[JobDetailBottomSheet] Failed to load attachments:', err);
                })
                .finally(() => {
                    setIsAttachmentsLoading(false);
                });
        }
    }, [isVisible, job?.id]);

    useEffect(() => {
        if (activeBidForThisJob) {
            setIsWaiting(true);
            setBidAmountPlaced(activeBidForThisJob.amount);
            const elapsedSec = Math.floor((Date.now() - activeBidForThisJob.startTimeMs) / 1000);
            const totalSec = Math.floor(activeBidForThisJob.durationMs / 1000);
            const remaining = Math.max(0, totalSec - elapsedSec);
            setCountdown(remaining);
            progressAnim.setValue(totalSec > 0 ? (totalSec - elapsedSec) / totalSec : 0);

            const interval = setInterval(() => {
                const curElapsed = Math.floor((Date.now() - activeBidForThisJob.startTimeMs) / 1000);
                const rem = Math.max(0, totalSec - curElapsed);
                setCountdown(rem);
                if (rem <= 0) clearInterval(interval);
            }, 1000);

            return () => clearInterval(interval);
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
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (isVisible && job) {
            setSelectedBid(null);
            setCustomAmount('');
            setSheetState('default');
            setLocalVisible(true);

            Animated.spring(translateY, {
                toValue: SCREEN_H - HALF_H,
                useNativeDriver: true,
                tension: 50,
                friction: 10,
            }).start();
            currentY.current = SCREEN_H - HALF_H;
        } else {
            Animated.spring(translateY, {
                toValue: SCREEN_H,
                useNativeDriver: true,
                tension: 50,
                friction: 10,
            }).start(({ finished }) => {
                if (finished) {
                    setLocalVisible(false);
                }
            });
            currentY.current = SCREEN_H;
        }
    }, [isVisible, job]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
            onPanResponderGrant: () => {
                translateY.stopAnimation((val) => {
                    currentY.current = val;
                });
            },
            onPanResponderMove: (_, g) => {
                const newY = Math.max(0, currentY.current + g.dy);
                translateY.setValue(newY);
            },
            onPanResponderRelease: (_, g) => {
                const cur = currentY.current + g.dy;
                const isSwipeDown = g.dy > 50 || g.vy > 0.4;
                const isSwipeUp = g.dy < -50 || g.vy < -0.4;

                if (isSwipeDown) {
                    if (cur > (SCREEN_H - HALF_H) + 60) {
                        Animated.spring(translateY, {
                            toValue: SCREEN_H,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 10,
                        }).start(({ finished }) => {
                            if (finished) {
                                onClose();
                                setLocalVisible(false);
                            }
                        });
                        currentY.current = SCREEN_H;
                    } else {
                        Animated.spring(translateY, {
                            toValue: SCREEN_H - HALF_H,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 10,
                        }).start();
                        currentY.current = SCREEN_H - HALF_H;
                        setSheetState('default');
                    }
                } else if (isSwipeUp) {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 10,
                    }).start();
                    currentY.current = 0;
                    setSheetState('expanded');
                } else {
                    const snapFull = Math.abs(cur - 0);
                    const snapHalf = Math.abs(cur - (SCREEN_H - HALF_H));
                    const snapClose = Math.abs(cur - SCREEN_H);
                    if (snapFull < snapHalf && snapFull < snapClose) {
                        Animated.spring(translateY, {
                            toValue: 0,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 10,
                        }).start();
                        currentY.current = 0;
                        setSheetState('expanded');
                    } else if (snapClose < snapHalf) {
                        Animated.spring(translateY, {
                            toValue: SCREEN_H,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 10,
                        }).start(({ finished }) => {
                            if (finished) {
                                onClose();
                                setLocalVisible(false);
                            }
                        });
                        currentY.current = SCREEN_H;
                    } else {
                        Animated.spring(translateY, {
                            toValue: SCREEN_H - HALF_H,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 10,
                        }).start();
                        currentY.current = SCREEN_H - HALF_H;
                        setSheetState('default');
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
                'You already have an active job in progress! Please complete your current job before bidding on another task.',
                [{ text: 'OK' }]
            );
            return;
        }

        wsPlaceBid(computedBidAmount, 1);
        Keyboard.dismiss();
        if (onPlaceBid) {
            onPlaceBid(job, computedBidAmount);
        }
    };

    const handleSelectBid = (opt: BidOption) => {
        setSelectedBid(opt);
        if (opt === 'plus5') setCustomAmount(plus5.toString());
        else if (opt === 'plus10') setCustomAmount(plus10.toString());
        else if (opt === 'plus15') setCustomAmount(plus15.toString());
        else if (opt === null) setCustomAmount('');
    };

    const handleChangeCustomAmount = (t: string) => {
        if (isWaiting) return;
        const clean = t.replace(/[^0-9]/g, '');
        setCustomAmount(clean);
        if (clean === '') {
            setSelectedBid(null);
        } else {
            setSelectedBid('custom');
        }
    };

    if (!localVisible) return null;

    const scrimOpacity = translateY.interpolate({
        inputRange: [0, SCREEN_H - HALF_H, SCREEN_H],
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
        },
    ];

    const scrollViewHeight = (isExpanded ? SCREEN_H - insets.top : HALF_H) - 36 - keyboardHeight;
    const attachmentList = getNormalizedAttachments(localAttachments);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Scrim */}
            <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* White status bar filler when expanded */}
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
                {/* Drag Handle Area */}
                <View {...panResponder.panHandlers} style={styles.handleArea}>
                    <View style={styles.handle} />
                </View>

                <ScrollView
                    style={{ flex: 1, maxHeight: scrollViewHeight }}
                    contentContainerStyle={[
                        styles.content,
                        { paddingBottom: Math.max(insets.bottom, 16) + 40 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    overScrollMode="always"
                >
                    {/* Top Container: Header, Location, Payment, Customer */}
                    <JobDetailHeaderSection
                        job={job}
                        baseBudget={base}
                        onOpenCustomerReviews={() => setCustomerReviewsVisible(true)}
                    />

                    {/* Middle Container: Description & Attachments Carousel */}
                    <JobDetailDescriptionSection
                        job={job}
                        attachmentList={attachmentList}
                        isAttachmentsLoading={isAttachmentsLoading}
                        onPreviewImage={(uri) => setPreviewImage(uri)}
                    />

                    {/* Bottom Container: Quick Bid, Custom Bid, Waiting bar & Action button */}
                    <JobDetailBiddingSection
                        plus5={plus5}
                        plus10={plus10}
                        plus15={plus15}
                        selectedBid={selectedBid}
                        customAmount={customAmount}
                        isWaiting={isWaiting}
                        countdown={countdown}
                        progressAnim={progressAnim}
                        computedBidAmount={computedBidAmount}
                        displayAmount={displayAmount}
                        onSelectBid={handleSelectBid}
                        onChangeCustomAmount={handleChangeCustomAmount}
                        onPlaceBid={handlePlaceBid}
                    />
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
