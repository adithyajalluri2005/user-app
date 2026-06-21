import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAsync } from '../../hooks/useAsync';
import { getClinic, getDoctors } from '../../api/client';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import type { Doctor } from '../../types';
import type { SearchStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<SearchStackParamList, 'Hospital'>;
  route: RouteProp<SearchStackParamList, 'Hospital'>;
}

export function HospitalScreen({ navigation, route }: Props) {
  const { clinicId } = route.params;

  const { data: clinic, loading: clinicLoading, error: clinicError, reload: reloadClinic } =
    useAsync(() => getClinic(clinicId), [clinicId]);

  const { data: doctorsPage, loading: doctorsLoading, error: doctorsError, reload: reloadDoctors } =
    useAsync(() => getDoctors({ clinicId, pageSize: 50 }), [clinicId]);

  const renderDoctor: ListRenderItem<Doctor> = useCallback(
    ({ item }) => (
      <Card
        style={styles.doctorCard}
        onPress={() => navigation.navigate('Doctor', { doctorId: item.id })}
      >
        <View style={styles.doctorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.replace(/^Dr\.\s*/i, '')[0]}</Text>
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{item.name}</Text>
            <Text style={styles.doctorSpec}>{item.specialization}</Text>
            {item.availableDays.length > 0 && (
              <Text style={styles.doctorDays}>
                {item.availableDays.slice(0, 3).join(', ')}
                {item.availableDays.length > 3 ? '…' : ''}
              </Text>
            )}
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

  const loading = clinicLoading || doctorsLoading;
  const error = clinicError || doctorsError;
  const reload = () => { reloadClinic(); reloadDoctors(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error || !clinic) {
    return <ErrorState message={error ?? 'Hospital not found'} onRetry={reload} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={doctorsPage?.items ?? []}
        keyExtractor={(d) => d.id}
        renderItem={renderDoctor}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.hospitalHeader}>
            <Text style={styles.hospitalName}>{clinic.name}</Text>
            {!!clinic.city && <Text style={styles.hospitalCity}>{clinic.city}</Text>}
            {!!clinic.address && <Text style={styles.hospitalAddress}>{clinic.address}</Text>}
            {clinic.specializations.length > 0 && (
              <View style={styles.tags}>
                {clinic.specializations.map((s) => (
                  <View key={s} style={styles.tag}>
                    <Text style={styles.tagText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.sectionTitle}>Doctors</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState message="No doctors listed at this hospital" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  list: { padding: 16, gap: 10 },
  hospitalHeader: { marginBottom: 16 },
  hospitalName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  hospitalCity: { fontSize: 15, fontWeight: '600', color: '#2563EB', marginBottom: 2 },
  hospitalAddress: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  doctorCard: { marginBottom: 0 },
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
  doctorName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  doctorSpec: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  doctorDays: { fontSize: 12, color: '#9CA3AF' },
  feeBox: { alignItems: 'flex-end' },
  feeLabel: { fontSize: 11, color: '#9CA3AF' },
  feeAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
});
