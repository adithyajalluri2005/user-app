import React, { useState, useRef, useEffect } from 'react';
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

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

interface Props {
  phone: string;
  onBack: () => void;
  onVerified: () => void;
}

export function OtpScreen({ phone, onBack, onVerified }: Props) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);
  const { confirmOtp, requestOtp } = useAuth();

  useEffect(() => {
    inputRef.current?.focus();
    const timer = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setLoading(true);
    try {
      await confirmOtp(phone, otp);
      onVerified();
    } catch (err) {
      Alert.alert('Invalid OTP', err instanceof Error ? err.message : 'Verification failed');
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await requestOtp(phone);
      setResendCooldown(RESEND_COOLDOWN);
      setOtp('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to resend OTP');
    }
  };

  const displayPhone = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              6-digit code sent to{'\n'}
              <Text style={styles.phone}>{displayPhone}</Text>
            </Text>
          </View>

          {/* Hidden input driving the boxes */}
          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
              setOtp(digits);
              if (digits.length === OTP_LENGTH) {
                // auto-submit when all digits entered
                setTimeout(() => {
                  if (digits.length === OTP_LENGTH) handleVerify();
                }, 100);
              }
            }}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            style={styles.hiddenInput}
            editable={!loading}
          />

          {/* OTP box display */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.otpRow}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  otp.length === i && styles.otpBoxActive,
                  otp.length > i && styles.otpBoxFilled,
                ]}
              >
                <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
              </View>
            ))}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (otp.length !== OTP_LENGTH || loading) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={otp.length !== OTP_LENGTH || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text
                style={[
                  styles.resendLink,
                  resendCooldown > 0 && styles.resendLinkDisabled,
                ]}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <Text style={styles.devHint}>Dev: use OTP 123456</Text>
          )}
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
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 32,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  phone: {
    color: '#111827',
    fontWeight: '600',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 10,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  otpBoxActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  otpBoxFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#fff',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
  },
  devHint: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
