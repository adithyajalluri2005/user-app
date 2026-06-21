import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAsync } from '../../hooks/useAsync';
import { getDoctor } from '../../api/client';
import { ErrorState } from '../../components/ErrorState';
import type { SearchStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<SearchStackParamList, 'Doctor'>;
  route: RouteProp<SearchStackParamList, 'Doctor'>;
}

const SESSION_LABELS: Record<string, string> = {
  morning: 'Morning  9 AM – 1 PM',
  afternoon: 'Afternoon  1 PM – 5 PM',
  evening: 'Evening  5 PM – 9 PM',
};

export function DoctorScreen({ navigation, route }: Props) {
  const { doctorId } = route.params;

  const { data: doctor, loading, error, reload } = useAsync(
    () => getDoctor(doctorId),
    [doctorId]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error || !doctor) {
    return <ErrorState message={error ?? 'Doctor not found'} onRetry={reload} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{doctor.name.replace(/^Dr\.\s*/i, '')[0]}</Text>
          </View>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.spec}>{doctor.specialization}</Text>
          <View style={styles.hospitalPill}>
            <Text style={styles.hospitalPillText}>{doctor.clinicName}</Text>
          </View>
        </View>

        {/* Consultation fee */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Consultation Fee</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeAmount}>₹{doctor.fee}</Text>
            <Text style={styles.feeSub}>per visit</Text>
          </View>
        </View>

        {/* Available days */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Available Days</Text>
          <View style={styles.dayChips}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
              (day) => {
                const available = doctor.availableDays.includes(day);
                return (
                  <View
                    key={day}
                    style={[styles.dayChip, available && styles.dayChipActive]}
                  >
                    <Text
                      style={[styles.dayChipText, available && styles.dayChipTextActive]}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </View>
                );
              }
            )}
          </View>
        </View>

        {/* Sessions */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Sessions</Text>
          {Object.entries(SESSION_LABELS).map(([key, label]) => (
            <View key={key} style={styles.sessionRow}>
              <View style={styles.sessionDot} />
              <Text style={styles.sessionText}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Book CTA */}
      <View style={styles.bookBar}>
        <View>
          <Text style={styles.bookFeeLabel}>Fee</Text>
          <Text style={styles.bookFee}>₹{doctor.fee}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('BookingFlow', { doctorId: doctor.id })}
          activeOpacity={0.85}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  scroll: { padding: 20, paddingBottom: 40, gap: 20 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, color: '#2563EB', fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' },
  spec: { fontSize: 15, color: '#6B7280', marginBottom: 10 },
  hospitalPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  hospitalPillText: { fontSize: 13, color: '#2563EB', fontWeight: '500' },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  feeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  feeAmount: { fontSize: 28, fontWeight: '700', color: '#111827' },
  feeSub: { fontSize: 14, color: '#9CA3AF' },
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: '#DBEAFE' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  dayChipTextActive: { color: '#2563EB' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#2563EB' },
  sessionText: { fontSize: 14, color: '#374151' },
  bookBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bookFeeLabel: { fontSize: 12, color: '#9CA3AF' },
  bookFee: { fontSize: 20, fontWeight: '700', color: '#111827' },
  bookButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  bookButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
