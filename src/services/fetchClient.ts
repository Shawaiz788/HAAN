import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

const TIMEOUT_MS = 15000; // 15 seconds timeout
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/** Centralized API base URL — import this instead of recomputing in each service. */
export const API_URL = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';

export const fetchWithTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Connection timed out. The server is not responding. Please check your internet connection or try again later.');
        }
        if (error.message && error.message.includes('Network request failed')) {
            throw new Error('Network connection error. Please make sure the server is running and check your internet connection.');
        }
        throw error;
    }
};

// Helper to request a new access token from the backend refresh token endpoint
export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
    const url = `${API_URL}/app/token/refresh/`;
    logger.log('[fetchClient] Refreshing access token via URL:', url);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
    });

    const responseText = await response.text();
    if (!response.ok) {
        throw new Error(`Token refresh failed. Status: ${response.status}. Response: ${responseText}`);
    }

    try {
        const data = JSON.parse(responseText);
        const newAccessToken = data.access || data.access_token || data.token;
        if (!newAccessToken) {
            throw new Error('No access token returned from refresh API');
        }
        return newAccessToken;
    } catch (e) {
        throw new Error(`Failed to parse token refresh response. Content: ${responseText}`);
    }
};

/**
 * Refreshes the access token, persists it to SecureStore, and syncs the user session.
 * Shared by proactive (30-min) and reactive (401) refresh flows.
 */
const refreshAndPersistToken = async (refreshToken: string): Promise<string> => {
    const newAccessToken = await refreshAccessToken(refreshToken);
    const now = Date.now();

    await SecureStore.setItemAsync('user_token', newAccessToken);
    await SecureStore.setItemAsync('user_token_saved_at', now.toString());

    // Keep the user_session payload synchronized
    const sessionStr = await SecureStore.getItemAsync('user_session');
    if (sessionStr) {
        const sessionUser = JSON.parse(sessionStr);
        sessionUser.token = newAccessToken;
        await SecureStore.setItemAsync('user_session', JSON.stringify(sessionUser));
    }

    return newAccessToken;
};

// Helper to construct Authorization header using JWT token from SecureStore (with automatic background refresh)
export const getAuthHeaders = async (extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
    let token = await SecureStore.getItemAsync('user_token');
    const savedAtStr = await SecureStore.getItemAsync('user_token_saved_at');
    const refreshToken = await SecureStore.getItemAsync('user_refresh_token');

    if (token && savedAtStr && refreshToken) {
        const savedAt = parseInt(savedAtStr, 10);
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;

        if (now - savedAt > thirtyMinutes) {
            logger.log('[fetchClient] JWT access token is older than 30 minutes. Triggering refresh...');
            try {
                token = await refreshAndPersistToken(refreshToken);
            } catch (err) {
                logger.error('[fetchClient] Background JWT token refresh failed. Proceeding with old token:', err);
            }
        }
    }

    const headers: Record<string, string> = { ...extraHeaders };
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Wrapper around fetch that intercepts 401 errors, auto-refreshes the token, and retries the call once
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const authHeaders = await getAuthHeaders(options.headers as Record<string, string>);
    const method = (options.method || 'GET').toUpperCase();
    const isIdempotent = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'].includes(method);

    // Make original request — only retry network errors for idempotent methods to prevent duplicate POSTs
    let response: Response;
    try {
        response = await fetchWithTimeout(url, {
            ...options,
            headers: authHeaders,
        });
    } catch (netErr: any) {
        if (isIdempotent) {
            logger.warn(`[fetchClient] Retrying ${method} ${url} (${netErr?.message || String(netErr)})`);
            response = await fetchWithTimeout(url, {
                ...options,
                headers: authHeaders,
            });
        } else {
            throw netErr;
        }
    }

    // If unauthorized (401), perform a token refresh and retry once
    if (response.status === 401) {
        logger.log('[fetchClient] Access token invalid/expired (401). Attempting refresh...');
        const refreshToken = await SecureStore.getItemAsync('user_refresh_token');

        if (refreshToken) {
            try {
                const newAccessToken = await refreshAndPersistToken(refreshToken);

                const retryHeaders = {
                    ...options.headers,
                    'Authorization': `Bearer ${newAccessToken}`,
                };

                logger.log('[fetchClient] Retrying failed request with new access token...');
                response = await fetchWithTimeout(url, {
                    ...options,
                    headers: retryHeaders,
                });
            } catch (refreshErr) {
                logger.error('[fetchClient] Background token refresh retry failed:', refreshErr);
            }
        }
    }

    return response;
};
