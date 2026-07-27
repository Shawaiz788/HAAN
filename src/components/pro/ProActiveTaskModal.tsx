import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
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
import UserReviewsModal from '@/components/UserReviewsModal';
import { getPaymentPreferenceName, getPaymentPrefStyleById } from '@/utils/paymentCache';

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

    if (!job || !isVisible) return null;

    const rawPhone = job.customer_profile?.phone_number || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    const handleWhatsApp = () => {
        const targetPhone = cleanPhone.length >= 7 ? cleanPhone : '923001234567';
        const textMessage = `Hi ${job.customer_name}, I am your service provider from KaamKarwao for task #${job.id} ("${job.title}").`;
        const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(textMessage)}`;

        console.log('[ProActiveTaskModal] Opening WhatsApp URL:', whatsappUrl);
        Linking.openURL(whatsappUrl).catch(() => {
            Alert.alert(
                'WhatsApp Error',
                'Could not open WhatsApp. Please ensure WhatsApp is installed on your device.'
            );
        });
    };

    const handleCall = () => {
        const targetPhone = cleanPhone.length >= 7 ? cleanPhone : '923001234567';
        const telUrl = `tel:${targetPhone}`;

        console.log('[ProActiveTaskModal] Opening Tel URL:', telUrl);
        Linking.openURL(telUrl).catch(() => {
            Alert.alert('Phone Call Error', 'Could not open phone dialer.');
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
                        <Pressable 
                            style={styles.customerRow}
                            onPress={() => {
                                if (job.customer_id) {
                                    setCustomerReviewsVisible(true);
                                }
                            }}
                        >
                            {job.customer_image ? (
                                <Image source={{ uri: job.customer_image }} style={styles.customerAvatar} />
                            ) : (
                                <View style={styles.customerAvatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {job.customer_name
                                            ? job.customer_name.slice(0, 2).toUpperCase()
                                             : 'CU'}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.customerInfo}>
                                <Text style={styles.customerName}>{job.customer_name}</Text>
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={15} color="#F59E0B" />
                                    <Text style={styles.ratingText}>
                                        {job.customer_rating ? job.customer_rating.toFixed(1) : '4.8'} Customer Rating
                                    </Text>
                                </View>
                                <Text style={styles.tapToViewReviewsHint}>Tap profile to see reviews</Text>
                                <View style={styles.locationRow}>
                                    <Ionicons name="location-outline" size={14} color={Colors.neutral[400]} />
                                    <Text style={styles.locationText} numberOfLines={2}>
                                        {job.location_name}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>

                        {/* Direct Contact Buttons (Only active when NOT cancelled) */}
                        {!isCancelled && (
                            <View style={styles.contactButtonsRow}>
                                <Pressable style={[styles.contactBtn, styles.whatsappBtn]} onPress={handleWhatsApp}>
                                    <Ionicons name="logo-whatsapp" size={20} color={Colors.white} />
                                    <Text style={styles.contactBtnText}>Message WhatsApp</Text>
                                </Pressable>

                                <Pressable style={[styles.contactBtn, styles.callBtn]} onPress={handleCall}>
                                    <Ionicons name="call" size={20} color={Colors.white} />
                                    <Text style={styles.contactBtnText}>Call Customer</Text>
                                </Pressable>
                            </View>
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

            {/* Customer Reviews Modal */}
            <UserReviewsModal
                isVisible={customerReviewsVisible}
                onClose={() => setCustomerReviewsVisible(false)}
                userId={job.customer_id}
                userName={job.customer_name || 'Customer'}
                role="customer"
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.pro.bg,
    },
    header: {
        backgroundColor: Colors.pro.header,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    assignedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34,197,94,0.18)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    greenDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.pro.accent,
    },
    assignedBadgeText: {
        color: Colors.pro.accent,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cancelledBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239,68,68,0.18)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    redDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
    },
    cancelledBadgeText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    content: {
        padding: 16,
        gap: 16,
    },
    alertSuccess: {
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.3)',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertSuccessTitle: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
    alertSuccessSub: {
        color: Colors.neutral[300],
        fontSize: 13,
        marginTop: 2,
    },
    alertCancelled: {
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertCancelledTitle: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
    alertCancelledSub: {
        color: Colors.neutral[300],
        fontSize: 13,
        marginTop: 2,
    },
    customerCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 12,
    },
    sectionHeading: {
        color: Colors.neutral[400],
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    customerAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    customerAvatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: Colors.pro.accentDim,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    customerInfo: {
        flex: 1,
        gap: 4,
    },
    customerName: {
        color: Colors.white,
        fontSize: 17,
        fontWeight: '700',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        color: Colors.neutral[300],
        fontSize: 13,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    locationText: {
        color: Colors.neutral[400],
        fontSize: 12,
        flex: 1,
    },
    contactButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    whatsappBtn: {
        backgroundColor: '#25D366',
    },
    callBtn: {
        backgroundColor: '#3B82F6',
    },
    contactBtnText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    jobCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 12,
    },
    jobHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    jobTitle: {
        flex: 1,
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    categoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    categoryBadgeText: {
        color: Colors.neutral[300],
        fontSize: 11,
        fontWeight: '600',
    },
    budgetBox: {
        backgroundColor: 'rgba(34,197,94,0.08)',
        padding: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    budgetLabel: {
        color: Colors.neutral[300],
        fontSize: 13,
    },
    budgetValue: {
        color: Colors.pro.accent,
        fontSize: 18,
        fontWeight: '700',
    },
    descBox: {
        gap: 4,
    },
    descLabel: {
        color: Colors.neutral[400],
        fontSize: 12,
        fontWeight: '600',
    },
    descText: {
        color: Colors.neutral[300],
        fontSize: 13,
        lineHeight: 18,
    },
    completeBtn: {
        backgroundColor: Colors.pro.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        marginTop: 8,
    },
    completeBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    returnBtn: {
        backgroundColor: '#374151',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 8,
    },
    tapToViewReviewsHint: {
        fontSize: 11,
        color: Colors.pro.accent,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 6,
    },
});
