import { fetchWithTimeout, API_URL } from './fetchClient';
import { City } from '@/types';
import {
  getCachedCities,
  setCachedCities,
  appendCachedCity,
  isGeoCacheStale,
} from '@/store/geoCacheStore';
import { logger } from '@/utils/logger';

export { City };

export const getCities = async (forceRefresh: boolean = false): Promise<City[]> => {
  const cached = getCachedCities();

  // If cached cities exist and cache is fresh, return immediately (0ms delay)
  if (cached.length > 0 && !forceRefresh && !isGeoCacheStale()) {
    logger.log(`[city API] ⚡ Returning ${cached.length} cities instantly from MMKV cache`);
    return cached;
  }

  // If cached cities exist but stale, trigger non-blocking background sync
  if (cached.length > 0 && !forceRefresh) {
    logger.log(`[city API] ⚡ Returning ${cached.length} cached cities & triggering background sync`);
    fetchCitiesFromApiAndCache().catch((err) =>
      logger.warn('[city API] Background city sync warning:', err)
    );
    return cached;
  }

  // Synchronous fetch if no cache or forceRefresh
  return fetchCitiesFromApiAndCache();
};

const fetchCitiesFromApiAndCache = async (): Promise<City[]> => {
  logger.log('[city API] Fetching cities from backend API...');
  const response = await fetchWithTimeout(`${API_URL}/app/city/`);
  const data = await response.json();

  let list: City[] = [];
  if (data && !Array.isArray(data) && Array.isArray(data.results)) {
    list = data.results;
  } else if (Array.isArray(data)) {
    list = data;
  }

  if (list.length > 0) {
    setCachedCities(list);
  }
  return list;
};

export const createCity = async (countryId: number, name: string): Promise<City> => {
  logger.log(`[city API] Creating city: "${name}" for country: ${countryId}`);
  const response = await fetchWithTimeout(`${API_URL}/app/city/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, country: countryId }),
  });
  const newCity: City = await response.json();
  if (newCity && newCity.id) {
    appendCachedCity(newCity);
  }
  return newCity;
};