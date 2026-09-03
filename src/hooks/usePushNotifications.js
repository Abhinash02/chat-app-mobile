import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';

import { request } from '../api/client.js';

let notificationsModule = null;

async function getNotifications() {
  if (Platform.OS === 'web') return null;
  if (!notificationsModule) {
    try {
      notificationsModule = await import('expo-notifications');
    } catch (err) {
      console.warn('[PushNotifications] expo-notifications import failed:', err?.message);
      return null;
    }
  }
  return notificationsModule;
}

// Set foreground notification presentation handler
if (Platform.OS !== 'web') {
  getNotifications().then((Notifications) => {
    if (!Notifications) return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {
      // Ignored
    }
  }).catch(() => undefined);
}

/**
 * Android 8+ requires high-importance notification channels before notifications can be shown.
 */
async function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;

  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX ?? Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#FF4E88',
      enableLights: true,
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements and offers',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150],
      sound: 'default',
      lightColor: '#7C4DFF',
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  } catch (err) {
    console.warn('[PushNotifications] Android channel configuration failed:', err?.message);
  }
}

export async function registerForPushNotifications() {
  if (Platform.OS === 'web') return null;

  const Notifications = await getNotifications();
  if (!Notifications) return null;

  try {
    await configureAndroidChannels();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing?.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
        android: {},
      });
      status = requested?.status;
    }

    if (status !== 'granted') {
      console.warn('[PushNotifications] Permission not granted, status:', status);
      return null;
    }

    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'cd917c17-10f7-4b1a-bd44-c2da4457edd9';

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenResponse?.data ?? null;
  } catch (err) {
    console.warn('[PushNotifications] Push token registration skipped:', err?.message);
    return null;
  }
}

export async function triggerLocalNotification({ title, body, data = {} }) {
  if (Platform.OS === 'web') return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await configureAndroidChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[PushNotifications] Local notification schedule error:', err?.message);
  }
}

/** Turns a notification's `data.link` or `data.type` into an app route. */
function routeForNotification(data) {
  if (!data) return null;
  if (data.type === 'message' && data.conversationId) return `/chat/${data.conversationId}`;
  if (data.type === 'withdrawal') return '/coins';
  if (data.type === 'coins') return '/coins';
  if (data.type === 'feedback_update') return '/settings';

  const screens = {
    coins: '/coins',
    chats: '/(tabs)/chats',
    rooms: '/(tabs)/rooms',
    games: '/(tabs)/games',
  };

  return screens[data.link] ?? null;
}

/**
 * Registers this device for push notifications and routes taps.
 */
export function usePushNotifications({ isAuthenticated, onNotificationReceived }) {
  const receivedRef = useRef(onNotificationReceived);

  useEffect(() => {
    receivedRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCancelled = false;
    let receivedSubscription = null;
    let responseSubscription = null;

    registerForPushNotifications()
      .then(async (token) => {
        const deviceToken = token || `ExponentPushToken[app-${Platform.OS}-fallback]`;
        if (isCancelled) return;

        try {
          await request({
            method: 'POST',
            url: '/notifications/devices',
            data: {
              token: deviceToken,
              platform: Platform.OS === 'web' ? 'web' : Platform.OS,
              deviceId: Device.modelName ?? (Platform.OS === 'web' ? 'Web Browser' : 'Mobile Device'),
              deviceName: Device.deviceName ?? Device.modelName ?? 'User Device',
              appVersion: Constants?.expoConfig?.version ?? '1.0.0',
            },
          });
          console.log('[PushNotifications] Device token registered successfully:', deviceToken);
        } catch (regErr) {
          console.warn('[PushNotifications] Failed to save device token on backend:', regErr?.message);
        }
      })
      .catch((err) => {
        console.warn('[PushNotifications] registerForPushNotifications error:', err?.message);
      });

    getNotifications().then((Notifications) => {
      if (!Notifications || isCancelled) return;
      try {
        receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
          receivedRef.current?.(notification.request.content.data);
        });

        responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const route = routeForNotification(response.notification.request.content.data);
          if (route) router.push(route);
        });
      } catch {
        // Ignored
      }
    }).catch(() => undefined);

    return () => {
      isCancelled = true;
      try {
        receivedSubscription?.remove?.();
        responseSubscription?.remove?.();
      } catch {
        // Ignored
      }
    };
  }, [isAuthenticated]);
}

export async function unregisterPushToken() {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
      Constants?.expoConfig?.extra?.eas?.projectId ??
      'cd917c17-10f7-4b1a-bd44-c2da4457edd9';
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    if (token?.data) {
      await request({ method: 'DELETE', url: '/notifications/devices', data: { token: token.data } });
    }
  } catch {
    // Ignored
  }
}

