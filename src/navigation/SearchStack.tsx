import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchScreen } from '../screens/search/SearchScreen';
import { HospitalScreen } from '../screens/search/HospitalScreen';
import { DoctorScreen } from '../screens/search/DoctorScreen';
import { BookingFlowScreen } from '../screens/booking/BookingFlowScreen';
import { TokenConfirmationScreen } from '../screens/booking/TokenConfirmationScreen';
import { QueueTrackerScreen } from '../screens/queue/QueueTrackerScreen';
import type { SearchStackParamList } from './types';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStack() {
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
        name="Search"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Hospital"
        component={HospitalScreen}
        options={{ title: 'Hospital' }}
      />
      <Stack.Screen
        name="Doctor"
        component={DoctorScreen}
        options={{ title: 'Doctor Profile' }}
      />
      <Stack.Screen
        name="BookingFlow"
        component={BookingFlowScreen}
        options={{ title: 'Book Appointment' }}
      />
      <Stack.Screen
        name="TokenConfirmation"
        component={TokenConfirmationScreen}
        options={{
          title: 'Booking Confirmed',
          headerLeft: () => null, // prevent back to payment
        }}
      />
      <Stack.Screen
        name="QueueTracker"
        component={QueueTrackerScreen}
        options={{ title: 'Your Queue' }}
      />
    </Stack.Navigator>
  );
}
