import { fetchWithAuth, API_URL } from './fetchClient';
import { AdminReviewItem } from '@/types/admin';

export const getAllReviews = async (): Promise<AdminReviewItem[]> => {
  const response = await fetchWithAuth(`${API_URL}/app/review/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch reviews. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};

export const createReview = async (payload: Partial<AdminReviewItem>): Promise<AdminReviewItem> => {
  const response = await fetchWithAuth(`${API_URL}/app/review/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to create review. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const getReviewById = async (id: number): Promise<AdminReviewItem | null> => {
  const response = await fetchWithAuth(`${API_URL}/app/review/${id}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch review ${id}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const updateReview = async (id: number, payload: Partial<AdminReviewItem>): Promise<AdminReviewItem> => {
  const response = await fetchWithAuth(`${API_URL}/app/review/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to update review ${id}. Status: ${response.status}`);
  }
  return JSON.parse(text);
};

export const deleteReview = async (id: number): Promise<boolean> => {
  const response = await fetchWithAuth(`${API_URL}/app/review/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete review ${id}. Status: ${response.status}`);
  }
  return true;
};

export const getCustomerReviews = async (userId: number): Promise<AdminReviewItem[]> => {
  const response = await fetchWithAuth(`${API_URL}/app/review/customer/${userId}/`);
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch customer reviews. Status: ${response.status}`);
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.results || [];
};
