import * as SecureStore from 'expo-secure-store';
import type {
  Clinic,
  Doctor,
  Booking,
  QueueState,
  OtpSendResponse,
  OtpVerifyResponse,
  PaginatedResponse,
  BookingCreateResponse,
  BookingConfirmResponse,
  EtaResult,
} from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('patient_jwt');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    let msg = `${res.status}`;
    try { msg = (JSON.parse(body) as { message?: string }).message ?? msg; } catch { /* */ }
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

async function authedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  return request<T>(path, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<OtpSendResponse> {
  await request<void>('/auth/patient/otp/request', {
    method: 'POST',
    body: JSON.stringify({ mobile: phone }),
  });
  return { message: 'OTP sent successfully', expiresInSeconds: 300 };
}

export async function verifyOtp(phone: string, otp: string): Promise<OtpVerifyResponse> {
  const result = await request<{ token: string; role: string; sub: string }>(
    '/auth/patient/otp/verify',
    { method: 'POST', body: JSON.stringify({ mobile: phone, otp }) },
  );
  return {
    token: result.token,
    patient: { id: result.sub, name: '', phone },
  };
}

// ─── Discovery ───────────────────────────────────────────────────────────────

type BackendClinic = {
  id: string;
  name: string;
  address: string | null;
  contactNumber: string | null;
};

type BackendDoctor = {
  id: string;
  name: string;
  specialization: string | null;
  consultationFee: number;
  clinicId: string;
  clinic?: BackendClinic | null;
};

function toClinic(c: BackendClinic): Clinic {
  return {
    id: c.id,
    name: c.name,
    address: c.address ?? '',
    city: '',
    contactNumber: c.contactNumber,
    specializations: [],
  };
}

function toDoctor(d: BackendDoctor): Doctor {
  return {
    id: d.id,
    name: d.name,
    specialization: d.specialization ?? '',
    consultationFee: d.consultationFee,
    clinicId: d.clinicId,
    clinicName: d.clinic?.name ?? '',
    fee: d.consultationFee,
    availableDays: [],
  };
}

export async function getClinics(): Promise<Clinic[]> {
  const res = await request<{ items: BackendClinic[] }>('/clinics');
  return res.items.map(toClinic);
}

export async function getClinic(id: string): Promise<Clinic> {
  const c = await request<BackendClinic>(`/clinics/${id}`);
  return toClinic(c);
}

export async function getDoctors(params: {
  page?: number;
  pageSize?: number;
  name?: string;
  specialization?: string;
  clinicId?: string;
}): Promise<PaginatedResponse<Doctor>> {
  const qs = new URLSearchParams();
  const q = params.name ?? params.specialization ?? '';
  if (q) qs.set('query', q);
  // fetch a large page when filtering by clinic (backend doesn't support clinicId filter)
  qs.set('pageSize', String(params.clinicId ? 100 : (params.pageSize ?? 20)));
  if (params.page && !params.clinicId) qs.set('page', String(params.page));
  const path = `/doctors?${qs}`;
  const res = await request<{ items: BackendDoctor[]; page: number; pageSize: number; total: number }>(path);
  let items = res.items.map(toDoctor);
  if (params.clinicId) {
    items = items.filter((d) => d.clinicId === params.clinicId);
  }
  return { items, page: res.page, pageSize: res.pageSize, total: items.length };
}

export async function getDoctor(id: string): Promise<Doctor> {
  const d = await request<BackendDoctor>(`/doctors/${id}`);
  return toDoctor(d);
}

// ─── Bookings history ────────────────────────────────────────────────────────

type BackendBooking = {
  id: string;
  doctorId: string;
  doctorName: string | null;
  source: string;
  tokenNumber: string | null;
  sessionDate: string;
  sessionType: 'MORNING' | 'EVENING';
  status: string;
  paymentStatus: string | null;
  consultationStartedAt: string | null;
  consultationEndedAt: string | null;
  createdAt: string;
  archived: boolean;
};

function toBooking(b: BackendBooking): Booking {
  const sessionMap: Record<string, 'morning' | 'evening'> = {
    MORNING: 'morning',
    EVENING: 'evening',
  };
  const statusMap: Record<string, 'confirmed' | 'completed' | 'cancelled'> = {
    PENDING_PAYMENT: 'confirmed',
    BOOKED: 'confirmed',
    ACTIVE: 'confirmed',
    COMPLETED: 'completed',
    NO_SHOW: 'cancelled',
    CANCELLED: 'cancelled',
  };
  return {
    id: b.id,
    doctorId: b.doctorId,
    doctorName: b.doctorName ?? '',
    clinicId: '',
    clinicName: '',
    date: b.sessionDate,
    session: sessionMap[b.sessionType] ?? 'morning',
    sessionType: b.sessionType,
    tokenNumber: b.tokenNumber ? parseInt(b.tokenNumber, 10) : 0,
    status: statusMap[b.status] ?? 'confirmed',
    fee: 0,
    createdAt: b.createdAt,
  };
}

export async function getUpcomingBookings(): Promise<Booking[]> {
  const res = await authedRequest<{ items: BackendBooking[] }>('/me/bookings/upcoming');
  return res.items.map(toBooking);
}

export async function getPastBookings(): Promise<Booking[]> {
  const res = await authedRequest<{ items: BackendBooking[] }>('/me/bookings/past');
  return res.items.map(toBooking);
}

// ─── Payments / booking creation ─────────────────────────────────────────────

export async function createBooking(params: {
  patientId: string;
  doctorId: string;
  date: string;
  sessionType: 'MORNING' | 'EVENING';
}): Promise<BookingCreateResponse> {
  return authedRequest<BookingCreateResponse>('/payments/booking', {
    method: 'POST',
    body: JSON.stringify({
      patientId: params.patientId,
      doctorId: params.doctorId,
      sessionDate: params.date,
      sessionType: params.sessionType,
      source: 'APP',
    }),
  });
}

export async function confirmBooking(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<BookingConfirmResponse> {
  return request<BookingConfirmResponse>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify({
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
    }),
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function registerDevice(fcmToken: string): Promise<void> {
  await authedRequest<{ registered: boolean }>('/notifications/device', {
    method: 'POST',
    body: JSON.stringify({ fcmToken }),
  });
}

// ─── Queue snapshot (initial fetch before socket connects) ───────────────────
// Not a real REST call — socket join gives the snapshot. Kept as no-op shim.
export async function getQueueSnapshot(_bookingId: string): Promise<QueueState | null> {
  return null;
}

// Re-export EtaResult for use in the queue hook
export type { EtaResult };
