import { Platform, ToastAndroid, Alert } from 'react-native';
import { logger } from '@/utils/logger';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const WS_BASE = BASE_URL
    .replace(/\/$/, '')
    .replace(/^https/, 'wss')
    .replace(/^http/, 'ws');

function showFeedback(message: string) {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
        Alert.alert('', message);
    }
}

/**
 * Sends a quick bid via WebSocket, automatically retrying connections
 * until confirmed or max timeout is reached.
 */
export async function sendQuickBidViaWebSocket(
    taskId: number | string,
    userId: number | string,
    price: number,
    estimatedHours: number = 1
): Promise<void> {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        let ws: WebSocket | null = null;
        let retryTimer: NodeJS.Timeout | null = null;
        let overallTimeoutId: NodeJS.Timeout | null = null;
        let attempt = 0;
        const maxTimeoutMs = 15000;

        const payload = { type: 'place_bid', user_id: userId, price, estimated_hours: estimatedHours };

        const cleanup = () => {
            if (overallTimeoutId) clearTimeout(overallTimeoutId);
            if (retryTimer) clearTimeout(retryTimer);
            if (ws) {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                try { ws.close(1000); } catch (e) {}
                ws = null;
            }
        };

        overallTimeoutId = setTimeout(() => {
            if (!isSettled) {
                logger.warn('[sendQuickBidViaWebSocket] Timeout (15s) waiting for bid confirmation.');
                isSettled = true;
                cleanup();
                showFeedback('Network error. Could not place bid after multiple attempts.');
                reject(new Error('Response timeout from server.'));
            }
        }, maxTimeoutMs);

        const tryConnect = () => {
            if (isSettled) return;
            attempt++;
            const url = `${WS_BASE}/ws/bidding/${taskId}/`;
            logger.log(`[sendQuickBidViaWebSocket] Quick bid attempt ${attempt} connecting to:`, url);

            if (ws) {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                try { ws.close(1000); } catch (e) {}
                ws = null;
            }

            try {
                ws = new WebSocket(url);

                ws.onopen = () => {
                    logger.log('[sendQuickBidViaWebSocket] Socket open. Transmitting payload:', payload);
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(payload));
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        logger.log('[sendQuickBidViaWebSocket] Message received:', data);
                        if (data.type === 'bid_placed' && String(data.bid?.user_id) === String(userId)) {
                            if (!isSettled) {
                                isSettled = true;
                                cleanup();
                                resolve();
                            }
                        } else if (data.type === 'bidding_closed') {
                            if (!isSettled) {
                                isSettled = true;
                                cleanup();
                                showFeedback('Bidding is closed for this task.');
                                reject(new Error('Bidding is closed for this task.'));
                            }
                        }
                    } catch (e) {
                        logger.warn('[sendQuickBidViaWebSocket] Error parsing response message:', e);
                    }
                };

                ws.onerror = (err) => {
                    logger.warn(`[sendQuickBidViaWebSocket] Socket error on attempt ${attempt}:`, err);
                    scheduleRetry();
                };

                ws.onclose = (event) => {
                    logger.log(`[sendQuickBidViaWebSocket] Socket closed on attempt ${attempt}. Code: ${event.code}`);
                    scheduleRetry();
                };
            } catch (e) {
                logger.warn(`[sendQuickBidViaWebSocket] Failed to initiate socket on attempt ${attempt}:`, e);
                scheduleRetry();
            }
        };

        const scheduleRetry = () => {
            if (isSettled) return;
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
                if (!isSettled) {
                    logger.log('[sendQuickBidViaWebSocket] Retrying quick bid connection...');
                    tryConnect();
                }
            }, 1000);
        };

        tryConnect();
    });
}
