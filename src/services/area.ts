import { fetchWithTimeout, API_URL } from './fetchClient';
import { Area } from '@/types';
import {
  getCachedAreas,
  setCachedAreas,
  appendCachedArea,
  isGeoCacheStale,
} from '@/store/geoCacheStore';
import { logger } from '@/utils/logger';

export { Area };

export const getAreas = async (forceRefresh: boolean = false): Promise<Area[]> => {
  const cached = getCachedAreas();

  // If cached areas exist and cache is fresh, return immediately (0ms delay)
  if (cached.length > 0 && !forceRefresh && !isGeoCacheStale()) {
    //logger.log(`[area API] ⚡ Returning ${cached.length} areas instantly from MMKV cache`);
    return cached;
  }

  // If cached areas exist but stale, trigger non-blocking background sync
  if (cached.length > 0 && !forceRefresh) {
    // logger.log(`[area API] ⚡ Returning ${cached.length} cached areas & triggering background sync`);
    fetchAreasFromApiAndCache().catch((err) =>
      logger.warn('[area API] Background area sync warning:', err)
    );
    return cached;
  }

  // Synchronous fetch if no cache or forceRefresh
  return fetchAreasFromApiAndCache();
};

const fetchAreasFromApiAndCache = async (): Promise<Area[]> => {
  logger.log('[area API] Fetching areas from backend API...');
  const response = await fetchWithTimeout(`${API_URL}/v1/area/`);
  const data = await response.json();

  let list: Area[] = [];
  if (data && !Array.isArray(data) && Array.isArray(data.results)) {
    list = data.results;
  } else if (Array.isArray(data)) {
    list = data;
  }

  if (list.length > 0) {
    setCachedAreas(list);
  }
  return list;
};

export const createArea = async (cityId: number, name: string): Promise<Area> => {
  logger.log(`[area API] Creating area: "${name}" for city: ${cityId}`);
  const response = await fetchWithTimeout(`${API_URL}/v1/area/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, city_id: cityId }),
  });
  const newArea: Area = await response.json();
  if (newArea && newArea.id) {
    appendCachedArea(newArea);
  }
  return newArea;
};
