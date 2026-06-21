import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { MainTabs } from './MainTabs';
import type { RootParamList } from './types';

type AuthStep = 'phone' | 'otp';

interface Props {
  navigationRef: React.RefObject<NavigationContainerRef<RootParamList> | null>;
}

export function RootNavigator({ navigationRef }: Props) {
  const { isLoading, isAuthenticated } = useAuth();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <NavigationContainer ref={navigationRef as React.RefObject<NavigationContainerRef<RootParamList>>}>
        <MainTabs />
      </NavigationContainer>
    );
  }

  if (step === 'otp') {
    return (
      <OtpScreen
        phone={phone}
        onBack={() => setStep('phone')}
        onVerified={() => {
          // confirmOtp in useAuth updates shared context → re-renders into authenticated branch
        }}
      />
    );
  }

  return (
    <PhoneScreen
      onOtpSent={(p) => {
        setPhone(p);
        setStep('otp');
      }}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
