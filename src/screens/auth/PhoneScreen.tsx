import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  onOtpSent: (phone: string) => void;
}

export function PhoneScreen({ onOtpSent }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestOtp } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const isValid = phone.replace(/\D/g, '').length === 10;

  const handleSend = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return;
    setLoading(true);
    try {
      await requestOtp(digits);
      onOtpSent(digits);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Patient Flow</Text>
            <Text style={styles.subtitle}>
              Book hospital consultations, track your queue live
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Mobile number</Text>
            <View style={styles.inputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={handleSend}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={!isValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              You'll receive a 6-digit OTP via SMS
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  countryCode: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
});
