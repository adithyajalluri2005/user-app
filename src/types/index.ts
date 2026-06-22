export interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  contactNumber: string | null;
  imageUrl?: string;
  specializations: string[];
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinicId: string;
  clinicName: string;
  fee: number;
  imageUrl?: string;
  availableDays: string[];
}

export interface Booking {
  id: string;
  doctorId: string;
  doctorName: string;
  clinicId: string;
  clinicName: string;
  date: string;
  session: 'morning' | 'afternoon' | 'evening';
  sessionType: 'MORNING' | 'EVENING';
  tokenNumber: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  fee: number;
  createdAt: string;
}

export interface QueueState {
  bookingId: string;
  tokenNumber: string;
  position: number;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  total: number;
  status: 'waiting' | 'next' | 'in_consultation' | 'done';
}

export interface EtaResult {
  tokenNumber: string;
  patientsAhead: number;
  position: number;
  total: number;
  avgConsultMinutes: number;
  etaMinutes: number;
}

export interface OtpSendResponse {
  message: string;
  expiresInSeconds: number;
}

export interface OtpVerifyResponse {
  token: string;
  patient: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface BookingCreateResponse {
  bookingId: string;
  orderId: string;
  amount: number;
}

export interface BookingConfirmResponse {
  bookingId: string;
  tokenNumber: string;
  alreadyProcessed: boolean;
}
