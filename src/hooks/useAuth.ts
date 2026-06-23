import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  sendOtp,
  verifyOtp,
  setAuthErrorHandler,
  storeSession,
  revokeSession,
} from '../api/client';

const TOKEN_KEY = 'patient_jwt';
const REFRESH_KEY = 'patient_refresh';
const PATIENT_KEY = 'patient_info';

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface AuthState {
  token: string | null;
  patient: Patient | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  requestOtp: (phone: string) => Promise<void>;
  confirmOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthProvider(): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    token: null,
    patient: null,
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const [token, patientJson] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(PATIENT_KEY),
        ]);
        setState({
          token,
          patient: patientJson ? (JSON.parse(patientJson) as Patient) : null,
          isLoading: false,
        });
      } catch {
        setState({ token: null, patient: null, isLoading: false });
      }
    })();
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    await sendOtp(phone);
  }, []);

  const confirmOtp = useCallback(async (phone: string, otp: string) => {
    const result = await verifyOtp(phone, otp);
    await Promise.all([
      storeSession(result.token, result.refreshToken),
      SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(result.patient)),
    ]);
    setState({ token: result.token, patient: result.patient, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await revokeSession(); // best-effort server-side revocation
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(PATIENT_KEY),
    ]);
    setState({ token: null, patient: null, isLoading: false });
  }, []);

  // A 401 from any authed request (expired/invalid session) clears the session
  // so the navigator drops the user back to login instead of stranding them.
  useEffect(() => {
    setAuthErrorHandler(() => {
      void logout();
    });
    return () => setAuthErrorHandler(null);
  }, [logout]);

  return {
    ...state,
    isAuthenticated: !!state.token,
    requestOtp,
    confirmOtp,
    logout,
  };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
