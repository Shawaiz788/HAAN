import { fetchWithAuth, API_URL } from './fetchClient';
import { logger } from '@/utils/logger';

export interface ChatStatusResponse {
  is_open: boolean;
  message?: string;
}

export interface ChatMessageItem {
  id: number | string;
  room_id?: number | string;
  sender_id: number | string;
  sender_name?: string;
  body: string;
  sequence: number;
  reply_to?: number | string | null;
  created_at?: string;
}

export interface PaginatedMessagesResponse {
  results: ChatMessageItem[];
  next: string | null;
  previous: string | null;
  count?: number;
}

/**
 * Pre-flight check to verify if chat room is open for a task
 */
export const checkChatStatus = async (
  taskId: number | string,
  token?: string
): Promise<ChatStatusResponse> => {
  logger.log(`[chat API] Checking chat status for task ID: ${taskId}`);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchWithAuth(`${API_URL}/messages/room/${taskId}/status/`, {
    method: 'GET',
    headers,
  });

  const responseText = await response.text();
  logger.log('[chat API] Check chat status response status:', response.status);

  if (!response.ok) {
    if (response.status === 404 || response.status === 403) {
      return { is_open: false, message: 'Chat is not available for this task.' };
    }
    throw new Error(`Failed to check chat status (${response.status}): ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse chat status response: ${responseText}`);
  }
};

/**
 * Fetch paginated historical messages before a specific sequence ID
 */
export const fetchOlderMessages = async (
  taskId: number | string,
  beforeSequence: number,
  token?: string
): Promise<PaginatedMessagesResponse> => {
  logger.log(`[chat API] Fetching messages before sequence ${beforeSequence} for task ${taskId}`);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}/messages/?room_id=${taskId}&before=${beforeSequence}`;
  const response = await fetchWithAuth(url, {
    method: 'GET',
    headers,
  });

  const responseText = await response.text();
  logger.log('[chat API] Fetch older messages status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to fetch older messages (${response.status}): ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse paginated messages JSON: ${responseText}`);
  }
};
