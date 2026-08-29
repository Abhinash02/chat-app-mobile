import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { request } from '../api/client.js';

/**
 * How a notification behaves while the app is already open.
 *
 * Sound is off here on purpose: an open app plays its own chime through the
 * sound provider when the socket delivers the message, and letting the OS play
 * one as well means every message arrives twice.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Android 8+ requires a channel before anything can be delivered, and channel
 * settings are fixed at creation — they cannot be changed later, so getting
 * importance and vibration right the first time matters.
 */
async function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    sound: 'default',
    lightColor: '#FF4E88',
  });

  // Separate channel so someone can mute marketing without losing messages.
  await Notifications.setNotificationChannelAsync('announcements', {
    name: 'Announcements and offers',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150],
    sound: 'default',
    lightColor: '#7C4DFF',
  });
}

async function registerForPushNotifications() {
  // Simulators cannot receive push at all; asking would only produce an error.
  if (!Device.isDevice) return null;

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
 *
 * Registration is best effort throughout: no permission, a simulator, or a
 * failed network call all mean "no push on this device", never a broken app.
 */
export function usePushNotifications({ isAuthenticated, onNotificationReceived }) {
  const receivedRef = useRef(onNotificationReceived);

  // Kept current in an effect, not during render: writing to a ref while
  // rendering is a side effect, and React may render more than once per commit.
  useEffect(() => {
    receivedRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCancelled = false;
    let registeredToken = null;

    registerForPushNotifications()
      .then(async (token) => {
        if (!token || isCancelled) return;
        registeredToken = token;

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
      .catch(() => {
        // Push simply will not work on this device this session.
      });

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      receivedRef.current?.(notification.request.content.data);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeForNotification(response.notification.request.content.data);
      if (route) router.push(route);
    });

    return () => {
      isCancelled = true;
      receivedSubscription.remove();
      responseSubscription.remove();

      // The token is deliberately left registered: the point of push is to
      // reach someone whose app is closed. It is retired on sign-out instead.
      void registeredToken;
    };
  }, [isAuthenticated]);
}

export async function unregisterPushToken() {
  try {
    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants?.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await request({ method: 'DELETE', url: '/notifications/devices', data: { token: token.data } });
  } catch {
    // Signing out must not fail because a token could not be retired; the
    // server drops it anyway the first time a push comes back unregistered.
  }
}
