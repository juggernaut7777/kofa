/**
 * KOFA Push Notifications - Expo Push Notifications Setup
 * Handles device registration and notification permissions
 */
import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken, unregisterPushToken } from '@/lib/api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface PushNotificationState {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    isRegistered: boolean;
}

/**
 * Hook to set up push notifications
 */
export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();

    useEffect(() => {
        // Register for push notifications
        registerForPushNotificationsAsync().then(token => {
            if (token) {
                setExpoPushToken(token);
                setIsRegistered(true);
                // Register token with backend
                registerPushToken(token).catch(console.error);
            }
        });

        // Listen for incoming notifications
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        // Listen for notification responses (when user taps notification)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            handleNotificationResponse(data);
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    return { expoPushToken, notification, isRegistered };
}

/**
 * Register for push notifications and get Expo push token
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Check if running on physical device
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Check and request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        Alert.alert(
            'Notifications Disabled',
            'Enable notifications to get alerts for new orders and low stock.',
            [{ text: 'OK' }]
        );
        return null;
    }

    // Get Expo push token
    try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'your-expo-project-id', // Will be auto-detected in most cases
        });
        token = tokenData.data;
    } catch (error) {
        console.error('Failed to get push token:', error);
    }

    // Android-specific channel setup
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
            name: 'Order Notifications',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2BAFF2',
        });

        await Notifications.setNotificationChannelAsync('alerts', {
            name: 'Stock Alerts',
            importance: Notifications.AndroidImportance.DEFAULT,
            lightColor: '#F59E0B',
        });
    }

    return token;
}

/**
 * Handle notification tap responses
 */
function handleNotificationResponse(data: any) {
    // Navigate based on notification type
    if (data?.type === 'new_order') {
        // TODO: Navigate to orders screen
        console.log('Navigate to order:', data.orderId);
    } else if (data?.type === 'low_stock') {
        // TODO: Navigate to inventory
        console.log('Navigate to low stock product:', data.productId);
    }
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleTestNotification() {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🛒 New Order!',
            body: 'You have a new order worth ₦25,000',
            data: { type: 'new_order', orderId: 'test-123' },
        },
        trigger: { seconds: 2 },
    });
}

export default {
    usePushNotifications,
    scheduleTestNotification,
};
