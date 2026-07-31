import { fetchWithAuth } from './fetchClient';
import { AdminEarningItem } from '@/types/admin';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const getAllEarnings = async (): Promise<AdminEarningItem[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/professional/earning/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch earnings list. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};

export const createEarning = async (payload: Partial<AdminEarningItem>): Promise<AdminEarningItem> => {
  const response = await fetchWithAuth(`${API_URL}/v1/professional/earning/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to create earning record. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const getWorkerEarnings = async (workerId: number | string): Promise<AdminEarningItem | null> => {
  const response = await fetchWithAuth(`${API_URL}/v1/professional/earning/${workerId}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch earnings for worker ${workerId}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const updateWorkerEarnings = async (
  workerId: number | string,
  payload: Partial<AdminEarningItem>
): Promise<AdminEarningItem> => {
  const response = await fetchWithAuth(`${API_URL}/v1/professional/earning/${workerId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update earnings for worker ${workerId}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const deleteWorkerEarnings = async (workerId: number | string): Promise<boolean> => {
  const response = await fetchWithAuth(`${API_URL}/v1/professional/earning/${workerId}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete earnings for worker ${workerId}. Status: ${response.status}`);
  }
  return true;
};
