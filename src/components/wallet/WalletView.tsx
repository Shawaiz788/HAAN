import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { getWalletByUserId, UserWallet } from '@/services/wallet';
import { styles } from '@/styles/wallet.styles';

interface WalletViewProps {
  role?: 'client' | 'pro';
}

export default function WalletView({ role = 'client' }: WalletViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async (showFullLoader = true) => {
    if (!user?.id) {
      setError('User not logged in or missing user ID.');
      setIsLoading(false);
      return;
    }

    if (showFullLoader) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getWalletByUserId(user.id);
      setWallet(data);
    } catch (err: any) {
      console.error('[WalletView] Fetch error:', err);
      setError(err?.message || 'Unable to fetch wallet details. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWallet(true);
  }, [fetchWallet]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWallet(false);
  };

  // Helper to format currency amount cleanly
  const formatAmount = (numOrStr?: string | number) => {
    if (numOrStr === undefined || numOrStr === null) return '0.00';
    const val = typeof numOrStr === 'string' ? parseFloat(numOrStr) : numOrStr;
    if (isNaN(val)) return '0.00';
    return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const rawAmount = wallet?.amount !== undefined ? (typeof wallet.amount === 'string' ? parseFloat(wallet.amount) : wallet.amount) : 0;
  const isNegative = !isNaN(rawAmount) && rawAmount < 0;

  // Render Full Screen Loading
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B5A3E" />
        <Text style={styles.loadingText}>Fetching wallet balance...</Text>
      </View>
    );
  }

  // Render Error Feedback Screen
  if (error && !wallet) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Ionicons name="wallet-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Wallet Load Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <Pressable style={styles.retryBtn} onPress={() => fetchWallet(true)}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry / Refresh</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>My Wallet</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#0B5A3E']}
            tintColor="#0B5A3E"
          />
        }
      >
        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="card" size={20} color="#10B981" style={styles.chipIcon} />
              <Text style={styles.cardLabel}>KAAM KRWAO WALLET</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role === 'pro' ? 'Worker' : 'Customer'}</Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <Text style={[styles.balanceValue, isNegative && styles.negativeBalance]}>
                {formatAmount(wallet?.amount)}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.userMeta}>
              <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.userMetaText}>{user?.displayName || 'App User'}</Text>
            </View>
          </View>
        </View>

        {/* Details & Status Section */}
        <View style={styles.infoSection}>
          {/* Account Status Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrapper}>
              <Ionicons
                name={isNegative ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={22}
                color={isNegative ? '#DC2626' : '#16A34A'}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Account Status</Text>
              <Text style={styles.infoSubtitle}>
                {isNegative ? 'Outstanding balance due' : 'Wallet active & in good standing'}
              </Text>
            </View>
            <View style={[styles.statusBadge, isNegative ? styles.statusBadgeNegative : styles.statusBadgeActive]}>
              <Text style={isNegative ? styles.statusBadgeTextNegative : styles.statusBadgeTextActive}>
                {isNegative ? 'Pending' : 'Active'}
              </Text>
            </View>
          </View>

          {/* User Details Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="person-outline" size={22} color="#0B5A3E" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Account Holder</Text>
              <Text style={styles.infoSubtitle}>{user?.email || user?.phoneNumber || 'Registered Account'}</Text>
            </View>
          </View>
        </View>

        {/* Refresh Action Button */}
        <Pressable style={styles.refreshBtn} onPress={() => fetchWallet(true)}>
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.refreshBtnText}>Refresh Balance</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
