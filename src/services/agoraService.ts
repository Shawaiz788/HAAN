import { fetchWithTimeout, API_URL } from './fetchClient';
import { logger } from '@/utils/logger';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '2bda4e2f148148928cc66f14545f6136';

export interface AgoraCallTokenResponse {
  token: string;
  channel_name?: string;
  app_id?: string;
}

/**
 * Fetch dynamic Agora RTC Token & call metadata for a task room from backend:
 * GET ${API_URL}/app/message/room/${taskId}/call-token/
 */
export async function fetchAgoraCallToken(
  taskId: number | string,
  userToken?: string
): Promise<AgoraCallTokenResponse> {
  try {
    const fullUrl = `${API_URL}/app/message/room/${taskId}/call-token/`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
    }

    logger.log(`[agoraService] Fetching call token from: ${fullUrl}`);
    const res = await fetchWithTimeout(fullUrl, { method: 'GET', headers });
    if (!res.ok) {
      const errText = await res.text();
      logger.warn(`[agoraService] Call token HTTP error ${res.status}:`, errText);
      return { token: '' };
    }

    const data = await res.json();
    logger.log(`[agoraService] Received call token response for task ${taskId}:`, {
      hasToken: Boolean(data.token),
      channel_name: data.channel_name,
      app_id: data.app_id,
    });

    return {
      token: data.token || '',
      channel_name: data.channel_name || `task_${taskId}_call`,
      app_id: data.app_id || AGORA_APP_ID,
    };
  } catch (err: any) {
    logger.warn('[agoraService] Failed to fetch call token:', err?.message || err);
    return { token: '' };
  }
}

/**
 * Legacy compatibility helper
 */
export async function getAgoraRtcToken(
  channelName: string,
  userToken?: string
): Promise<string> {
  const match = channelName.match(/\d+/);
  const taskId = match ? match[0] : channelName;
  const res = await fetchAgoraCallToken(taskId, userToken);
  return res.token;
}

export function getAgoraAppId(): string {
  return AGORA_APP_ID;
}
