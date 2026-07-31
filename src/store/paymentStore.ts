import { createMMKV } from 'react-native-mmkv';
import { getPaymentPreferencesFromBackend } from '@/services/task';
import { PaymentPreference } from '@/types';

const storage = createMMKV({ id: 'payment-preferences-storage' });

export const getCachedPaymentPreferences = (): PaymentPreference[] => {
  try {
    const raw = storage.getString('payment_preferences');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[paymentStore] Error reading cached payment preferences:', e);
  }
  return [];
};

export const syncPaymentPreferences = async (): Promise<PaymentPreference[]> => {
  try {
    const data = await getPaymentPreferencesFromBackend();
    if (data && Array.isArray(data) && data.length > 0) {
      storage.set('payment_preferences', JSON.stringify(data));
      return data;
    }
  } catch (e: any) {
    if (!e?.message?.includes('403') && !e?.message?.includes('not verified')) {
      console.error('[paymentStore] Error syncing payment preferences from backend:', e);
    }
  }
  return getCachedPaymentPreferences();
};

export const getPaymentPreferenceName = (id: number | undefined | null): string => {
  if (id === undefined || id === null) return 'Cash';
  const list = getCachedPaymentPreferences();
  const pref = list.find((p) => Number(p.id) === Number(id));
  return pref ? pref.name : 'Cash';
};

export const getPaymentPrefStyle = (name: string) => {
  const normalized = (name || '').trim().toLowerCase();
  const stylesMap: Record<string, { icon: string; logoColor: string }> = {
    'cash': { icon: 'cash-outline', logoColor: '#059669' },
    'jazzcash': { icon: 'wallet-outline', logoColor: '#EAB308' },
    'easypaisa': { icon: 'card-outline', logoColor: '#2563EB' },
  };

  if (stylesMap[normalized]) return stylesMap[normalized];

  for (const key of Object.keys(stylesMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return stylesMap[key];
    }
  }

  return { icon: 'card-outline', logoColor: '#6B7280' };
};

export const getPaymentPrefStyleById = (id: number | undefined | null) => {
  const name = getPaymentPreferenceName(id);
  return {
    name,
    ...getPaymentPrefStyle(name),
  };
};
