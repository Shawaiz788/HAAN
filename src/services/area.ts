import { fetchWithTimeout, API_URL } from './fetchClient';
import { Area } from '@/types';
import { logger } from '@/utils/logger';
export { Area };

export const getAreas = async (): Promise<Area[]> => {
    logger.log('[area API] Fetching areas from API...');
    const response = await fetchWithTimeout(`${API_URL}/app/area/`);

    const data = await response.json();
    logger.log('[area API] Raw response:', JSON.stringify(data)?.slice(0, 200));

    if (data && !Array.isArray(data) && Array.isArray(data.results)) {
        return data.results;
    }
    return Array.isArray(data) ? data : [];
};

export const createArea = async (cityId: number, name: string): Promise<Area> => {
    const response = await fetchWithTimeout(`${API_URL}/app/area/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, city_id: cityId }),
    });
    return response.json();
};
