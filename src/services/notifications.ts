/**
 * Notification service — all Expo Notifications + FCM logic lives here.
 *
 * Flow:
 *   1. requestPermission()  — ask OS, return granted/denied
 *   2. registerDevice()     — get FCM token, POST /notifications/device (CONFIRMED)
 *   3. App.tsx sets up listeners for foreground display + tap navigation
 *
 * On a real device with a native build, getDevicePushTokenAsync() returns
 * the FCM token. On Expo Go / simulator it falls back to the Expo push token
 * (for testing with Expo's push service only).
 *
 * Notification payload shape expected from backend:
 *   { type: 'queue_update', bookingId: string, patientsAhead: number }
 *   { type: 'turn_soon',    bookingId: string }
 *   { type: 'your_turn',    bookingId: string }
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerDevice as apiRegisterDevice } from '../api/client';

export type NotificationPayload =
  | { type: 'queue_update'; bookingId: string; patientsAhead: number }
  | { type: 'turn_soon';    bookingId: string }
  | { type: 'your_turn';   bookingId: string };

// Configure how notifications appear while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('queue-updates', {
    name: 'Queue Updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
    sound: 'default',
  });
}

export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // Simulators can't receive push — skip silently in dev
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerDeviceForPush(): Promise<void> {
  const granted = await requestPermission();
  if (!granted) return;

  let fcmToken: string;

  try {
    if (Device.isDevice) {
      // Native build: real FCM token
      const result = await Notifications.getDevicePushTokenAsync();
      fcmToken = result.data;
    } else {
      // Expo Go fallback — Expo push token (dev only)
      const result = await Notifications.getExpoPushTokenAsync();
      fcmToken = result.data;
    }
  } catch {
    // Non-fatal — app works without push, just no notifications
    return;
  }

  await apiRegisterDevice(fcmToken);
}

export function parseNotificationPayload(
  notification: Notifications.Notification
): NotificationPayload | null {
  const data = notification.request.content.data as Record<string, unknown>;
  if (!data?.type || typeof data.type !== 'string') return null;

  if (data.type === 'queue_update') {
    return {
      type: 'queue_update',
      bookingId: String(data.bookingId ?? ''),
      patientsAhead: Number(data.patientsAhead ?? 0),
    };
  }
  if (data.type === 'turn_soon') {
    return { type: 'turn_soon', bookingId: String(data.bookingId ?? '') };
  }
  if (data.type === 'your_turn') {
    return { type: 'your_turn', bookingId: String(data.bookingId ?? '') };
  }
  return null;
}

// Dev helper — fire a local notification to test the tap flow
export async function sendDevTestNotification(bookingId: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "You're almost up!",
      body: '1 patient ahead of you. Please be ready.',
      data: { type: 'turn_soon', bookingId } satisfies NotificationPayload,
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}
