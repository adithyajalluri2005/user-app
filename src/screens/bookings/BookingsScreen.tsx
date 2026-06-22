import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAsync } from '../../hooks/useAsync';
import { getUpcomingBookings, getPastBookings } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import type { Booking } from '../../types';
import type { BookingsStackParamList } from '../../navigation/types';

type Tab = 'upcoming' | 'past';

interface Props {
  navigation: NativeStackNavigationProp<BookingsStackParamList, 'Bookings'>;
}

const SESSION_LABEL: Record<string, string> = {
  morning: 'Morning',
  evening: 'Evening',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  confirmed:   { label: 'Confirmed',  bg: '#EFF6FF', text: '#1D4ED8' },
  completed:   { label: 'Completed',  bg: '#F0FDF4', text: '#166534' },
  cancelled:   { label: 'Cancelled',  bg: '#FEF2F2', text: '#991B1B' },
};

function formatDate(iso: string): string {
  const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BookingsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('upcoming');

  const {
    data: upcoming,
    loading: upcomingLoading,
    error: upcomingError,
    reload: reloadUpcoming,
  } = useAsync(() => getUpcomingBookings(), []);

  const {
    data: past,
    loading: pastLoading,
    error: pastError,
    reload: reloadPast,
  } = useAsync(() => getPastBookings(), []);

  const renderUpcoming: ListRenderItem<Booking> = useCallback(
    ({ item }) => {
      const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.confirmed;
      return (
        <View style={styles.card}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarSm}>
              <Text style={styles.avatarSmText}>
                {item.doctorName.replace(/^Dr\.\s*/i, '')[0]}
              </Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.doctorName}>{item.doctorName}</Text>
              <Text style={styles.clinicName}>{item.clinicName}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.text }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details row */}
          <View style={styles.detailsRow}>
            <DetailChip icon="📅" value={formatDate(item.date)} />
            <DetailChip icon="🕐" value={SESSION_LABEL[item.session] ?? item.session} />
            <DetailChip icon="🎫" value={`Token #${item.tokenNumber}`} />
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <View style={styles.feeChip}>
              <Text style={styles.feeText}>₹{item.fee} paid</Text>
            </View>
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() =>
                navigation.navigate('QueueTracker', {
                  bookingId: item.id,
                  doctorId: item.doctorId,
                  sessionDate: item.date,
                  sessionType: item.sessionType,
                  tokenNumber: item.tokenNumber,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.trackBtnText}>Track Queue →</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [navigation]
  );

  const renderPast: ListRenderItem<Booking> = useCallback(({ item }) => {
    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.completed;
    return (
      <View style={[styles.card, styles.cardPast]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarSm, styles.avatarSmPast]}>
            <Text style={[styles.avatarSmText, styles.avatarSmTextPast]}>
              {item.doctorName.replace(/^Dr\.\s*/i, '')[0]}
            </Text>
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.doctorName}>{item.doctorName}</Text>
            <Text style={styles.clinicName}>{item.clinicName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.text }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <DetailChip icon="📅" value={formatDate(item.date)} />
          <DetailChip icon="🕐" value={SESSION_LABEL[item.session] ?? item.session} />
          <DetailChip icon="💳" value={`₹${item.fee}`} />
        </View>
      </View>
    );
  }, []);

  const isLoading = tab === 'upcoming' ? upcomingLoading : pastLoading;
  const error     = tab === 'upcoming' ? upcomingError  : pastError;
  const reload    = tab === 'upcoming' ? reloadUpcoming : reloadPast;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
            {t === 'upcoming' && (upcoming?.length ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{upcoming!.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={reload} />
      )}

      {!isLoading && !error && tab === 'upcoming' && (
        <FlatList
          data={upcoming ?? []}
          keyExtractor={(b) => b.id}
          renderItem={renderUpcoming}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              message="No upcoming bookings"
              sub="Book an appointment to get started"
            />
          }
          onRefresh={reloadUpcoming}
          refreshing={upcomingLoading}
        />
      )}

      {!isLoading && !error && tab === 'past' && (
        <FlatList
          data={past ?? []}
          keyExtractor={(b) => b.id}
          renderItem={renderPast}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              message="No past bookings"
              sub="Your completed appointments will appear here"
            />
          }
          onRefresh={reloadPast}
          refreshing={pastLoading}
        />
      )}
    </SafeAreaView>
  );
}

function DetailChip({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.detailChip}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#111827' },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  badge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  list: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPast: { opacity: 0.85 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  avatarSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmPast: { backgroundColor: '#F3F4F6' },
  avatarSmText: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  avatarSmTextPast: { color: '#9CA3AF' },
  cardHeaderInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  clinicName: { fontSize: 12, color: '#6B7280', marginTop: 1 },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#F9FAFB', marginHorizontal: 14 },

  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 14,
    paddingTop: 10,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  detailIcon: { fontSize: 12 },
  detailValue: { fontSize: 12, color: '#374151', fontWeight: '500' },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  feeChip: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  feeText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  trackBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trackBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
