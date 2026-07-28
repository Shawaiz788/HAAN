import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, ToastAndroid, Alert, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getCustomerProfile, normalizeImageUrl } from '@/services/customer';
import { useAuth } from '@/context/auth';
import { USER_TYPE_CLIENT } from '@/constants/userTypes';
import { logger } from '@/utils/logger';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const WS_BASE = BASE_URL
    .replace(/\/$/, '')
    .replace(/^https/, 'wss')
    .replace(/^http/, 'ws');

export interface BidsWSBid {
    id: number | string;
    task_id: number | string;
    user_id: number | string;
    price: number;
    estimated_hours?: number;
    is_accepted?: boolean;
    created_at?: string;
    user_name?: string;
    user_avatar?: string;
    user_rating?: number;
    phone_number?: string;
    is_profile_loading?: boolean;
}

export type BidsWSMessage =
    | { type: 'bidding_closed'; message?: string }
    | { type: 'bid_history'; bids: BidsWSBid[] }
    | { type: 'bid_placed'; bid: BidsWSBid }
    | { type: 'bid_accepted'; bid: BidsWSBid }
    | { type: 'heartbeat' | 'ping' };

export type WSBiddingStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface UseBiddingWebSocketOptions {
    taskId: number | string | undefined | null;
    userId: number | string | undefined | null;
    isCustomer?: boolean;
    enabled?: boolean;
    token?: string;
    onBidAccepted?: (bid: BidsWSBid) => void;
    onTaskAssignedToOther?: (taskId: number) => void;
}

export interface UseBiddingWebSocketResult {
    bids: BidsWSBid[];
    isBiddingClosed: boolean;
    winningBid: BidsWSBid | null;
    wsStatus: WSBiddingStatus;
    placeBid: (price: number, estimatedHours?: number) => void;
    acceptBid: (bidId: number | string) => void;
    closeSocket: () => void;
}

export async function sendQuickBidViaWebSocket(
    taskId: number | string,
    userId: number | string,
    price: number,
    estimatedHours: number = 1
): Promise<void> {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        let ws: WebSocket | null = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (ws) {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                try { ws.close(1000); } catch (e) {}
                ws = null;
            }
        };

        const timeoutId = setTimeout(() => {
            if (!isSettled) {
                logger.warn('[sendQuickBidViaWebSocket] Timeout waiting for bid confirmation.');
                isSettled = true;
                cleanup();
                reject(new Error('Response timeout from server.'));
            }
        }, 6000);

        try {
            const url = `${WS_BASE}/ws/bidding/${taskId}/`;
            logger.log('[sendQuickBidViaWebSocket] Opening quick socket connection to:', url);
            ws = new WebSocket(url);

            ws.onopen = () => {
                const payload = { type: 'place_bid', user_id: userId, price, estimated_hours: estimatedHours };
                logger.log('[sendQuickBidViaWebSocket] Sending payload:', payload);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(payload));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    logger.log('[sendQuickBidViaWebSocket] Received message:', data);
                    if (data.type === 'bid_placed' && String(data.bid?.user_id) === String(userId)) {
                        if (!isSettled) { isSettled = true; cleanup(); resolve(); }
                    } else if (data.type === 'bidding_closed') {
                        if (!isSettled) { isSettled = true; cleanup(); reject(new Error('Bidding is closed for this task.')); }
                    }
                } catch (e) {
                    logger.warn('[sendQuickBidViaWebSocket] Error parsing response message:', e);
                }
            };

            ws.onerror = (err) => {
                logger.error('[sendQuickBidViaWebSocket] Quick bid socket error:', err);
                if (!isSettled) { isSettled = true; cleanup(); reject(err); }
            };

            ws.onclose = (event) => {
                logger.log(`[sendQuickBidViaWebSocket] Quick bid socket closed. Code: ${event.code}`);
                if (!isSettled) { isSettled = true; cleanup(); reject(new Error(`Connection closed. Code: ${event.code}`)); }
            };
        } catch (e) {
            if (!isSettled) { isSettled = true; cleanup(); reject(e); }
        }
    });
}

const MAX_RETRY_DELAY_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 1_000;

function showFeedback(message: string) {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
        Alert.alert('', message);
    }
}

