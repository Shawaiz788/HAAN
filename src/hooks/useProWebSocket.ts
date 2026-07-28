import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, Platform, ToastAndroid, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getLocationById } from '@/services/location';
import { getCustomerProfile, normalizeImageUrl } from '@/services/customer';
import { getOpenTasksFromBackend } from '@/services/task';
import { useAuth } from '@/context/auth';
import { LiveJob } from '@/types';
import useCategoryStore from '@/store/categoryStore';
import { logger } from '@/utils/logger';
import { showNewTaskNotification } from '@/services/notificationService';
import { calculateDistanceKm } from '@/utils/distanceUtils';

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
        type: 'task_deleted' | 'task_assigned' | 'task_accepted' | 'bidding_closed' | 'task_closed' | 'task_cancelled';
        task_id?: number;
        id?: number;
        worker_id?: number;
    };

export type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface UseProWebSocketOptions {
    userId?: number | undefined;
    isOnline: boolean;
    onTaskAssignedToWorker?: (taskId: number, workerId: number) => void;
    onTaskCancelledForWorker?: (taskId: number, workerId: number) => void;
    proLocation?: { latitude: number; longitude: number } | null;
}

interface UseProWebSocketResult {
    jobs: LiveJob[];
    wsStatus: WSStatus;
    hasNoJobs: boolean;
    refresh: () => Promise<void>;
}

const MAX_RETRY_DELAY_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 1_000;

// ─── Global Singleton Socket State ───────────────────────────────────────────

let globalWs: WebSocket | null = null;
let globalWsStatus: WSStatus = 'disconnected';
let globalJobs: LiveJob[] = [];
let globalHasNoJobs = false;
let globalRetryTimer: NodeJS.Timeout | null = null;
let globalRetryDelay = INITIAL_RETRY_DELAY_MS;
let globalShouldConnect = false;
let globalUserId: number | undefined = undefined;
let globalConnectTimeout: NodeJS.Timeout | null = null;
let globalOnTaskCancelled: ((taskId: number, workerId: number) => void) | undefined = undefined;
let globalOnTaskAssignedToWorker: ((taskId: number, workerId: number) => void) | undefined = undefined;

const listeners = new Set<() => void>();
const notifyListeners = () => {
    listeners.forEach((fn) => fn());
};

function clearGlobalConnectTimeout() {
    if (globalConnectTimeout) {
        clearTimeout(globalConnectTimeout);
        globalConnectTimeout = null;
    }
}

function clearGlobalRetryTimer() {
    if (globalRetryTimer) {
        clearTimeout(globalRetryTimer);
        globalRetryTimer = null;
    }
}

function closeGlobalSocket() {
    clearGlobalConnectTimeout();
    clearGlobalRetryTimer();
    if (globalWs) {
        logger.warn('[useProWebSocket] Closing global LiveJobs WebSocket connection...');
        globalWs.onclose = null;
        globalWs.onerror = null;
        globalWs.onmessage = null;
        try {
            globalWs.close(1000, 'Intentional close');
        } catch (e) {}
        globalWs = null;
        logger.warn('[useProWebSocket] Global LiveJobs WebSocket closed.');
    }
}

async function enrichJobDetailsGlobal(
    taskId: number,
    createdBy: number | undefined,
    locationId: number | undefined,
    fallbackCustomerName: string | undefined
) {
    const [profileResult, locationResult] = await Promise.allSettled([
        createdBy ? getCustomerProfile(createdBy) : Promise.resolve(null),
        locationId ? getLocationById(locationId) : Promise.resolve(null),
    ]);

    let updatedCustomerProfile: any = null;
    let updatedCustomerName: string | undefined = undefined;
    let updatedCustomerImage: string | undefined = undefined;
    let updatedCustomerRating: number | undefined = undefined;
    let updatedLocationName: string | undefined = undefined;
    let updatedLatitude: number | undefined = undefined;
    let updatedLongitude: number | undefined = undefined;

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
        if (loc.latitude !== undefined && loc.longitude !== undefined) {
            updatedLatitude = Number(loc.latitude);
            updatedLongitude = Number(loc.longitude);
        }
    }

    globalJobs = globalJobs.map((j) => {
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
            latitude: updatedLatitude ?? j.latitude,
            longitude: updatedLongitude ?? j.longitude,
        };
    });
    notifyListeners();
}

