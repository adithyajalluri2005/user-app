import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  message: string;
  sub?: string;
}

export function EmptyState({ message, sub }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
