import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#082C18',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  refreshHeaderBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Wallet Card
  walletCard: {
    backgroundColor: '#0B5A3E',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0B5A3E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIcon: {
    marginRight: 8,
  },
  cardLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  balanceSection: {
    marginVertical: 12,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '800',
    marginRight: 6,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  negativeBalance: {
    color: '#F87171',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userMetaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  walletIdText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '500',
  },

  // Info Cards / Details Section
  infoSection: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeTextActive: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextNegative: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
  },

  // Action / Refresh Button
  refreshBtn: {
    backgroundColor: '#0B5A3E',
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  errorCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B5A3E',
    height: 46,
    borderRadius: 12,
    width: '100%',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