function connectGlobalSocket() {
    if (!globalUserId || !globalShouldConnect) return;
    if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) return;

    const url = `${WS_BASE}/ws/tasks/`;
    logger.log('[useProWebSocket] Connecting global socket to:', url);
    globalWsStatus = 'connecting';
    notifyListeners();

    clearGlobalConnectTimeout();
    globalConnectTimeout = setTimeout(() => {
        if (!globalShouldConnect) return;
        if (globalWs && globalWs.readyState !== WebSocket.OPEN) {
            logger.warn('[useProWebSocket] Global WebSocket connection timed out after 2000ms. Re-establishing socket...');
            closeGlobalSocket();
            globalWsStatus = 'reconnecting';
            notifyListeners();
            globalRetryDelay = INITIAL_RETRY_DELAY_MS;
            setTimeout(() => {
                if (globalShouldConnect) connectGlobalSocket();
            }, 200);
        }
    }, 2000);

    const ws = new WebSocket(url);
    globalWs = ws;

    ws.onopen = () => {
        clearGlobalConnectTimeout();
        logger.log('[useProWebSocket] Global socket Connected');
        globalWsStatus = 'connected';
        globalRetryDelay = INITIAL_RETRY_DELAY_MS;
        useCategoryStore.getState().ensureCategories();
        notifyListeners();
    };

    ws.onmessage = (event) => {
        try {
            const msg: WSMessage = JSON.parse(event.data);
            logger.log('[useProWebSocket] Global message received:', msg);

            if (msg.type === 'task_created' && msg.task) {
                const t = msg.task;
                const { getStyleById, getCategoryAndSubcategoryBySubId } = useCategoryStore.getState();

                showNewTaskNotification({
                    id: t.id,
                    subject: t.subject,
                    price: t.price,
                    customer_name: t.customer_name,
                });

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

                if (!globalJobs.some((j) => j.id === newJob.id)) {
                    globalJobs = [newJob, ...globalJobs];
                    globalHasNoJobs = false;
                    notifyListeners();
                    enrichJobDetailsGlobal(t.id, t.created_by, t.location_id, t.customer_name);
                }
            }

            const closedTypes = ['task_assigned', 'task_accepted', 'bidding_closed', 'task_closed', 'task_deleted', 'task_cancelled'];
            if (closedTypes.includes(msg.type)) {
                const closedTaskId = (msg as any).task_id || (msg as any).id;
                const msgWorkerId = (msg as any).worker_id;

                if (closedTaskId) {
                    logger.log(`[useProWebSocket] Removing closed/assigned task ${closedTaskId} from live jobs feed.`);
                    globalJobs = globalJobs.filter((j) => Number(j.id) !== Number(closedTaskId));
                    notifyListeners();

                    const isAssignedToMe =
                        msgWorkerId &&
                        globalUserId &&
                        Number(msgWorkerId) === Number(globalUserId) &&
                        (msg.type === 'task_assigned' || msg.type === 'task_accepted');

                    if (isAssignedToMe && globalOnTaskAssignedToWorker) {
                        logger.log(`[useProWebSocket] Task ${closedTaskId} assigned to current worker ${msgWorkerId}! Triggering assignment callback.`);
                        globalOnTaskAssignedToWorker(Number(closedTaskId), Number(msgWorkerId));
                    } else if (msgWorkerId && globalOnTaskCancelled && (msg.type === 'task_deleted' || msg.type === 'task_cancelled')) {
                        globalOnTaskCancelled(Number(closedTaskId), Number(msgWorkerId));
                    }
                }
            }
        } catch (e) {
            logger.error('[useProWebSocket] Error parsing global WebSocket message:', e);
        }
    };

    ws.onerror = (e) => {
        logger.error('[useProWebSocket] Global WebSocket Error:', e);
    };

    ws.onclose = () => {
        logger.warn('[useProWebSocket] Global socket closed');
        globalWs = null;
        if (!globalShouldConnect) return;

        globalWsStatus = 'reconnecting';
        notifyListeners();

        clearGlobalRetryTimer();
        globalRetryTimer = setTimeout(() => {
            logger.log(`[useProWebSocket] Attempting reconnect in ${globalRetryDelay}ms...`);
            connectGlobalSocket();
            globalRetryDelay = Math.min(globalRetryDelay * 2, MAX_RETRY_DELAY_MS);
        }, globalRetryDelay);
    };
}

