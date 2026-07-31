import { fetchWithAuth } from './fetchClient';
import { AdminBidItem } from '@/types/admin';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const getTaskBids = async (taskId: number): Promise<AdminBidItem[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/bidding/task/${taskId}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch bids for task ${taskId}. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};
