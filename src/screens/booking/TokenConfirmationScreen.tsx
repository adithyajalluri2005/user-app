import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAsync } from '../../hooks/useAsync';
import { getUpcomingBookings } from '../../api/client';
import { ErrorState } from '../../components/ErrorState';
import type { SearchStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<SearchStackParamList, 'TokenConfirmation'>;
  route: RouteProp<SearchStackParamList, 'TokenConfirmation'>;
}

const SESSION_DISPLAY: Record<string, string> = {
  morning: 'Morning · 9 AM – 1 PM',
  evening: 'Evening · 5 PM – 9 PM',
};

export function TokenConfirmationScreen({ navigation, route }: Props) {
  const { bookingId } = route.params;

  // Fetch upcoming bookings to find this one's details
  const { data: bookings, loading, error, reload } = useAsync(
    () => getUpcomingBookings(),
    []
  );

  // Prevent going back to payment flow
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  // Find the booking — mock always returns booking-1; real backend will include new booking
  const booking = bookings?.find((b) => b.id === bookingId) ?? bookings?.[0];

  if (!booking) {
    return <ErrorState message="Booking not found" />;
  }

  const dateDisplay = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success badge */}
        <View style={styles.successBadge}>
          <Text style={styles.successTick}>✓</Text>
          <Text style={styles.successTitle}>Booking Confirmed</Text>
          <Text style={styles.successSub}>
            Your appointment has been booked successfully
          </Text>
        </View>

        {/* Token display — primary focus */}
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>YOUR TOKEN</Text>
          <Text style={styles.tokenNumber}>{booking.tokenNumber}</Text>
          <Text style={styles.tokenHint}>Show this number at the reception</Text>
        </View>

        {/* Booking details */}
        <View style={styles.detailCard}>
          <DetailRow label="Doctor"    value={booking.doctorName} />
          <DetailRow label="Hospital"  value={booking.clinicName} />
          <DetailRow label="Date"      value={dateDisplay} />
          <DetailRow label="Session"   value={SESSION_DISPLAY[booking.session] ?? booking.session} />
          <DetailRow label="Fee paid"  value={`₹${booking.fee}`} last />
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.replace('QueueTracker', {
              bookingId: booking.id,
              doctorId: booking.doctorId,
              sessionDate: booking.date,
              sessionType: booking.sessionType,
              tokenNumber: String(booking.tokenNumber),
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Track My Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryBtnText}>Back to Search</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, gap: 20, paddingBottom: 40 },

  successBadge: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  successTick: {
    fontSize: 40,
    color: '#fff',
    backgroundColor: '#22C55E',
    width: 72,
    height: 72,
    borderRadius: 36,
    textAlign: 'center',
    lineHeight: 72,
    overflow: 'hidden',
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  successSub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  tokenCard: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93C5FD',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tokenNumber: { fontSize: 80, fontWeight: '900', color: '#fff', lineHeight: 90 },
  tokenHint: { fontSize: 13, color: '#BFDBFE', marginTop: 4 },

  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', minWidth: 72 },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },

  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  secondaryBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
});
