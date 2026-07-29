import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '@/utils/logger';

// Configure default notification handler for foreground display
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            logger.warn('[notificationService] Notification permissions not granted by user.');
            return null;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'New Tasks',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#325B3B',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });
        }

        // Extract Expo Push Token for server-side push notification registration
        let pushToken: string | null = null;
        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            const tokenData = await Notifications.getExpoPushTokenAsync(
                projectId ? { projectId } : undefined
            );
            pushToken = tokenData.data;
            // logger.log('[notificationService] Device Expo Push Token:', pushToken);
        } catch (tokenErr) {
            logger.warn('[notificationService] Unable to fetch Expo Push Token:', tokenErr);
        }

        return pushToken;
    } catch (e) {
        logger.warn('[notificationService] Error registering notifications:', e);
        return null;
    }
}

export async function showNewTaskNotification(task: {
    id: number;
    subject?: string;
    price?: number;
    customer_name?: string;
}) {
    try {
        await registerForPushNotificationsAsync();

        const title = `⚡ New Job: ${task.subject || 'New Task Available'}`;
        const priceFormatted = task.price ? `Rs.${task.price.toLocaleString()}` : '';
        const bodyParts = [priceFormatted, task.customer_name ? `from ${task.customer_name}` : '', 'Tap to view details & place bid.'];
        const body = bodyParts.filter(Boolean).join(' • ');

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { taskId: task.id },
            },
            trigger: null, // Display immediately
        });
        // logger.log(`[notificationService] Triggered push notification for task ${task.id}`);
    } catch (e) {
        logger.warn('[notificationService] Error showing task notification:', e);
    }
}
