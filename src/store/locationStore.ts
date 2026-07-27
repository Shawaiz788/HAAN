import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

export interface CachedLocation {
  latitude: number;
  longitude: number;
  address: string;
  street?: string;
  area?: string;
  city?: string;
}

const DEFAULT_LOCATION: CachedLocation = {
  latitude: 31.5204,
  longitude: 74.3587,
  address: 'Lahore, Pakistan',
};

export const getCachedLocation = (userId?: number | null): CachedLocation => {
  const key = userId ? `last_location_user_${userId}` : 'last_location_guest';
  try {
    const json = storage.getString(key);
    if (json) {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[locationStore] Error reading MMKV location:', e);
  }
  return DEFAULT_LOCATION;
};

export const setCachedLocation = (location: CachedLocation, userId?: number | null): void => {
  const key = userId ? `last_location_user_${userId}` : 'last_location_guest';
  try {
    storage.set(key, JSON.stringify(location));
  } catch (e) {
    console.error('[locationStore] Error saving MMKV location:', e);
  }
};
