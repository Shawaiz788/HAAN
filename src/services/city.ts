import { fetchWithTimeout, API_URL } from './fetchClient';
import { City } from '@/types';
import { logger } from '@/utils/logger';
export { City };

export const getCities = async (): Promise<City[]> => {
    logger.log('[city API] Fetching cities from API...');
    const response = await fetchWithTimeout(`${API_URL}/app/city/`);
    const data = await response.json();
    logger.log('[city API] Raw response:', JSON.stringify(data)?.slice(0, 200));

    if (data && !Array.isArray(data) && Array.isArray(data.results)) {
        return data.results;
    }
    return Array.isArray(data) ? data : [];
};

export const createCity = async (countryId: number, name: string): Promise<City> => {
    const response = await fetchWithTimeout(`${API_URL}/app/city/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, country: countryId }),
    });
    return response.json();
};