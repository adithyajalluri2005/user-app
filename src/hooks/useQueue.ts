import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import type { QueueState, EtaResult } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface UseQueueParams {
  bookingId: string;
  doctorId: string;
  sessionDate: string;
  sessionType: 'MORNING' | 'EVENING';
  tokenNumber: string;
}

interface UseQueueReturn {
  state: QueueState | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  reconnect: () => void;
}

function etaToState(bookingId: string, eta: EtaResult): QueueState {
  const status =
    eta.patientsAhead === 0 ? 'in_consultation'
    : eta.patientsAhead === 1 ? 'next'
    : 'waiting';
  return {
    bookingId,
    tokenNumber: eta.tokenNumber,
    position: eta.position,
    patientsAhead: eta.patientsAhead,
    estimatedWaitMinutes: eta.etaMinutes,
    total: eta.total,
    status,
  };
}

export function useQueue({
  bookingId,
  doctorId,
  sessionDate,
  sessionType,
  tokenNumber,
}: UseQueueParams): UseQueueReturn {
  const [state, setState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnectTick, setReconnectTick] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const reconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setReconnectTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      setLoading(true);
      setError(null);
      setConnected(false);

      const jwt = await SecureStore.getItemAsync('patient_jwt');
      if (cancelled) return;

      const socket = io(API_BASE, {
        auth: { token: jwt ?? '' },
        transports: ['websocket'],
        reconnection: false,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (cancelled) return;
        socket.emit('join', { doctorId, sessionDate, sessionType, token: tokenNumber });
      });

      socket.on('disconnect', () => {
        if (!cancelled) setConnected(false);
      });

      socket.on('error', (err: { message?: string }) => {
        if (!cancelled) {
          setError(err?.message ?? 'Queue connection error');
          setLoading(false);
          setConnected(false);
        }
      });

      socket.on('snapshot', (data: { kind: string; booking?: string; eta: EtaResult | null }) => {
        if (cancelled) return;
        if (data.kind === 'booking') {
          if (data.eta) {
            setState(etaToState(bookingId, data.eta));
            setConnected(true);
          } else {
            setState({
              bookingId,
              tokenNumber,
              position: 0,
              patientsAhead: 0,
              estimatedWaitMinutes: 0,
              total: 0,
              status: 'done',
            });
            setConnected(true);
          }
          setLoading(false);
        }
      });

      socket.on('eta:update', (data: { booking: string; eta: EtaResult | null }) => {
        if (cancelled || data.booking !== bookingId) return;
        if (data.eta) {
          setState(etaToState(bookingId, data.eta));
        } else {
          setState((prev) =>
            prev ? { ...prev, patientsAhead: 0, estimatedWaitMinutes: 0, status: 'done' } : prev,
          );
        }
      });

      socket.on('connect_error', (err: Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Could not connect to queue');
          setLoading(false);
          setConnected(false);
        }
      });
    };

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [bookingId, doctorId, sessionDate, sessionType, tokenNumber, reconnectTick]);

  return { state, loading, error, connected, reconnect };
}
