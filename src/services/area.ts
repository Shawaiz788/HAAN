const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';
import { fetchWithTimeout } from './fetchClient';
import { Area } from '@/types';
export { Area };

export const getAreas = async (): Promise<Area[]> => {
    console.log('[area API] Fetching areas from API...');
    const response = await fetchWithTimeout(`${API_URL}/app/area/`);

    const data = await response.json();
    console.log('[area API] Raw response:', JSON.stringify(data)?.slice(0, 200));

    // Handle both paginated { results: [] } and plain array responses
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
