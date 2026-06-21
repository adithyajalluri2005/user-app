import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookingsScreen } from '../screens/bookings/BookingsScreen';
import { QueueTrackerScreen } from '../screens/queue/QueueTrackerScreen';
import type { BookingsStackParamList } from './types';

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export function BookingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#111827' },
        headerTintColor: '#2563EB',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QueueTracker"
        component={QueueTrackerScreen}
        options={{ title: 'Your Queue' }}
      />
    </Stack.Navigator>
  );
}
