import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, Platform, ToastAndroid, Alert } from 'react-native';
import { getLocationById } from '@/services/location';
import { getCustomerProfile, normalizeImageUrl } from '@/services/customer';
import { getOpenTasksFromBackend } from '@/services/task';
import { useAuth } from '@/context/auth';
import { LiveJob } from '@/types';
import useCategoryStore from '@/store/categoryStore';
import { logger } from '@/utils/logger';

export { LiveJob };

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const WS_BASE = BASE_URL
    .replace(/\/$/, '')
    .replace(/^https/, 'wss')
    .replace(/^http/, 'ws');

type WSMessage =
    | {
        type: 'task_created';
        task: {
            id: number;
            subject: string;
            body: string;
            price: number;
            subcategory_id?: number;
            category_id?: number;
            location_id: number;
            payment_preference_id?: number;
            created_at?: string;
            created_by?: number;
            customer_name?: string;
            attachments?: any[];
            worker_id?: number;
        };
    }
    | { type: 'heartbeat'; task?: null }
    | {
        type: 'task_deleted';
        task_id?: number;
        worker_id?: number;
    };

export type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface UseProWebSocketOptions {
    userId?: number | undefined;
    isOnline: boolean;
    onTaskCancelledForWorker?: (taskId: number, workerId: number) => void;
}

interface UseProWebSocketResult {
    jobs: LiveJob[];
    wsStatus: WSStatus;
    hasNoJobs: boolean;
    refresh: () => Promise<void>;
}

const MAX_RETRY_DELAY_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 1_000;

/**
 * Shared helper to fetch customer profile and location concurrently,
 * then update the job item in component state.
 */
async function enrichJobDetails(
    taskId: number,
    createdBy: number | undefined,
    locationId: number | undefined,
    fallbackCustomerName: string | undefined,
    isMountedRef: React.MutableRefObject<boolean>,
    setJobs: React.Dispatch<React.SetStateAction<LiveJob[]>>
) {
    const [profileResult, locationResult] = await Promise.allSettled([
        createdBy ? getCustomerProfile(createdBy) : Promise.resolve(null),
        locationId ? getLocationById(locationId) : Promise.resolve(null),
    ]);

    if (!isMountedRef.current) return;

    let updatedCustomerProfile: any = null;
    let updatedCustomerName: string | undefined = undefined;
    let updatedCustomerImage: string | undefined = undefined;
    let updatedCustomerRating: number | undefined = undefined;
    let updatedLocationName: string | undefined = undefined;

    if (profileResult.status === 'fulfilled' && profileResult.value) {
        const profile = profileResult.value;
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
        updatedCustomerName = fullName || fallbackCustomerName || 'Customer';
        updatedCustomerImage = normalizeImageUrl(profile.image);
        updatedCustomerRating = profile.overall_rating;
        updatedCustomerProfile = profile;
    }

    if (locationResult.status === 'fulfilled' && locationResult.value) {
        const loc = locationResult.value;
        updatedLocationName = loc.formatted_address || 'Unknown Location';
    }

    setJobs((prev) =>
        prev.map((j) => {
            if (Number(j.id) !== Number(taskId)) return j;
            return {
                ...j,
                customer_name: updatedCustomerName ?? j.customer_name,
                customer_rating: updatedCustomerRating ?? j.customer_rating,
                customer_image: updatedCustomerImage ?? j.customer_image,
                customer_profile: updatedCustomerProfile ?? j.customer_profile,
                is_customer_loading: false,
                location_name: updatedLocationName ?? (locationId ? 'Location not found' : j.location_name),
                is_location_loading: false,
            };
        })
    );
}

