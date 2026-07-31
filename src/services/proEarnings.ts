import { fetchWithAuth, API_URL } from './fetchClient';
import { ProEarnings } from '@/types';
import { logger } from '@/utils/logger';

export const createProEarnings = async (workerId: number | string): Promise<ProEarnings> => {
    //  logger.log(`[proEarnings API] Creating earnings entry for worker ID: ${workerId}`);
    const response = await fetchWithAuth(`${API_URL}/v1/professional/earning/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            worker_id: Number(workerId),
        }),
    });

    const responseText = await response.text();
    //logger.log('[proEarnings API] Create pro earnings response status:', response.status);

    if (!response.ok) {
        throw new Error(`Failed to create earnings entry. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse create earnings response. Content: ${responseText}`);
    }
};

export const getProEarnings = async (workerId: number | string): Promise<ProEarnings> => {
    // logger.log(`[proEarnings API] Fetching earnings for worker ID: ${workerId}`);
    const response = await fetchWithAuth(`${API_URL}/v1/professional/earning/${workerId}/`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    const responseText = await response.text();
    //  logger.log('[proEarnings API] Get pro earnings response status:', response.status);

    if (!response.ok) {
        if (response.status === 404 || responseText.includes('No WorkerEarnings matches')) {
            // logger.log(`[proEarnings API] 404 received. Creating worker earnings record for ID ${workerId}...`);
            try {
                return await createProEarnings(workerId);
            } catch (createErr) {
                //  logger.error('[proEarnings API] Fallback earnings creation failed:', createErr);
                return {
                    id: 0,
                    worker_id: Number(workerId),
                    daily_earning: 0,
                    weekly_earning: 0,
                    total_earning: 0,
                    jobs_done: 0,
                    total_jobs_done: 0,
                    daily_jobs_done: 0,
                    updated_at: new Date().toISOString(),
                } as unknown as ProEarnings;
            }
        }
        throw new Error(`Failed to fetch earnings details. Status: ${response.status}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse professional earnings response. Content: ${responseText}`);
    }
};
