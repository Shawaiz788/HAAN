import { fetchWithAuth, fetchWithTimeout } from './fetchClient';
import { CustomerProfile } from '@/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const getCustomerProfile = async (id: number): Promise<CustomerProfile> => {
    console.log(`[customer API] Fetching customer profile for ID: ${id}`);
    const url = `${API_URL}/v1/profile/${id}/`;

    const response = await fetchWithAuth(url);
    const responseText = await response.text();
    console.log(`[customer API] Response Status for ID ${id}:`, response.status);

    if (!response.ok) {
        throw new Error(`Failed to fetch customer profile for ID ${id}. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse customer profile JSON for ID ${id}. Content: ${responseText}`);
    }
};

export const normalizeImageUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('file://') ||
        trimmed.startsWith('data:')
    ) {
        return trimmed;
    }
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_URL}${cleanPath}`;
};
