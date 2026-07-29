import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Bid } from '@/context/post-job';
import { styles } from '@/styles/activeTaskScreen.styles';

interface AcceptedProCardProps {
  acceptedBid: Bid;
  activeChatMessagesCount: number;
  onCall: () => void;
  onWhatsApp: () => void;
  onOpenChat: () => void;
  onSelectPro: (proId: number, name: string) => void;
  onRetryProfile?: () => void;
  isRetryingProfile?: boolean;
}

export function AcceptedProCard({
  acceptedBid,
  activeChatMessagesCount,
  onCall,
  onWhatsApp,
  onOpenChat,
  onSelectPro,
  onRetryProfile,
  isRetryingProfile = false,
}: AcceptedProCardProps) {
  const isFallbackName = !acceptedBid.name || acceptedBid.name.startsWith('Professional #') || acceptedBid.name.startsWith('Worker #');
  const showRetry = Boolean(onRetryProfile && (acceptedBid.is_profile_loading || isFallbackName));

  const formatReviewsCount = (count?: number | null) => {
    if (count === undefined || count === null) return 'reviews unverified';
    if (count === 0) return '0 reviews';
    return `${count} review${count > 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.acceptedSection}>
      <View style={styles.alertSuccess}>
        <Ionicons name="checkmark-circle" size={24} color="#047857" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.alertSuccessTitle}>Professional Assigned!</Text>
          <Text style={styles.alertSuccessText}>
            {acceptedBid.is_profile_loading || isFallbackName ? 'Service Provider' : acceptedBid.name.split(' ')[0]} is arriving in ~{acceptedBid.timeEstimate}.
          </Text>
        </View>
      </View>

      {acceptedBid.is_profile_loading ? (
        <View style={styles.proProfileCard}>
          <View style={[styles.proLargeAvatar, styles.skeletonBox]} />
          <View style={[styles.skeletonLine, { width: 160, height: 20, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: 110, height: 14, marginBottom: 12 }]} />
          <Text style={{
            fontSize: 12,
            color: showRetry && !isRetryingProfile ? '#DC2626' : '#6B7280',
            marginBottom: 12,
            fontWeight: showRetry && !isRetryingProfile ? '500' : '400',
          }}>
            {isRetryingProfile
              ? 'Retrying profile fetch...'
              : showRetry
              ? 'Unable to load professional profile'
              : 'Loading professional profile...'}
          </Text>
          {showRetry && (
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 16,
                backgroundColor: '#F3F4F6',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              onPress={onRetryProfile}
              disabled={isRetryingProfile}
            >
              <Ionicons name="refresh" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                {isRetryingProfile ? 'Retrying...' : 'Retry Loading Profile'}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.proProfileCard}>
          <Pressable
            style={{ alignItems: 'center', width: '100%', marginBottom: 16 }}
            onPress={() => {
              const proId = (acceptedBid as any)?.user_id;
              if (proId) {
                onSelectPro(proId, acceptedBid.name);
              }
            }}
          >
            <Image source={{ uri: acceptedBid.avatar }} style={styles.proLargeAvatar} />
            <Text style={styles.proLargeName}>{acceptedBid.name}</Text>
            <View style={styles.proLargeRating}>
              <Ionicons name="star" size={18} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.proLargeRatingText}>
                {acceptedBid.rating} ({formatReviewsCount(acceptedBid.reviewsCount)})
              </Text>
            </View>
            <Text style={styles.tapToViewReviewsHint}>Tap profile to see reviews</Text>
            {isFallbackName && showRetry && (
              <Pressable
                style={{ paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#FEF3C7', borderRadius: 8, marginTop: 8 }}
                onPress={onRetryProfile}
                disabled={isRetryingProfile}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>
                  {isRetryingProfile ? 'Retrying...' : '⚠️ Tap to retry loading profile'}
                </Text>
              </Pressable>
            )}
          </Pressable>

          <View style={styles.proContactRow}>
            <Pressable
              style={[styles.contactCircleBtn, styles.contactPhone]}
              onPress={onCall}
            >
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.contactCircleBtn, styles.contactWhatsApp]}
              onPress={onWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.contactCircleBtn, styles.contactChat]}
              onPress={onOpenChat}
            >
              <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
              {activeChatMessagesCount > 0 && (
                <View style={styles.chatBadge} />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