export function useBiddingWebSocket({
    taskId,
    userId: passedUserId,
    isCustomer: passedIsCustomer,
    enabled = true,
    token,
    onBidAccepted,
    onTaskAssignedToOther,
}: UseBiddingWebSocketOptions): UseBiddingWebSocketResult {
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const userId = passedUserId ?? user?.id;
    const isCustomer = passedIsCustomer ?? (user?.usertype_id === USER_TYPE_CLIENT);
    const [bids, setBids] = useState<BidsWSBid[]>([]);
    const [isBiddingClosed, setIsBiddingClosed] = useState(false);
    const [winningBid, setWinningBid] = useState<BidsWSBid | null>(null);
    const [wsStatus, setWsStatus] = useState<WSBiddingStatus>('disconnected');

    const wsRef = useRef<WebSocket | null>(null);
    const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const shouldConnectRef = useRef(false);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    const isCustomerRef = useRef(isCustomer);
    isCustomerRef.current = isCustomer;

    const userIdRef = useRef(userId);
    userIdRef.current = userId;

    const tokenRef = useRef(token);
    tokenRef.current = token;

    const onBidAcceptedRef = useRef(onBidAccepted);
    onBidAcceptedRef.current = onBidAccepted;

    const onTaskAssignedToOtherRef = useRef(onTaskAssignedToOther);
    onTaskAssignedToOtherRef.current = onTaskAssignedToOther;

    const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

    const clearRetryTimer = () => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    };

    const clearWatchdogTimer = () => {
        if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
        }
    };

    const enrichBidProfile = useCallback(async (bid: BidsWSBid) => {
        if (!bid.user_id) return;
        try {
            const profile = await getCustomerProfile(Number(bid.user_id));
            if (!isMountedRef.current) return;
            const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
            const avatar = normalizeImageUrl(profile.image);
            const rating = profile.overall_rating;
            const phone = profile.phone_number;

            setBids((prev) =>
                prev.map((b) => {
                    if (String(b.id) !== String(bid.id)) return b;
                    return {
                        ...b,
                        user_name: fullName || b.user_name || `Worker #${b.user_id}`,
                        user_avatar: avatar || b.user_avatar,
                        user_rating: rating ?? b.user_rating ?? 4.8,
                        phone_number: phone || b.phone_number,
                        is_profile_loading: false,
                    };
                })
            );
        } catch (err) {
            logger.warn(`[useBiddingWebSocket] Profile fetch failed for worker ${bid.user_id}:`, err);
            if (isMountedRef.current) {
                setBids((prev) =>
                    prev.map((b) => (String(b.id) === String(bid.id) ? { ...b, is_profile_loading: false } : b))
                );
            }
        }
    }, []);

    const closeSocket = useCallback(() => {
        clearWatchdogTimer();
        clearRetryTimer();
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            try {
                wsRef.current.close(1000, 'Intentional close');
            } catch (e) {
                // Ignore socket close errors
            }
            wsRef.current = null;
        }
        setWsStatus('disconnected');
    }, []);

    const connect = useCallback(() => {
        if (!isMountedRef.current || !taskId || !userId || !shouldConnectRef.current) return;
        if (wsRef.current) return;

        const url = `${WS_BASE}/ws/bidding/${taskId}/`;
        logger.log('[useBiddingWebSocket] Connecting to:', url);
        setWsStatus('connecting');

        clearWatchdogTimer();
        watchdogTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current || !shouldConnectRef.current) return;
            if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
                logger.warn(`[useBiddingWebSocket] Connection timed out after 2000ms for task ${taskId}. Re-establishing socket...`);
                if (wsRef.current) {
                    wsRef.current.onclose = null;
                    wsRef.current.onerror = null;
                    wsRef.current.onmessage = null;
                    try { wsRef.current.close(); } catch (e) { }
                    wsRef.current = null;
                }
                setWsStatus('reconnecting');
                connect();
            }
        }, 2000);

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) return;
                clearWatchdogTimer();
                logger.log(`[useBiddingWebSocket] Connected to bidding room for task ${taskId}`);
                setWsStatus('connected');
                retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
            };

            ws.onmessage = async (event) => {
                if (!isMountedRef.current) return;
                try {
                    const data: BidsWSMessage = JSON.parse(event.data);
                    logger.log('[useBiddingWebSocket] Message received:', data);

                    switch (data.type) {
                        case 'bidding_closed': {
                            setIsBiddingClosed(true);
                            showFeedback('This task has already been assigned.');
                            closeSocket();
                            break;
                        }

                        case 'bid_history': {
                            if (Array.isArray(data.bids)) {
                                const initialBids = data.bids.map((b) => ({ ...b, is_profile_loading: true }));
                                setBids(initialBids);
                                initialBids.forEach((b) => enrichBidProfile(b));
                            }
                            break;
                        }

                        case 'bid_placed': {
                            if (data.bid) {
                                const newBid: BidsWSBid = { ...data.bid, is_profile_loading: true };
                                setBids((prev) => {
                                    if (prev.some((b) => String(b.id) === String(newBid.id))) {
                                        return prev;
                                    }
                                    return [newBid, ...prev];
                                });
                                enrichBidProfile(newBid);
                            }
                            break;
                        }

                        case 'bid_accepted': {
                            const accepted = data.bid;
                            if (!accepted) break;

                            setWinningBid(accepted);
                            setIsBiddingClosed(true);
                            onBidAcceptedRef.current?.(accepted);

                            const currentUserId = userIdRef.current;
                            const amICustomer = isCustomerRef.current;

                            if (String(accepted.user_id) === String(currentUserId) && !amICustomer) {
                                showFeedback('Congratulations, your bid was accepted!');
                            } else if (!amICustomer) {
                                showFeedback('This task has been assigned to another professional.');
                                onTaskAssignedToOtherRef.current?.(Number(accepted.task_id || taskId));
                            } else if (amICustomer) {
                                showFeedback(`You accepted a bid of Rs. ${accepted.price}`);
                            } else {
                                showFeedback('This task has been assigned to another professional.');
                            }

                            closeSocket();
                            break;
                        }

                        case 'heartbeat':
                        case 'ping':
                            break;

                        default:
                            logger.log('[useBiddingWebSocket] Unhandled WS message:', data);
                            break;
                    }
                } catch (e) {
                    logger.warn('[useBiddingWebSocket] Failed to parse message:', e);
                }
            };

            ws.onerror = (error) => {
                logger.error(`[useBiddingWebSocket] WebSocket error for task ${taskId}:`, error);
            };

            ws.onclose = (event) => {
                if (!isMountedRef.current) return;
                wsRef.current = null;
                logger.log(`[useBiddingWebSocket] Socket closed for task ${taskId}. Code: ${event.code}`);

                if (!shouldConnectRef.current) {
                    setWsStatus('disconnected');
                    return;
                }

                if (event.code !== 1000) {
                    setWsStatus('reconnecting');
                    const delay = retryDelayRef.current;
                    retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
                    logger.log(`[useBiddingWebSocket] Reconnecting in ${delay}ms...`);
                    retryTimerRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                } else {
                    setWsStatus('disconnected');
                }
            };
        } catch (err) {
            logger.error('[useBiddingWebSocket] Connection initialization failed:', err);
            setWsStatus('disconnected');
        }
    }, [taskId, userId, closeSocket, enrichBidProfile]);

    const placeBid = useCallback(
        (price: number, estimatedHours: number = 1) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                logger.warn('[useBiddingWebSocket] Cannot place bid: WebSocket is not open.');
                showFeedback('Connection error. Please wait until connected to place a bid.');
                return;
            }

            const payload = {
                type: 'place_bid',
                user_id: userId,
                price,
                estimated_hours: estimatedHours,
            };

            logger.log('[useBiddingWebSocket] Sending place_bid payload:', payload);
            wsRef.current.send(JSON.stringify(payload));
        },
        [userId]
    );

    const acceptBid = useCallback((bidId: number | string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            logger.warn('[useBiddingWebSocket] Cannot accept bid: WebSocket is not open.');
            showFeedback('Connection error. Please wait until connected to accept a bid.');
            return;
        }

        const payload = {
            type: 'accept_bid',
            bid_id: bidId,
        };

        logger.log('[useBiddingWebSocket] Sending accept_bid payload:', payload);
        wsRef.current.send(JSON.stringify(payload));
    }, []);

    useEffect(() => {
        shouldConnectRef.current = enabled && isFocused && Boolean(taskId) && Boolean(userId);

        if (shouldConnectRef.current) {
            connect();
        } else {
            logger.log(`[useBiddingWebSocket] Closing bidding socket for task ${taskId} -> enabled: ${enabled}, isFocused: ${isFocused}`);
            clearRetryTimer();
            clearWatchdogTimer();
            closeSocket();
            setBids([]);
            setIsBiddingClosed(false);
            setWinningBid(null);
        }
    }, [enabled, isFocused, taskId, userId, connect, closeSocket]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            const prev = appStateRef.current;
            appStateRef.current = nextState;

            if (prev.match(/inactive|background/) && nextState === 'active') {
                if (shouldConnectRef.current && !wsRef.current) {
                    clearRetryTimer();
                    retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
                    connect();
                }
            } else if (nextState.match(/inactive|background/)) {
                clearRetryTimer();
                closeSocket();
            }
        });

        return () => subscription.remove();
    }, [connect, closeSocket]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            shouldConnectRef.current = false;
            clearRetryTimer();
            closeSocket();
        };
    }, [closeSocket]);

    return {
        bids,
        isBiddingClosed,
        winningBid,
        wsStatus,
        placeBid,
        acceptBid,
        closeSocket,
    };
}
