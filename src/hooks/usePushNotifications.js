import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';

import { request } from '../api/client.js';

/**
 * Check if the app is currently running inside Expo Go.
 * Expo SDK 53+ removed remote push notifications inside the Expo Go app on Android.
 * In a standalone APK or Development Build, push notifications work normally.
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo' ||
  Constants?.expoConfig?.extra?.eas === undefined && Constants?.easConfig === undefined;

let notificationsModule = null;

async function getNotifications() {
  if (Platform.OS === 'web' || isExpoGo) return null;
  if (!notificationsModule) {
    try {
      notificationsModule = await import('expo-notifications');
    } catch {
      return null;
    }
  }
  return notificationsModule;
}

// Set handler safely if not in Expo Go
if (Platform.OS !== 'web' && !isExpoGo) {
  getNotifications().then((Notifications) => {
    if (!Notifications) return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
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
 * Android 8+ requires a channel before anything can be delivered.
 */
async function configureAndroidChannels() {
  if (Platform.OS !== 'android' || isExpoGo) return;

  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      sound: 'default',
      lightColor: '#FF4E88',
    });

    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements and offers',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150],
      sound: 'default',
      lightColor: '#7C4DFF',
    });
  } catch {
    // Channel creation ignored if unsupported in client
  }
}

async function registerForPushNotifications() {
  if (!Device.isDevice || Platform.OS === 'web' || isExpoGo) return null;

  const Notifications = await getNotifications();
  if (!Notifications) return null;

  try {
    await configureAndroidChannels();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      status = requested.status;
    }

    if (status !== 'granted') return null;

    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch {
    // Remote notifications not supported or failed
    return null;
  }
}

/** Turns a notification's `data.link` into a route. */
function routeForNotification(data) {
  if (!data) return null;
  if (data.type === 'message' && data.conversationId) return `/chat/${data.conversationId}`;

  const screens = {
    coins: '/coins',
    chats: '/(tabs)/chats',
    rooms: '/(tabs)/rooms',
    games: '/(tabs)/games',
  };

  return screens[data.link] ?? null;
}

/**
 * Registers this device for push and routes taps.
 */
export function usePushNotifications({ isAuthenticated, onNotificationReceived }) {
  const receivedRef = useRef(onNotificationReceived);

  useEffect(() => {
    receivedRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web' || isExpoGo) return undefined;

    let isCancelled = false;
    let receivedSubscription = null;
    let responseSubscription = null;

    registerForPushNotifications()
      .then(async (token) => {
        if (!token || isCancelled) return;

        await request({
          method: 'POST',
          url: '/notifications/devices',
          data: {
            token,
            platform: Platform.OS,
            deviceName: Device.deviceName ?? '',
            appVersion: Constants?.expoConfig?.version ?? '',
          },
        });
      })
      .catch(() => undefined);

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
  if (Platform.OS === 'web' || isExpoGo) return;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants?.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await request({ method: 'DELETE', url: '/notifications/devices', data: { token: token.data } });
  } catch {
    // Ignored
  }
}
