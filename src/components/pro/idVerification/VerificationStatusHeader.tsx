import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VerificationRecord } from '@/types/idVerification';

interface VerificationStatusHeaderProps {
  record: VerificationRecord;
}

export default function VerificationStatusHeader({ record }: VerificationStatusHeaderProps) {
  const { status, submittedAt, rejectionReason } = record;

  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: 'shield-checkmark' as const,
          iconColor: '#16A34A',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          titleColor: '#065F46',
          subtitleColor: '#047857',
          title: 'Identity Verified',
          subtitle: 'Your CNIC identity verification is active. Job bidding and direct bookings are fully unlocked.',
          badgeBg: '#D1FAE5',
          badgeText: '#065F46',
          badgeLabel: 'VERIFIED PRO',
        };
      case 'pending':
        return {
          icon: 'time' as const,
          iconColor: '#D97706',
          bgColor: '#FEF9C3',
          borderColor: '#FDE047',
          titleColor: '#854D0E',
          subtitleColor: '#A16207',
          title: 'Verification Under Review',
          subtitle: 'Your CNIC photos have been submitted. Our compliance team will verify your details within 1-2 hours.',
          badgeBg: '#FEF08A',
          badgeText: '#854D0E',
          badgeLabel: 'UNDER REVIEW',
        };
      case 'rejected':
        return {
          icon: 'alert-circle' as const,
          iconColor: '#DC2626',
          bgColor: '#FEF2F2',
          borderColor: '#FCA5A5',
          titleColor: '#991B1B',
          subtitleColor: '#B91C1C',
          title: 'Verification Failed',
          subtitle: rejectionReason || 'Your previous ID card submission was declined. Please recapture clear photos.',
          badgeBg: '#FEE2E2',
          badgeText: '#991B1B',
          badgeLabel: 'RE-SUBMISSION REQUIRED',
        };
      default:
        return {
          icon: 'shield-half' as const,
          iconColor: '#2563EB',
          bgColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          titleColor: '#1E40AF',
          subtitleColor: '#1D4ED8',
          title: 'Identity Verification Required',
          subtitle: 'Upload clear photos of your CNIC front and back to start bidding on customer tasks.',
          badgeBg: '#DBEAFE',
          badgeText: '#1E40AF',
          badgeLabel: 'ACTION REQUIRED',
        };
    }
  };

  const config = getStatusConfig();
  const formattedDate = submittedAt ? new Date(submittedAt).toLocaleDateString() : null;

  return (
    <View style={[styles.card, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${config.iconColor}18` }]}>
          <Ionicons name={config.icon} size={24} color={config.iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: config.titleColor }]}>{config.title}</Text>
            <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
              <Text style={[styles.badgeText, { color: config.badgeText }]}>{config.badgeLabel}</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: config.subtitleColor }]}>{config.subtitle}</Text>
          {formattedDate && (
            <Text style={[styles.dateText, { color: config.subtitleColor }]}>Submitted on: {formattedDate}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
});
