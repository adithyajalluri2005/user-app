import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAsync } from '../../hooks/useAsync';
import { getDoctors, getClinics } from '../../api/client';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import type { Doctor, Clinic } from '../../types';
import type { SearchStackParamList } from '../../navigation/types';

type Mode = 'hospitals' | 'doctors';

interface Props {
  navigation: NativeStackNavigationProp<SearchStackParamList, 'Search'>;
}

export function SearchScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>('hospitals');
  const [query, setQuery] = useState('');

  const {
    data: clinics,
    loading: clinicsLoading,
    error: clinicsError,
    reload: reloadClinics,
  } = useAsync(() => getClinics(), []);

  const {
    data: doctorsPage,
    loading: doctorsLoading,
    error: doctorsError,
    reload: reloadDoctors,
  } = useAsync(
    () => getDoctors({ name: query || undefined, pageSize: 20 }),
    [query]
  );

  const filteredClinics = clinics
    ? clinics.filter(
        (c) =>
          !query ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.city && c.city.toLowerCase().includes(query.toLowerCase())) ||
          c.specializations.some((s) =>
            s.toLowerCase().includes(query.toLowerCase())
          )
      )
    : [];

  const renderHospital: ListRenderItem<Clinic> = useCallback(
    ({ item }) => (
      <Card
        style={styles.item}
        onPress={() => navigation.navigate('Hospital', { clinicId: item.id })}
      >
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSub}>
          {[item.city, item.address].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.tags}>
          {item.specializations.slice(0, 3).map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>
      </Card>
    ),
    [navigation]
  );

  const renderDoctor: ListRenderItem<Doctor> = useCallback(
    ({ item }) => (
      <Card
        style={styles.item}
        onPress={() => navigation.navigate('Doctor', { doctorId: item.id })}
      >
        <View style={styles.doctorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.replace(/^Dr\.\s*/i, '')[0]}</Text>
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSub}>{item.specialization}</Text>
            <Text style={styles.itemSub}>{item.clinicName}</Text>
          </View>
          <View style={styles.feeBox}>
            <Text style={styles.feeLabel}>Fee</Text>
            <Text style={styles.feeAmount}>₹{item.fee}</Text>
          </View>
        </View>
      </Card>
    ),
    [navigation]
  );

  const isLoading = mode === 'hospitals' ? clinicsLoading : doctorsLoading;
  const error = mode === 'hospitals' ? clinicsError : doctorsError;
  const reload = mode === 'hospitals' ? reloadClinics : reloadDoctors;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Care</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={
            mode === 'hospitals'
              ? 'Search hospitals, cities, specializations…'
              : 'Search doctors by name or specialization…'
          }
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {(['hospitals', 'doctors'] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => { setMode(m); setQuery(''); }}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'hospitals' ? 'Hospitals' : 'Doctors'}
            </Text>
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

      {!isLoading && !error && mode === 'hospitals' && (
        <FlatList
          data={filteredClinics}
          keyExtractor={(c) => c.id}
          renderItem={renderHospital}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              message="No hospitals found"
              sub={query ? 'Try a different search term' : undefined}
            />
          }
        />
      )}

      {!isLoading && !error && mode === 'doctors' && (
        <FlatList
          data={doctorsPage?.items ?? []}
          keyExtractor={(d) => d.id}
          renderItem={renderDoctor}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              message="No doctors found"
              sub={query ? 'Try a different search term' : undefined}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#111827' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 10 },
  clearIcon: { fontSize: 14, color: '#9CA3AF', paddingHorizontal: 4 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { marginBottom: 0 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  itemSub: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
  doctorInfo: { flex: 1 },
  feeBox: { alignItems: 'flex-end' },
  feeLabel: { fontSize: 11, color: '#9CA3AF' },
  feeAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
});
