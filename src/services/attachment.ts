import { fetchWithAuth } from './fetchClient';
import { AdminAttachmentItem } from '@/types/admin';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const getAllAttachments = async (): Promise<AdminAttachmentItem[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/attachment/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch attachments list. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};

export const getAttachmentById = async (id: number): Promise<AdminAttachmentItem | null> => {
  const response = await fetchWithAuth(`${API_URL}/v1/attachment/${id}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch attachment ${id}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const getTaskAttachments = async (taskId: number): Promise<AdminAttachmentItem[]> => {
  const response = await fetchWithAuth(`${API_URL}/v1/attachment/${taskId}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch task attachments (${taskId}). Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};

export const deleteAttachment = async (id: number): Promise<boolean> => {
  const response = await fetchWithAuth(`${API_URL}/v1/attachment/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete attachment ${id}. Status: ${response.status}`);
  }
  return true;
};

export const updateAttachment = async (id: number, payload: Partial<AdminAttachmentItem>): Promise<AdminAttachmentItem> => {
  const response = await fetchWithAuth(`${API_URL}/v1/attachment/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update attachment ${id}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};
