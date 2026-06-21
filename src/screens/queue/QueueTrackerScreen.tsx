import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQueue } from '../../hooks/useQueue';
import { ErrorState } from '../../components/ErrorState';
import type { SearchStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<SearchStackParamList, 'QueueTracker'>;
  route: RouteProp<SearchStackParamList, 'QueueTracker'>;
}

type StatusConfig = {
  label: string;
  bg: string;
  text: string;
  accent: string;
  tokenBg: string;
  tokenText: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  waiting: {
    label: 'Waiting',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    accent: '#2563EB',
    tokenBg: '#2563EB',
    tokenText: '#fff',
  },
  next: {
    label: "You're Next!",
    bg: '#FFFBEB',
    text: '#92400E',
    accent: '#F59E0B',
    tokenBg: '#F59E0B',
    tokenText: '#fff',
  },
  in_consultation: {
    label: 'In Consultation',
    bg: '#F0FDF4',
    text: '#166534',
    accent: '#22C55E',
    tokenBg: '#22C55E',
    tokenText: '#fff',
  },
  done: {
    label: 'Consultation Done',
    bg: '#F3F4F6',
    text: '#374151',
    accent: '#9CA3AF',
    tokenBg: '#9CA3AF',
    tokenText: '#fff',
  },
};

export function QueueTrackerScreen({ navigation, route }: Props) {
  const { bookingId, doctorId, sessionDate, sessionType, tokenNumber } = route.params;
  const { state, loading, error, connected, reconnect } = useQueue({
    bookingId,
    doctorId,
    sessionDate,
    sessionType,
    tokenNumber,
  });

  // Pulse animation for the "next" state
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (state?.status === 'next') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [state?.status, pulse]);

  // Position flash animation
  const flash = useRef(new Animated.Value(1)).current;
  const prevPosition = useRef<number | null>(null);
  useEffect(() => {
    if (
      state?.position !== undefined &&
      prevPosition.current !== null &&
      state.position !== prevPosition.current
    ) {
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.4, duration: 150, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    if (state?.position !== undefined) {
      prevPosition.current = state.position;
    }
  }, [state?.position, flash]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Connecting to queue…</Text>
      </View>
    );
  }

  if (error || !state) {
    return <ErrorState message={error ?? 'Could not load queue'} onRetry={reconnect} />;
  }

  const config = STATUS_CONFIG[state.status] ?? STATUS_CONFIG.waiting;
  const isDone = state.status === 'done';
  const isNext = state.status === 'next';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Connection status dot */}
        <View style={styles.connRow}>
          <View style={[styles.connDot, { backgroundColor: connected ? '#22C55E' : '#EF4444' }]} />
          <Text style={styles.connText}>
            {connected ? 'Live' : 'Reconnecting…'}
          </Text>
          {!connected && (
            <TouchableOpacity onPress={reconnect} style={styles.reconnectBtn}>
              <Text style={styles.reconnectText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusLabel, { color: config.text }]}>{config.label}</Text>
          {!isDone && (
            <Text style={[styles.statusSub, { color: config.text }]}>
              {isNext
                ? 'Please proceed to the consultation room'
                : `Estimated wait: ${state.estimatedWaitMinutes} min`}
            </Text>
          )}
        </View>

        {/* Main queue card */}
        <View style={styles.queueCard}>
          {/* Position row */}
          <View style={styles.currentRow}>
            <Text style={styles.currentLabel}>Queue Position</Text>
            <Animated.Text style={[styles.currentToken, { opacity: flash }]}>
              #{state.position}
            </Animated.Text>
          </View>

          <View style={styles.divider} />

          {/* Your token — prominent */}
          <View style={styles.yourTokenSection}>
            <Text style={styles.yourLabel}>Your Token</Text>
            <Animated.View
              style={[
                styles.tokenBadge,
                { backgroundColor: config.tokenBg },
                isNext && { transform: [{ scale: pulse }] },
              ]}
            >
              <Text style={[styles.tokenNumber, { color: config.tokenText }]}>
                {state.tokenNumber}
              </Text>
            </Animated.View>
          </View>
        </View>

        {/* Stats row */}
        {!isDone && (
          <View style={styles.statsRow}>
            <StatBox
              value={state.patientsAhead}
              label="Ahead of you"
              accent={config.accent}
            />
            <View style={styles.statDivider} />
            <StatBox
              value={`${state.estimatedWaitMinutes}`}
              label="Minutes est."
              accent={config.accent}
            />
          </View>
        )}

        {/* Visual queue strip */}
        {!isDone && state.patientsAhead <= 8 && (
          <View style={styles.queueStrip}>
            <Text style={styles.queueStripLabel}>Queue position</Text>
            <View style={styles.queueDots}>
              {Array.from({ length: state.patientsAhead + 1 }).map((_, i) => {
                const isYou = i === state.patientsAhead;
                return (
                  <View
                    key={i}
                    style={[
                      styles.queueDot,
                      isYou
                        ? { backgroundColor: config.accent, width: 28, height: 28, borderRadius: 14 }
                        : { backgroundColor: '#E5E7EB' },
                    ]}
                  >
                    {isYou && (
                      <Text style={styles.queueDotYouText}>You</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Done state CTA */}
        {isDone && (
          <View style={styles.doneCard}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>All done!</Text>
            <Text style={styles.doneSub}>
              Your consultation is complete. We hope you feel better soon.
            </Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigation.popToTop()}
            >
              <Text style={styles.doneBtnText}>Back to Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {__DEV__ && (
          <View style={styles.devPanel}>
            <Text style={styles.devNote}>
              Dev: live Socket.io · {process.env.EXPO_PUBLIC_API_URL}
            </Text>
            <TouchableOpacity
              style={styles.devBtn}
              onPress={() => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { sendDevTestNotification } = require('../../services/notifications') as { sendDevTestNotification: (id: string) => void };
                sendDevTestNotification(bookingId);
              }}
            >
              <Text style={styles.devBtnText}>Send test notification (2s)</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB' },
  loadingText: { fontSize: 15, color: '#6B7280' },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },

  connRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
  },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  reconnectBtn: { marginLeft: 4 },
  reconnectText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },

  statusBanner: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: { fontSize: 18, fontWeight: '800' },
  statusSub: { fontSize: 13, opacity: 0.85 },

  queueCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#F9FAFB',
  },
  currentLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  currentToken: { fontSize: 36, fontWeight: '800', color: '#374151' },

  divider: { height: 1, backgroundColor: '#F3F4F6' },

  yourTokenSection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  yourLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  tokenBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tokenNumber: { fontSize: 56, fontWeight: '900', lineHeight: 64 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 4 },
  statDivider: { width: 1, backgroundColor: '#F3F4F6' },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  queueStrip: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    gap: 12,
  },
  queueStripLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  queueDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  queueDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueDotYouText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  doneCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  doneSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  doneBtn: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  devPanel: { alignItems: 'center', gap: 10 },
  devNote: { fontSize: 12, color: '#D1D5DB', textAlign: 'center', fontStyle: 'italic' },
  devBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  devBtnText: { fontSize: 12, color: '#9CA3AF' },
});
