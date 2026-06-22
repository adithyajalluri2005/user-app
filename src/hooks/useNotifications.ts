/**
 * useNotifications — call once at app root after the user is authenticated.
 *
 * Registers device token with backend, handles foreground notifications,
 * and deep-links from notification tap → BookingsTab → QueueTracker.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { NavigationContainerRef } from '@react-navigation/native';
import {
  registerDeviceForPush,
  parseNotificationPayload,
  type QueueNotificationData,
} from '../services/notifications';
import type { RootParamList } from '../navigation/types';

type RootNav = NavigationContainerRef<RootParamList>;

function navigateToQueue(nav: RootNav, params: QueueNotificationData): void {
  // Navigate: switch to BookingsTab, then push QueueTracker inside it
  nav.navigate('BookingsTab');
  // Use a short delay so the tab switch settles before pushing the nested screen
  setTimeout(() => {
    nav.navigate('QueueTracker', {
      bookingId: params.bookingId,
      doctorId: params.doctorId,
      sessionDate: params.sessionDate,
      sessionType: params.sessionType,
      tokenNumber: params.tokenNumber,
    });
  }, 50);
}

export function useNotifications(
  isAuthenticated: boolean,
  navigationRef: React.RefObject<RootNav | null>
): void {
  const lastNotificationId = useRef<string | null>(null);

  // Register device token once after login
  useEffect(() => {
    if (!isAuthenticated) return;
    registerDeviceForPush().catch(() => {
      // Non-fatal — silently swallow; user can still use app without push
    });
  }, [isAuthenticated]);

  // Foreground notification listener
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const payload = parseNotificationPayload(notification);
      // OS shows the alert automatically via setNotificationHandler in notifications.ts
      void payload;
    });
    return () => sub.remove();
  }, []);

  // Tap listener — navigate to QueueTracker when user taps a notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      // Deduplicate — iOS can fire this twice on cold start
      if (lastNotificationId.current === id) return;
      lastNotificationId.current = id;

      const payload = parseNotificationPayload(response.notification);
      if (!payload) return;

      const nav = navigationRef.current;
      if (!nav?.isReady()) return;

      navigateToQueue(nav, payload);
    });
    return () => sub.remove();
  }, [navigationRef]);

  // Handle notification that launched the app from killed state
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const payload = parseNotificationPayload(response.notification);
      if (!payload) return;

      const nav = navigationRef.current;
      if (!nav?.isReady()) return;

      navigateToQueue(nav, payload);
    });
  }, [navigationRef]);
}