export function useProWebSocket({
    userId: passedUserId,
    isOnline,
    onTaskCancelledForWorker,
}: UseProWebSocketOptions): UseProWebSocketResult {
    const { user } = useAuth();
    const userId = passedUserId ?? user?.id;
    const [jobs, setJobs] = useState<LiveJob[]>([]);
    const [wsStatus, setWsStatus] = useState<WSStatus>('disconnected');
    const [hasNoJobs, setHasNoJobs] = useState(false);

    const { ensureCategories, getStyleById, getCategoryAndSubcategoryBySubId } = useCategoryStore();

    const onTaskCancelledForWorkerRef = useRef(onTaskCancelledForWorker);
    onTaskCancelledForWorkerRef.current = onTaskCancelledForWorker;

    const wsRef = useRef<WebSocket | null>(null);
    const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const shouldConnectRef = useRef(false);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clearConnectTimeout = () => {
        if (connectTimeoutRef.current) {
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = null;
        }
    };

    const clearRetryTimer = () => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    };

    const closeSocket = useCallback(() => {
        clearConnectTimeout();
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        if (!isMountedRef.current || !userId || !shouldConnectRef.current) return;
        if (wsRef.current) return;

        const url = `${WS_BASE}/ws/tasks/`;
        logger.log('[useProWebSocket] Connecting to:', url);
        setWsStatus('connecting');

        clearConnectTimeout();
        connectTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current || !shouldConnectRef.current) return;
            if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
                logger.warn('[useProWebSocket] WebSocket connection timed out after 2000ms. Re-establishing socket...');
                closeSocket();
                setWsStatus('reconnecting');
                retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
                setTimeout(() => {
                    if (shouldConnectRef.current) connect();
                }, 200);
            }
        }, 2000);

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            clearConnectTimeout();
            if (!isMountedRef.current) return;
            logger.log('[useProWebSocket] Connected');
            setWsStatus('connected');
            retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
            ensureCategories();
        };

        ws.onmessage = (event) => {
            if (!isMountedRef.current) return;
            try {
                const msg: WSMessage = JSON.parse(event.data);
                logger.log('[useProWebSocket] Message received:', msg);

                if (msg.type === 'task_created' && msg.task) {
                    const t = msg.task;
                    const subId = t.subcategory_id || t.category_id || 0;
                    const { category: cat, subcategory: sub } = getCategoryAndSubcategoryBySubId(subId);
                    const { icon: catIcon, color: catColor } = getStyleById(cat?.id || subId);

                    const newJob: LiveJob = {
                        id: t.id,
                        title: t.subject || 'New Task',
                        description: t.body || '',
                        category: cat?.name ?? (t.category_id ? `Category ${t.category_id}` : 'Service'),
                        subcategory: sub?.name ?? '',
                        subcategory_id: subId,
                        category_icon: catIcon,
                        category_color: catColor,
                        budget: t.price,
                        location_name: 'Loading location...',
                        customer_id: t.created_by,
                        customer_name: t.customer_name || 'Customer',
                        created_at: t.created_at,
                        attachments: t.attachments || [],
                        is_location_loading: Boolean(t.location_id),
                        is_customer_loading: Boolean(t.created_by),
                        payment_preference_id: t.payment_preference_id,
                    };

                    setJobs((prev) => {
                        if (prev.some((j) => j.id === newJob.id)) return prev;
                        setHasNoJobs(false);
                        return [newJob, ...prev];
                    });

                    // Enrich customer profile & location details
                    enrichJobDetails(t.id, t.created_by, t.location_id, t.customer_name, isMountedRef, setJobs);
                }

                const closedTypes = ['task_assigned', 'task_accepted', 'bidding_closed', 'task_closed', 'task_deleted', 'task_cancelled'];
                if (closedTypes.includes(msg.type)) {
                    const closedTaskId = (msg as any).task_id || (msg as any).id;
                    const msgWorkerId = (msg as any).worker_id;

                    if (closedTaskId) {
                        logger.log(`[useProWebSocket] Removing closed/assigned task ${closedTaskId} from live jobs feed.`);
                        setJobs((prev) => prev.filter((j) => Number(j.id) !== Number(closedTaskId)));

                        if (
                            msg.type === 'task_deleted' &&
                            msgWorkerId &&
                            userId &&
                            String(msgWorkerId) === String(userId)
                        ) {
                            logger.log(`[useProWebSocket] Task ${closedTaskId} assigned to worker ${userId} was cancelled by customer.`);
                            if (Platform.OS === 'android') {
                                ToastAndroid.show('A task assigned to you was cancelled by the customer.', ToastAndroid.LONG);
                            } else {
                                Alert.alert('Task Cancelled', 'A task assigned to you was cancelled by the customer.');
                            }
                            onTaskCancelledForWorkerRef.current?.(Number(closedTaskId), Number(msgWorkerId));
                        }
                    }
                }
            } catch (e) {
                logger.warn('[useProWebSocket] Failed to parse message:', e);
            }
        };

        ws.onerror = (error) => {
            logger.error('[useProWebSocket] WebSocket error:', error);
        };

        ws.onclose = (event) => {
            if (!isMountedRef.current) return;
            wsRef.current = null;
            logger.log('[useProWebSocket] Connection closed. Code:', event.code);

            if (!shouldConnectRef.current) {
                setWsStatus('disconnected');
                return;
            }

            setWsStatus('reconnecting');
            const delay = retryDelayRef.current;
            retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
            logger.log(`[useProWebSocket] Reconnecting in ${delay}ms...`);
            retryTimerRef.current = setTimeout(() => {
                connect();
            }, delay);
        };
    }, [userId, closeSocket, ensureCategories, getCategoryAndSubcategoryBySubId, getStyleById]);

    const fetchOpenJobs = useCallback(async () => {
        if (!isMountedRef.current || !shouldConnectRef.current) return;
        logger.log('[useProWebSocket] Fetching open jobs from /app/task/open/ API...');
        try {
            await ensureCategories();
            const openTasks = await getOpenTasksFromBackend();
            if (!isMountedRef.current || !shouldConnectRef.current) return;

            logger.log(`[useProWebSocket] Fetched ${openTasks.length} open tasks from backend.`);

            if (openTasks.length === 0) {
                setJobs([]);
                setHasNoJobs(true);
                return;
            }

            setHasNoJobs(false);

            const initialJobs: LiveJob[] = openTasks.map((t) => {
                const subId = t.subcategory_id || (t as any).category_id || 0;
                const { category: cat, subcategory: sub } = getCategoryAndSubcategoryBySubId(subId);
                const { icon: catIcon, color: catColor } = getStyleById(cat?.id || subId);

                return {
                    id: t.id!,
                    title: t.subject || 'New Task',
                    description: t.body || '',
                    category: cat?.name ?? ((t as any).category_id ? `Category ${(t as any).category_id}` : 'Service'),
                    subcategory: sub?.name ?? '',
                    subcategory_id: subId,
                    category_icon: catIcon,
                    category_color: catColor,
                    budget: t.price,
                    location_name: 'Loading location...',
                    customer_id: t.created_by,
                    customer_name: (t as any).customer_name || 'Customer',
                    created_at: t.created_at,
                    attachments: (t as any).attachments || [],
                    is_location_loading: Boolean(t.location_id),
                    is_customer_loading: Boolean(t.created_by),
                    payment_preference_id: t.payment_preference_id,
                };
            });

            setJobs((prev) => {
                const fetchedIds = new Set(initialJobs.map((j) => Number(j.id)));
                const extraWsJobs = prev.filter((j) => !fetchedIds.has(Number(j.id)));
                return [...extraWsJobs, ...initialJobs];
            });

            // Concurrently enrich details (customer profile and location) for all open tasks
            await Promise.allSettled(
                openTasks.map(async (t) => {
                    if (!t.id) return;
                    await enrichJobDetails(t.id, t.created_by, t.location_id, (t as any).customer_name, isMountedRef, setJobs);
                })
            );
        } catch (err) {
            logger.error('[useProWebSocket] Error fetching open jobs from API:', err);
        }
    }, [ensureCategories, getCategoryAndSubcategoryBySubId, getStyleById]);

    useEffect(() => {
        shouldConnectRef.current = isOnline && !!userId;

        if (isOnline && userId) {
            connect();
            fetchOpenJobs();
        } else {
            clearRetryTimer();
            closeSocket();
            setWsStatus('disconnected');
            setJobs([]);
            setHasNoJobs(false);
        }
    }, [isOnline, userId, connect, closeSocket, fetchOpenJobs]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            const prev = appStateRef.current;
            appStateRef.current = nextState;

            if (prev.match(/inactive|background/) && nextState === 'active') {
                if (shouldConnectRef.current && !wsRef.current) {
                    clearRetryTimer();
                    retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
                    connect();
                    fetchOpenJobs();
                }
            } else if (nextState.match(/inactive|background/)) {
                clearRetryTimer();
                closeSocket();
            }
        });

        return () => subscription.remove();
    }, [connect, closeSocket, fetchOpenJobs]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            shouldConnectRef.current = false;
            clearRetryTimer();
            closeSocket();
        };
    }, [closeSocket]);

    const refresh = useCallback(async () => {
        if (!shouldConnectRef.current) return;
        logger.log('[useProWebSocket] Refresh triggered: restarting socket and refetching open jobs...');
        clearRetryTimer();
        closeSocket();
        retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
        connect();
        await fetchOpenJobs();
    }, [connect, closeSocket, fetchOpenJobs]);

    return { jobs, wsStatus, hasNoJobs, refresh };
}
