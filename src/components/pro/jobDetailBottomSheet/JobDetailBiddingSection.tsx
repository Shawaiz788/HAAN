import React from 'react';
import { View, Text, Pressable, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { styles } from '@/styles/jobDetailBottomSheet.styles';

export type BidOption = 'plus5' | 'plus10' | 'plus15' | 'custom' | null;

interface JobDetailBiddingSectionProps {
    plus5: number;
    plus10: number;
    plus15: number;
    selectedBid: BidOption;
    customAmount: string;
    isWaiting: boolean;
    countdown: number;
    progressAnim: Animated.Value;
    computedBidAmount: number;
    displayAmount: number;
    onSelectBid: (opt: BidOption) => void;
    onChangeCustomAmount: (text: string) => void;
    onPlaceBid: () => void;
}

export const JobDetailBiddingSection: React.FC<JobDetailBiddingSectionProps> = ({
    plus5,
    plus10,
    plus15,
    selectedBid,
    customAmount,
    isWaiting,
    countdown,
    progressAnim,
    computedBidAmount,
    displayAmount,
    onSelectBid,
    onChangeCustomAmount,
    onPlaceBid,
}) => {
    const quickOptions = [
        { key: 'plus5' as const, amount: plus5, sub: '+5%' },
        { key: 'plus10' as const, amount: plus10, sub: '+10%' },
        { key: 'plus15' as const, amount: plus15, sub: '+15%' },
    ];

    return (
        <View style={styles.bottomContainer}>
            {/* Quick Bid Header */}
            <Text style={styles.subSectionLabel}>QUICK BID</Text>
            <View style={styles.quickBidRow}>
                {quickOptions.map((opt) => {
                    const active = selectedBid === opt.key;
                    return (
                        <Pressable
                            key={opt.key}
                            style={[
                                styles.quickBidBtn,
                                active && styles.quickBidBtnActive,
                                isWaiting && styles.quickBidBtnDisabled,
                            ]}
                            onPress={() => {
                                if (!isWaiting) {
                                    if (selectedBid === opt.key) {
                                        onSelectBid(null);
                                    } else {
                                        onSelectBid(opt.key);
                                    }
                                }
                            }}
                            disabled={isWaiting}
                        >
                            <Text
                                style={[
                                    styles.quickBidAmount,
                                    active && styles.quickBidAmountActive,
                                    isWaiting && styles.disabledText,
                                ]}
                            >
                                Rs.{opt.amount.toLocaleString()}
                            </Text>
                            <Text
                                style={[
                                    styles.quickBidSub,
                                    active && styles.quickBidSubActive,
                                    isWaiting && styles.disabledText,
                                ]}
                            >
                                {opt.sub}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Custom Bid Header */}
            <Text style={[styles.subSectionLabel, { marginTop: 14 }]}>CUSTOM BID</Text>
            <View style={[styles.customBidInput, isWaiting && styles.customBidInputDisabled]}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                    style={styles.customBidField}
                    placeholder="Enter amount"
                    placeholderTextColor={Colors.neutral[400]}
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={onChangeCustomAmount}
                    editable={!isWaiting}
                />
            </View>

            {/* Waiting Progress Bar */}
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

            {/* Place Bid Button */}
            <Pressable
                style={[styles.bidButton, isWaiting && styles.bidButtonDisabled]}
                onPress={onPlaceBid}
                disabled={isWaiting}
            >
                <Text style={styles.bidButtonText}>
                    {isWaiting
                        ? `Bid Placed — Rs.${displayAmount.toLocaleString()}`
                        : `Place Bid at Rs.${computedBidAmount.toLocaleString()}`}
                </Text>
            </Pressable>
        </View>
    );
};
