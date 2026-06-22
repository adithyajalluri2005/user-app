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
 * Notification payload shape sent by backend (NotificationsService):
 *   data carries: type, token, bookingId, doctorId, sessionDate, sessionType
 *   QUEUE_APPROACHING also carries patientsAhead.
 * The session fields are required so a notification tap can open QueueTracker
 * (which needs them to (re)join the live queue socket).
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerDevice as apiRegisterDevice } from '../api/client';

/** Session fields every queue notification carries — enough to open QueueTracker. */
export type QueueNotificationData = {
  bookingId: string;
  doctorId: string;
  sessionDate: string;
  sessionType: 'MORNING' | 'EVENING';
  tokenNumber: string;
};

export type NotificationPayload =
  | ({ type: 'QUEUE_APPROACHING'; patientsAhead: number } & QueueNotificationData)
  | ({ type: 'ARRIVAL_REMINDER' } & QueueNotificationData)
  | ({ type: 'BOOKING_CONFIRMED' } & QueueNotificationData);

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

  const base: QueueNotificationData = {
    bookingId: String(data.bookingId ?? ''),
    doctorId: String(data.doctorId ?? ''),
    sessionDate: String(data.sessionDate ?? ''),
    sessionType: String(data.sessionType) === 'EVENING' ? 'EVENING' : 'MORNING',
    // backend sends the token under `token`; QueueTracker calls it tokenNumber
    tokenNumber: String(data.token ?? data.tokenNumber ?? ''),
  };
  if (!base.bookingId || !base.doctorId) return null; // can't deep-link without these

  switch (data.type) {
    case 'QUEUE_APPROACHING':
      return { type: 'QUEUE_APPROACHING', patientsAhead: Number(data.patientsAhead ?? 0), ...base };
    case 'ARRIVAL_REMINDER':
      return { type: 'ARRIVAL_REMINDER', ...base };
    case 'BOOKING_CONFIRMED':
      return { type: 'BOOKING_CONFIRMED', ...base };
    default:
      return null;
  }
}

// Dev helper — fire a local notification to test the tap flow
export async function sendDevTestNotification(params: QueueNotificationData): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "You're almost up!",
      body: '1 patient ahead of you. Please be ready.',
      // backend sends the token under `token`; mirror that so the parser agrees
      data: {
        type: 'ARRIVAL_REMINDER',
        token: params.tokenNumber,
        bookingId: params.bookingId,
        doctorId: params.doctorId,
        sessionDate: params.sessionDate,
        sessionType: params.sessionType,
      },
    },
    // null = deliver immediately. Scheduled triggers (TIME_INTERVAL / DATE) are
    // silently dropped by expo-notifications on SDK 56 in this build
    // ("will not trigger in the future, removing"), so immediate is the only
    // delivery that actually fires.
    trigger: null,
  });
}
