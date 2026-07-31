import { fetchWithAuth } from './fetchClient';
import { ReviewInput, ReviewResponse } from '@/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const createReview = async (review: ReviewInput): Promise<ReviewResponse> => {
  console.log('[review API] Submitting review payload to backend:', review);
  const url = `${API_URL}/v1/review/`;

  const payload = {
    user_id: review.user_id,
    task_id: review.task_id,
    given_by: review.given_by,
    body: review.body,
    rating: review.rating,
    attachment_id: review.attachment_id ?? null,
  };

  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log('[review API] Create review response status:', response.status);
  console.log('[review API] Create review response body:', responseText);

  if (!response.ok) {
    throw new Error(`Failed to submit review. Status: ${response.status}. Response: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { id: Date.now(), ...review };
  }
};