async function fetchOpenJobsGlobal() {
    try {
        const openTasks = await getOpenTasksFromBackend();
        const { getStyleById, getCategoryAndSubcategoryBySubId } = useCategoryStore.getState();

        const formattedJobs: LiveJob[] = openTasks.map((t) => {
            const subId = t.subcategory_id || 0;
            const { category: cat, subcategory: sub } = getCategoryAndSubcategoryBySubId(subId);
            const { icon: catIcon, color: catColor } = getStyleById(cat?.id || subId);

            return {
                id: t.id!,
                title: t.subject || 'Open Task',
                description: t.body || '',
                category: cat?.name ?? 'Service',
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

        globalJobs = formattedJobs;
        globalHasNoJobs = formattedJobs.length === 0;
        notifyListeners();

        await Promise.allSettled(
            openTasks.map(async (t) => {
                if (!t.id) return;
                await enrichJobDetailsGlobal(t.id, t.created_by, t.location_id, (t as any).customer_name);
            })
        );
    } catch (err) {
        logger.error('[useProWebSocket] Error fetching open jobs from API:', err);
    }
}

// ─── AppState Listener for Global Socket ─────────────────────────────────────

AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
        if (globalShouldConnect && (!globalWs || globalWs.readyState !== WebSocket.OPEN)) {
            clearGlobalRetryTimer();
            globalRetryDelay = INITIAL_RETRY_DELAY_MS;
            connectGlobalSocket();
            fetchOpenJobsGlobal();
        }
    } else if (nextState.match(/inactive|background/)) {
        logger.log('[useProWebSocket] App backgrounded, keeping global socket active for push notifications.');
    }
});

// ─── React Hook Interface ───────────────────────────────────────────────────

export function useProWebSocket({
    userId: passedUserId,
    isOnline,
    onTaskAssignedToWorker,
    onTaskCancelledForWorker,
    proLocation,
}: UseProWebSocketOptions): UseProWebSocketResult {
    const { user } = useAuth();
    const userId = passedUserId ?? user?.id;
    const isFocused = useIsFocused();

    const [, forceUpdate] = useState({});

    useEffect(() => {
        globalOnTaskAssignedToWorker = onTaskAssignedToWorker;
        globalOnTaskCancelled = onTaskCancelledForWorker;
    }, [onTaskAssignedToWorker, onTaskCancelledForWorker]);

    useEffect(() => {
        const listener = () => forceUpdate({});
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    useEffect(() => {
        globalUserId = userId;
        const shouldBeConnected = isOnline && !!userId && isFocused;
        globalShouldConnect = shouldBeConnected;

        if (shouldBeConnected) {
            connectGlobalSocket();
            fetchOpenJobsGlobal();
        } else {
            logger.log(`[useProWebSocket] Closing global socket -> isOnline: ${isOnline}, isFocused: ${isFocused}, userId: ${userId}`);
            globalShouldConnect = false;
            clearGlobalRetryTimer();
            closeGlobalSocket();
            globalJobs = [];
            globalHasNoJobs = false;
            globalWsStatus = 'disconnected';
            notifyListeners();
        }
    }, [isOnline, userId, isFocused]);

    const refresh = useCallback(async () => {
        if (!globalShouldConnect) return;
        logger.log('[useProWebSocket] Refresh triggered: restarting global socket & fetching jobs...');
        clearGlobalRetryTimer();
        closeGlobalSocket();
        globalRetryDelay = INITIAL_RETRY_DELAY_MS;
        connectGlobalSocket();
        await fetchOpenJobsGlobal();
    }, []);

    const jobsWithDistance = globalJobs.map((job) => {
        if (proLocation && job.latitude !== undefined && job.longitude !== undefined) {
            const dist = calculateDistanceKm(
                proLocation.latitude,
                proLocation.longitude,
                job.latitude,
                job.longitude
            );
            return { ...job, distance_km: dist };
        }
        return job;
    });

    return {
        jobs: jobsWithDistance,
        wsStatus: globalWsStatus,
        hasNoJobs: globalHasNoJobs,
        refresh,
    };
}
