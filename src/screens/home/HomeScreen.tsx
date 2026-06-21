import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export function HomeScreen() {
  const { patient, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome, {patient?.name ?? 'Patient'}</Text>
        <Text style={styles.sub}>OTP login working against mock API.</Text>
        <Text style={styles.sub}>Next: Hospital search + booking flow.</Text>

        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 15, color: '#6B7280' },
  logout: {
    marginTop: 32,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
});
