import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Bid } from '@/context/post-job';
import { styles } from '@/styles/activeTaskScreen.styles';

interface ClientBidsListProps {
  bids: Bid[];
  onAcceptBid: (bid: Bid) => void;
  onDeclineBid: (bidId: string) => void;
  onSelectPro: (proId: number, name: string) => void;
}

export function ClientBidsList({
  bids,
  onAcceptBid,
  onDeclineBid,
  onSelectPro,
}: ClientBidsListProps) {
  return (
    <View style={styles.bidsSection}>
      <Text style={styles.sectionTitle}>Offers ({bids.length})</Text>
      {bids.length === 0 ? (
        <View style={styles.noOffersContainer}>
          <Ionicons name="chatbox-ellipses-outline" size={24} color="#9CA3AF" style={{ marginBottom: 4 }} />
          <Text style={styles.noOffersText}>No offers received yet</Text>
          <Text style={styles.noOffersSubText}>
            Offers from nearby service providers will appear here in real time.
          </Text>
        </View>
      ) : (
        bids.map((bid) => {
          if (bid.is_profile_loading) {
            return (
              <View key={bid.id} style={styles.bidCard}>
                <View style={styles.bidHeader}>
                  <View style={[styles.bidAvatar, styles.skeletonBox]} />
                  <View style={styles.bidHeaderInfo}>
                    <View style={[styles.skeletonLine, { width: 130, height: 16, marginBottom: 8 }]} />
                    <View style={[styles.skeletonLine, { width: 90, height: 12 }]} />
                  </View>
                  <View style={styles.bidPriceContainer}>
                    <Text style={styles.bidPrice}>Rs. {bid.price?.toLocaleString?.() ?? bid.price}</Text>
                    <Text style={styles.bidTime}>{bid.timeEstimate ? `Est. ${bid.timeEstimate}` : 'Ready Now'}</Text>
                  </View>
                </View>

                <View style={styles.bidActions}>
                  <Pressable
                    style={[styles.bidBtn, styles.declineBtn]}
                    onPress={() => onDeclineBid(bid.id)}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.bidBtn, styles.acceptBtn]}
                    onPress={() => onAcceptBid(bid)}
                  >
                    <Text style={styles.acceptBtnText}>Accept Offer</Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          const hasCustomMessage = Boolean(
            bid.message &&
            bid.message.trim().length > 0 &&
            !bid.message.includes('Estimated duration') &&
            !bid.message.includes('Ready to perform task') &&
            !bid.message.includes('Service Provider')
          );

          return (
            <View key={bid.id} style={styles.bidCard}>
              <View style={styles.bidHeader}>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => {
                    if (bid.user_id) {
                      onSelectPro(bid.user_id, bid.name);
                    }
                  }}
                >
                  <Image source={{ uri: bid.avatar }} style={styles.bidAvatar} />
                  <View style={styles.bidHeaderInfo}>
                    <Text style={styles.bidName}>{bid.name}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {bid.rating} ({bid.reviewsCount ? `${bid.reviewsCount} review${bid.reviewsCount > 1 ? 's' : ''}` : '0 reviews'})
                      </Text>
                    </View>
                  </View>
                </Pressable>
                <View style={styles.bidPriceContainer}>
                  <Text style={styles.bidPrice}>Rs. {bid.price?.toLocaleString?.() ?? bid.price}</Text>
                  <Text style={styles.bidTime}>{bid.timeEstimate ? `Est. ${bid.timeEstimate}` : 'Ready Now'}</Text>
                </View>
              </View>

              {hasCustomMessage ? (
                <Text style={styles.bidComment}>"{bid.message}"</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                    <Ionicons name="shield-checkmark" size={13} color="#22C55E" />
                    <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '500' }}>Verified Service Provider</Text>
                  </View>
                </View>
              )}

              <View style={styles.bidActions}>
                <Pressable
                  style={[styles.bidBtn, styles.declineBtn]}
                  onPress={() => onDeclineBid(bid.id)}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Pressable>
                <Pressable
                  style={[styles.bidBtn, styles.acceptBtn]}
                  onPress={() => onAcceptBid(bid)}
                >
                  <Text style={styles.acceptBtnText}>Accept Offer</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
