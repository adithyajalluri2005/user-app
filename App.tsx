import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { NavigationContainerRef } from '@react-navigation/native';
import { AuthContext, useAuthProvider } from './src/hooks/useAuth';
import { useNotifications } from './src/hooks/useNotifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { setupAndroidChannel } from './src/services/notifications';
import type { RootParamList } from './src/navigation/types';

function AppWithAuth() {
  const auth = useAuthProvider();
  const navigationRef = useRef<NavigationContainerRef<RootParamList> | null>(null);

  // Set up Android notification channel once on mount
  useEffect(() => {
    setupAndroidChannel();
  }, []);

  // Wire push notifications — registers device token after login + handles taps
  useNotifications(auth.isAuthenticated, navigationRef);

  return (
    <AuthContext.Provider value={auth}>
      <StatusBar style="dark" />
      <RootNavigator navigationRef={navigationRef} />
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppWithAuth />
    </SafeAreaProvider>
  );
}
