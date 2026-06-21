import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAsync } from '../../hooks/useAsync';
import { getDoctor, createBooking, confirmBooking } from '../../api/client';
import { openRazorpayCheckout } from '../../api/payment';
import { useAuth } from '../../hooks/useAuth';
import { ErrorState } from '../../components/ErrorState';
import type { SearchStackParamList } from '../../navigation/types';

type Session = 'morning' | 'evening';

const SESSIONS: { key: Session; label: string; time: string; backendType: 'MORNING' | 'EVENING' }[] = [
  { key: 'morning', label: 'Morning', time: '9:00 AM – 1:00 PM', backendType: 'MORNING' },
  { key: 'evening', label: 'Evening', time: '5:00 PM – 9:00 PM', backendType: 'EVENING' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function buildNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type Step = 'select' | 'review' | 'paying';

interface Props {
  navigation: NativeStackNavigationProp<SearchStackParamList, 'BookingFlow'>;
  route: RouteProp<SearchStackParamList, 'BookingFlow'>;
}

export function BookingFlowScreen({ navigation, route }: Props) {
  const { doctorId } = route.params;
  const { patient } = useAuth();

  const { data: doctor, loading, error, reload } = useAsync(
    () => getDoctor(doctorId),
    [doctorId]
  );

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [step, setStep] = useState<Step>('select');

  const availableDays = useMemo(
    () => (doctor?.availableDays.length ? new Set(doctor.availableDays) : null),
    [doctor]
  );

  const nextDays = useMemo(() => buildNextDays(14), []);

  const canProceed = selectedDate !== null && selectedSession !== null;

  const handlePay = async () => {
    if (!doctor || !selectedDate || !selectedSession || !patient) return;
    setStep('paying');
    const sessionInfo = SESSIONS.find((s) => s.key === selectedSession)!;
    try {
      const order = await createBooking({
        patientId: patient.id,
        doctorId: doctor.id,
        date: formatDateISO(selectedDate),
        sessionType: sessionInfo.backendType,
      });

      const payment = await openRazorpayCheckout({
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
        amount: order.amount,
        currency: 'INR',
        orderId: order.orderId,
        name: doctor.clinicName || doctor.name,
        description: `Consultation with ${doctor.name}`,
      });

      const confirmed = await confirmBooking({
        orderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      });

      navigation.replace('TokenConfirmation', {
        bookingId: confirmed.bookingId,
      });
    } catch (err) {
      setStep('review');
      const msg = err instanceof Error ? err.message : 'Payment failed';
      Alert.alert('Payment failed', msg);
    }
  };

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

  if (step === 'paying') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.payingText}>Processing payment…</Text>
      </View>
    );
  }

  if (step === 'review') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>Review Booking</Text>

          <View style={styles.reviewCard}>
            <ReviewRow label="Doctor"    value={doctor.name} />
            <ReviewRow label="Hospital"  value={doctor.clinicName} />
            <ReviewRow label="Date"      value={formatDateDisplay(selectedDate!)} />
            <ReviewRow
              label="Session"
              value={SESSIONS.find((s) => s.key === selectedSession)!.label + '  (' +
                SESSIONS.find((s) => s.key === selectedSession)!.time + ')'}
            />
          </View>

          <View style={styles.feeCard}>
            <Text style={styles.feeLabelSmall}>Consultation Fee</Text>
            <Text style={styles.feeTotal}>₹{doctor.fee}</Text>
            <Text style={styles.feeNote}>
              Includes GST · Razorpay sandbox (mock)
            </Text>
          </View>

          {__DEV__ && (
            <Text style={styles.devNote}>
              Dev mode: payment is mocked — no real charge
            </Text>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep('select')}
          >
            <Text style={styles.backBtnText}>← Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
            <Text style={styles.payBtnText}>Pay ₹{doctor.fee}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // step === 'select'
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Doctor summary */}
        <View style={styles.doctorSummary}>
          <View style={styles.avatarSm}>
            <Text style={styles.avatarSmText}>
              {doctor.name.replace(/^Dr\.\s*/i, '')[0]}
            </Text>
          </View>
          <View>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.doctorSpec}>{doctor.specialization} · {doctor.clinicName}</Text>
          </View>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {nextDays.map((date) => {
            const dayName = FULL_DAY_NAMES[date.getDay()];
            const available = availableDays === null || availableDays.has(dayName);
            const selected = selectedDate?.toDateString() === date.toDateString();
            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[
                  styles.dateChip,
                  selected && styles.dateChipSelected,
                  !available && styles.dateChipDisabled,
                ]}
                onPress={() => available && setSelectedDate(date)}
                disabled={!available}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    selected && styles.dateChipTextSelected,
                    !available && styles.dateChipTextDisabled,
                  ]}
                >
                  {DAY_NAMES[date.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dateChipNum,
                    selected && styles.dateChipTextSelected,
                    !available && styles.dateChipTextDisabled,
                  ]}
                >
                  {date.getDate()}
                </Text>
                <Text
                  style={[
                    styles.dateChipMonth,
                    selected && styles.dateChipTextSelected,
                    !available && styles.dateChipTextDisabled,
                  ]}
                >
                  {date.toLocaleString('en-IN', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Session picker */}
        <Text style={styles.sectionTitle}>Select Session</Text>
        <View style={styles.sessionList}>
          {SESSIONS.map((s) => {
            const selected = selectedSession === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.sessionChip, selected && styles.sessionChipSelected]}
                onPress={() => setSelectedSession(s.key)}
                activeOpacity={0.75}
              >
                <View style={styles.sessionLeft}>
                  <Text style={[styles.sessionLabel, selected && styles.sessionLabelSelected]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.sessionTime, selected && styles.sessionTimeSelected]}>
                    {s.time}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomFeeLabel}>Fee</Text>
          <Text style={styles.bottomFee}>₹{doctor.fee}</Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, !canProceed && styles.payBtnDisabled]}
          onPress={() => setStep('review')}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>Review →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', gap: 16 },
  payingText: { fontSize: 16, color: '#6B7280' },
  scroll: { padding: 20, paddingBottom: 24, gap: 16 },

  doctorSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatarSm: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  doctorSpec: { fontSize: 13, color: '#6B7280' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 4 },

  dateRow: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  dateChip: {
    width: 58,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 2,
  },
  dateChipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  dateChipDisabled: { backgroundColor: '#F3F4F6', borderColor: '#F3F4F6' },
  dateChipDay: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  dateChipNum: { fontSize: 18, fontWeight: '700', color: '#111827' },
  dateChipMonth: { fontSize: 10, color: '#9CA3AF' },
  dateChipTextSelected: { color: '#fff' },
  dateChipTextDisabled: { color: '#D1D5DB' },

  sessionList: { gap: 10 },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  sessionChipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  sessionLeft: { flex: 1 },
  sessionLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  sessionLabelSelected: { color: '#2563EB' },
  sessionTime: { fontSize: 13, color: '#6B7280' },
  sessionTimeSelected: { color: '#3B82F6' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#2563EB' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },

  reviewCard: {
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
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  reviewLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', minWidth: 72 },
  reviewValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },

  feeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  feeLabelSmall: { fontSize: 12, color: '#3B82F6', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  feeTotal: { fontSize: 36, fontWeight: '800', color: '#1D4ED8' },
  feeNote: { fontSize: 12, color: '#93C5FD', marginTop: 2 },

  devNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bottomFeeLabel: { fontSize: 12, color: '#9CA3AF' },
  bottomFee: { fontSize: 20, fontWeight: '700', color: '#111827' },
  backBtn: { paddingVertical: 13, paddingHorizontal: 16 },
  backBtnText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  payBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  payBtnDisabled: { backgroundColor: '#93C5FD' },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
