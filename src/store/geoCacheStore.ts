import { createMMKV } from 'react-native-mmkv';
import { City, Area, Country } from '@/types';
import { logger } from '@/utils/logger';

const geoStorage = createMMKV({ id: 'geo_cache_storage' });

// Default TTL set to 12 Hours (12 * 60 * 60 * 1000 ms)
export const GEO_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const KEYS = {
  CITIES: 'cached_cities_v1',
  AREAS: 'cached_areas_v1',
  COUNTRIES: 'cached_countries_v1',
  LAST_SYNC: 'geo_cache_last_sync_timestamp',
};

export const getCachedCities = (): City[] => {
  try {
    const raw = geoStorage.getString(KEYS.CITIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('[geoCacheStore] Error reading cached cities:', err);
    return [];
  }
};

export const setCachedCities = (cities: City[]): void => {
  try {
    geoStorage.set(KEYS.CITIES, JSON.stringify(cities));
    touchGeoCacheTimestamp();
    logger.log(`[geoCacheStore] 💾 Cached ${cities.length} cities in MMKV`);
  } catch (err) {
    logger.error('[geoCacheStore] Error saving cities to MMKV:', err);
  }
};

export const appendCachedCity = (city: City): void => {
  try {
    const existing = getCachedCities();
    const index = existing.findIndex((c) => c.id === city.id || c.name.toLowerCase() === city.name.toLowerCase());
    if (index >= 0) {
      existing[index] = { ...existing[index], ...city };
    } else {
      existing.push(city);
    }
    setCachedCities(existing);
  } catch (err) {
    logger.error('[geoCacheStore] Error appending city to MMKV:', err);
  }
};

export const getCachedAreas = (): Area[] => {
  try {
    const raw = geoStorage.getString(KEYS.AREAS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('[geoCacheStore] Error reading cached areas:', err);
    return [];
  }
};

export const setCachedAreas = (areas: Area[]): void => {
  try {
    geoStorage.set(KEYS.AREAS, JSON.stringify(areas));
    touchGeoCacheTimestamp();
    logger.log(`[geoCacheStore] 💾 Cached ${areas.length} areas in MMKV`);
  } catch (err) {
    logger.error('[geoCacheStore] Error saving areas to MMKV:', err);
  }
};

export const appendCachedArea = (area: Area): void => {
  try {
    const existing = getCachedAreas();
    const index = existing.findIndex((a) => a.id === area.id || a.name.toLowerCase() === area.name.toLowerCase());
    if (index >= 0) {
      existing[index] = { ...existing[index], ...area };
    } else {
      existing.push(area);
    }
    setCachedAreas(existing);
  } catch (err) {
    logger.error('[geoCacheStore] Error appending area to MMKV:', err);
  }
};

export const getCachedCountries = (): Country[] => {
  try {
    const raw = geoStorage.getString(KEYS.COUNTRIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('[geoCacheStore] Error reading cached countries:', err);
    return [];
  }
};

export const setCachedCountries = (countries: Country[]): void => {
  try {
    geoStorage.set(KEYS.COUNTRIES, JSON.stringify(countries));
    touchGeoCacheTimestamp();
    logger.log(`[geoCacheStore] 💾 Cached ${countries.length} countries in MMKV`);
  } catch (err) {
    logger.error('[geoCacheStore] Error saving countries to MMKV:', err);
  }
};

export const appendCachedCountry = (country: Country): void => {
  try {
    const existing = getCachedCountries();
    const index = existing.findIndex((c) => c.id === country.id || c.name.toLowerCase() === country.name.toLowerCase());
    if (index >= 0) {
      existing[index] = { ...existing[index], ...country };
    } else {
      existing.push(country);
    }
    setCachedCountries(existing);
  } catch (err) {
    logger.error('[geoCacheStore] Error appending country to MMKV:', err);
  }
};

export const getLastSyncTimestamp = (): number => {
  try {
    return geoStorage.getNumber(KEYS.LAST_SYNC) || 0;
  } catch {
    return 0;
  }
};

export const touchGeoCacheTimestamp = (): void => {
  try {
    geoStorage.set(KEYS.LAST_SYNC, Date.now());
  } catch (err) {
    logger.error('[geoCacheStore] Error setting timestamp in MMKV:', err);
  }
};

export const isGeoCacheStale = (ttlMs: number = GEO_CACHE_TTL_MS): boolean => {
  const lastSync = getLastSyncTimestamp();
  if (!lastSync) return true;
  const elapsed = Date.now() - lastSync;
  return elapsed > ttlMs;
};
