import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    Image,
    ScrollView,
    Linking,
    Alert,
    ToastAndroid,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { LiveJob } from '@/hooks/useProWebSocket';
import { CustomerProfile } from '@/types';
import { getCustomerProfile, normalizeImageUrl } from '@/services/customer';
import { SkeletonBox } from '@/components/pro/jobDetailBottomSheet/SkeletonBox';
import UserReviewsModal from '@/components/UserReviewsModal';
import { TaskChatModal } from '../common/TaskChatModal';
import { getPaymentPreferenceName, getPaymentPrefStyleById } from '@/store/paymentStore';
import { styles } from '@/styles/proActiveTaskModal.styles';

import useProTaskStore from '@/store/proTaskStore';


interface ProActiveTaskModalProps {
    job: LiveJob | null;
    isVisible: boolean;
    isCancelled?: boolean;
    onClose: () => void;
    onCompleteTask?: (job: LiveJob) => Promise<void> | void;
}

function showToast(message: string) {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
        Alert.alert('', message);
    }
}

export default function ProActiveTaskModal({
    job,
    isVisible,
    isCancelled = false,
    onClose,
    onCompleteTask,
}: ProActiveTaskModalProps) {
    const insets = useSafeAreaInsets();
    const [isCompleting, setIsCompleting] = useState(false);
    const [customerReviewsVisible, setCustomerReviewsVisible] = useState(false);
    const [chatVisible, setChatVisible] = useState(false);


    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState(false);
    const [fetchedProfile, setFetchedProfile] = useState<CustomerProfile | null>(null);

    const handleCall = () => {
        // Call is now handled inside TaskChatModal's own VoIP modal
    };

    const loadCustomerProfile = useCallback(async () => {
        if (!job?.customer_id) {
            setIsLoadingProfile(false);
            return;
        }
        setIsLoadingProfile(true);
        setProfileError(false);
        try {
            const profileData = await getCustomerProfile(Number(job.customer_id));
            setFetchedProfile(profileData);
            setIsLoadingProfile(false);

            const fullName = [profileData.first_name, profileData.last_name].filter(Boolean).join(' ').trim();
            const avatarUrl = normalizeImageUrl(profileData.image);
            if (fullName || avatarUrl) {
                const currentTask = useProTaskStore.getState().activeProTask;
                if (currentTask && Number(currentTask.id) === Number(job.id)) {
                    useProTaskStore.getState().setActiveProTask({
                        ...currentTask,
                        customer_name: fullName || currentTask.customer_name,
                        customer_image: avatarUrl || currentTask.customer_image,
                        customer_rating: profileData.overall_rating ?? currentTask.customer_rating,
                        customer_profile: profileData,
                    });
                }
            }
        } catch (err) {
            console.warn('[ProActiveTaskModal] Error loading customer profile:', err);
            setProfileError(true);
            setIsLoadingProfile(false);
        }
    }, [job?.customer_id, job?.id]);

    useEffect(() => {
        if (isVisible && job) {
            if (job.customer_profile) {
                setFetchedProfile(job.customer_profile);
                setIsLoadingProfile(false);
                setProfileError(false);
            } else if (job.customer_id && (!job.customer_name || job.customer_name === 'Customer')) {
                loadCustomerProfile();
            } else {
                setIsLoadingProfile(false);
                setProfileError(false);
            }
        }
    }, [isVisible, job, loadCustomerProfile]);

    useEffect(() => {
        if (isCancelled) {
            setChatVisible(false);
            setCustomerReviewsVisible(false);
        }
    }, [isCancelled]);

    if (!job || !isVisible) return null;

    const activeProfile = fetchedProfile || job.customer_profile;
    const fullName = activeProfile
        ? [activeProfile.first_name, activeProfile.last_name].filter(Boolean).join(' ').trim()
        : '';
    const customerName = fullName || job.customer_name || 'Customer';
    const rawImage = activeProfile?.image || job.customer_image;
    const customerAvatar = normalizeImageUrl(rawImage);
    const customerRating = activeProfile?.overall_rating ?? job.customer_rating ?? 4.8;
    const rawPhone = activeProfile?.phone_number || job.customer_profile?.phone_number || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    const handleWhatsApp = () => {
        const targetPhone = cleanPhone.length >= 7 ? cleanPhone : '923001234567';
        const textMessage = `Hi ${customerName}, I am your service provider from KaamKarwao for task #${job.id} ("${job.title}").`;
        const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(textMessage)}`;

        console.log('[ProActiveTaskModal] Opening WhatsApp URL:', whatsappUrl);
        Linking.openURL(whatsappUrl).catch(() => {
            Alert.alert(
                'WhatsApp Error',
                'Could not open WhatsApp. Please ensure WhatsApp is installed on your device.'
            );
        });
    };

    const handleComplete = async () => {
        if (!onCompleteTask) {
            onClose();
            return;
        }
        setIsCompleting(true);
        try {
            await onCompleteTask(job);
            showToast('Task marked as completed!');
            onClose();
        } catch (err) {
            console.warn('[ProActiveTaskModal] Complete task action failed:', err);
        } finally {
            setIsCompleting(false);
        }
    };

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={onClose} style={styles.backBtn} hitSlop={10}>
                        <Ionicons name="close" size={24} color={Colors.white} />
                    </Pressable>
                    <Text style={styles.headerTitle}>{isCancelled ? 'Task Cancelled' : 'Assigned Job'}</Text>
                    {isCancelled ? (
                        <View style={styles.cancelledBadge}>
                            <View style={styles.redDot} />
                            <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                        </View>
                    ) : (
                        <View style={styles.assignedBadge}>
                            <View style={styles.greenDot} />
                            <Text style={styles.assignedBadgeText}>ACTIVE</Text>
                        </View>
                    )}
                </View>

                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
                    {/* Alert Banner */}
                    {isCancelled ? (
                        <View style={styles.alertCancelled}>
                            <Ionicons name="close-circle" size={26} color="#EF4444" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.alertCancelledTitle}>Task Cancelled by Customer</Text>
                                <Text style={styles.alertCancelledSub}>
                                    The customer has cancelled this job request. No further action is required.
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.alertSuccess}>
                            <Ionicons name="checkmark-circle" size={26} color="#047857" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.alertSuccessTitle}>Congratulations! Job Assigned</Text>
                                <Text style={styles.alertSuccessSub}>
                                    Your bid of Rs. {job.budget.toLocaleString()} was accepted.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Customer Profile Card */}
                    <View style={styles.customerCard}>
                        <Text style={styles.sectionHeading}>Customer Details</Text>

                        {isLoadingProfile ? (
                            <View style={styles.skeletonContainer}>
                                <View style={styles.customerRow}>
                                    <SkeletonBox
                                        width={52}
                                        height={52}
                                        borderRadius={26}
                                        backgroundColor="rgba(255,255,255,0.12)"
                                    />
                                    <View style={{ flex: 1, gap: 8 }}>
                                        <SkeletonBox
                                            width={140}
                                            height={16}
                                            borderRadius={4}
                                            backgroundColor="rgba(255,255,255,0.12)"
                                        />
                                        <SkeletonBox
                                            width={100}
                                            height={14}
                                            borderRadius={4}
                                            backgroundColor="rgba(255,255,255,0.12)"
                                        />
                                        <SkeletonBox
                                            width={160}
                                            height={12}
                                            borderRadius={4}
                                            backgroundColor="rgba(255,255,255,0.12)"
                                        />
                                    </View>
                                </View>
                                {!isCancelled && (
                                    <View style={styles.contactButtonsRow}>
                                        <SkeletonBox
                                            width="31%"
                                            height={42}
                                            borderRadius={10}
                                            backgroundColor="rgba(255,255,255,0.12)"
                                        />
                                        <SkeletonBox
                                            width="31%"
                                            height={42}
                                            borderRadius={10}
                                            backgroundColor="rgba(255,255,255,0.12)"
                                        />
                                        <SkeletonBox
                                            width="31%"
                                            height={42}
                                            borderRadius={10}
                                            backgroundColor="rgba(255,255,255,0.12)"
                                        />
                                    </View>
                                )}
                            </View>
                        ) : profileError ? (
                            <View style={styles.errorContainer}>
                                <View style={styles.errorRow}>
                                    <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />
                                    <Text style={styles.errorText}>Failed to load customer profile.</Text>
                                </View>
                                <Pressable style={styles.retryBtn} onPress={loadCustomerProfile}>
                                    <Ionicons name="refresh-outline" size={16} color={Colors.white} />
                                    <Text style={styles.retryBtnText}>Retry Loading Profile</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <Pressable
                                    style={styles.customerRow}
                                    onPress={() => {
                                        if (job.customer_id) {
                                            setCustomerReviewsVisible(true);
                                        }
                                    }}
                                >
                                    {customerAvatar ? (
                                        <Image source={{ uri: customerAvatar }} style={styles.customerAvatar} />
                                    ) : (
                                        <View style={styles.customerAvatarPlaceholder}>
                                            <Text style={styles.avatarInitials}>
                                                {customerName ? customerName.slice(0, 2).toUpperCase() : 'CU'}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.customerInfo}>
                                        <Text style={styles.customerName}>{customerName}</Text>
                                        <View style={styles.ratingRow}>
                                            <Ionicons name="star" size={15} color="#F59E0B" />
                                            <Text style={styles.ratingText}>
                                                {customerRating ? Number(customerRating).toFixed(1) : '4.8'} Customer Rating
                                            </Text>
                                        </View>
                                        <Text style={styles.tapToViewReviewsHint}>Tap profile to see reviews</Text>
                                        <View style={styles.locationRow}>
                                            <Ionicons name="location-outline" size={14} color={Colors.neutral[400]} />
                                            <Text style={styles.locationText} numberOfLines={2}>
                                                {job.location_name || 'Location details unavailable'}
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>

                                {/* Direct Contact Buttons (Only active when NOT cancelled) */}
                                {!isCancelled && (
                                    <View style={styles.contactButtonsRow}>
                                        <Pressable style={[styles.contactBtn, styles.chatBtn]} onPress={() => setChatVisible(true)}>
                                            <Ionicons name="chatbubble-ellipses" size={18} color={Colors.white} />
                                            <Text style={styles.contactBtnText} numberOfLines={1}>In-App Chat</Text>
                                        </Pressable>

                                        <Pressable style={[styles.contactBtn, styles.whatsappBtn]} onPress={handleWhatsApp}>
                                            <Ionicons name="logo-whatsapp" size={18} color={Colors.white} />
                                            <Text style={styles.contactBtnText} numberOfLines={1}>WhatsApp</Text>
                                        </Pressable>

                                        <Pressable style={[styles.contactBtn, styles.callBtn]} onPress={handleCall}>
                                            <Ionicons name="call" size={18} color={Colors.white} />
                                            <Text style={styles.contactBtnText} numberOfLines={1}>Call</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {/* Task Summary Card */}
                    <View style={styles.jobCard}>
                        <Text style={styles.sectionHeading}>Task Overview</Text>
                        <View style={styles.jobHeader}>
                            <Text style={styles.jobTitle}>{job.title}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryBadgeText}>{job.category}</Text>
                                </View>
                                {Boolean(job.subcategory) && (
                                    <View style={[styles.categoryBadge, { backgroundColor: '#ECFDF5' }]}>
                                        <Text style={[styles.categoryBadgeText, { color: '#047857' }]}>{job.subcategory}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.budgetBox}>
                            <Text style={styles.budgetLabel}>Agreed Budget</Text>
                            <Text style={styles.budgetValue}>Rs. {job.budget.toLocaleString()}</Text>
                        </View>

                        {(() => {
                            const payStyle = getPaymentPrefStyleById(job.payment_preference_id);
                            return (
                                <View style={styles.budgetBox}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name={payStyle.icon as any} size={14} color={payStyle.logoColor} />
                                        <Text style={styles.budgetLabel}>Payment Method</Text>
                                    </View>
                                    <Text style={[styles.budgetValue, { color: payStyle.logoColor }]}>
                                        {payStyle.name}
                                    </Text>
                                </View>
                            );
                        })()}

                        {Boolean(job.description) && (
                            <View style={styles.descBox}>
                                <Text style={styles.descLabel}>Description</Text>
                                <Text style={styles.descText}>{job.description}</Text>
                            </View>
                        )}
                    </View>

                    {/* Bottom Action Button */}
                    {isCancelled ? (
                        <Pressable style={styles.returnBtn} onPress={onClose}>
                            <Ionicons name="arrow-back" size={20} color={Colors.white} style={{ marginRight: 6 }} />
                            <Text style={styles.completeBtnText}>Return to Live Jobs</Text>
                        </Pressable>
                    ) : (
                        <Pressable
                            style={[styles.completeBtn, isCompleting && { opacity: 0.7 }]}
                            onPress={handleComplete}
                            disabled={isCompleting}
                        >
                            {isCompleting ? (
                                <ActivityIndicator color={Colors.white} size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done" size={22} color={Colors.white} />
                                    <Text style={styles.completeBtnText}>Mark Job as Completed</Text>
                                </>
                            )}
                        </Pressable>
                    )}
                </ScrollView>
            </View>

            {/* In-App WebSocket Task Chat Modal for Pro */}
            <TaskChatModal
                visible={chatVisible}
                onClose={() => setChatVisible(false)}
                taskId={job.id}
                otherUserName={customerName}
                otherUserAvatar={customerAvatar}
                isProfileLoading={isLoadingProfile}
                onCall={handleCall}
                role="pro"
            />

            {/* Customer Reviews Modal */}
            <UserReviewsModal
                isVisible={customerReviewsVisible}
                onClose={() => setCustomerReviewsVisible(false)}
                userId={job.customer_id}
                userName={customerName}
                role="customer"
            />


        </Modal>
    );
}
