import { fetchWithTimeout, API_URL } from './fetchClient';
import { Country } from '@/types';
import {
  getCachedCountries,
  setCachedCountries,
  appendCachedCountry,
  isGeoCacheStale,
} from '@/store/geoCacheStore';
import { logger } from '@/utils/logger';

export const getCountries = async (forceRefresh: boolean = false): Promise<Country[]> => {
  const cached = getCachedCountries();

  // Return immediately if cache exists and not stale
  if (cached.length > 0 && !forceRefresh && !isGeoCacheStale()) {
    logger.log(`[country API] ⚡ Returning ${cached.length} countries instantly from MMKV cache`);
    return cached;
  }

  // Return cache immediately & sync in background if stale
  if (cached.length > 0 && !forceRefresh) {
    logger.log(`[country API] ⚡ Returning ${cached.length} cached countries & triggering background sync`);
    fetchCountriesFromApiAndCache().catch((err) =>
      logger.warn('[country API] Background country sync warning:', err)
    );
    return cached;
  }

  return fetchCountriesFromApiAndCache();
};

const fetchCountriesFromApiAndCache = async (): Promise<Country[]> => {
  logger.log('[country API] Fetching countries from backend API...');
  const response = await fetchWithTimeout(`${API_URL}/v1/country/`);
  const data = await response.json();

  let list: Country[] = [];
  if (data && !Array.isArray(data) && Array.isArray(data.results)) {
    list = data.results;
  } else if (Array.isArray(data)) {
    list = data;
  }

  if (list.length > 0) {
    setCachedCountries(list);
  }
  return list;
};

export const createCountry = async (name: string): Promise<Country> => {
  logger.log(`[country API] Creating country: "${name}"`);
  const response = await fetchWithTimeout(`${API_URL}/v1/country/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  const newCountry: Country = await response.json();
  if (newCountry && newCountry.id) {
    appendCachedCountry(newCountry);
  }
  return newCountry;
};
