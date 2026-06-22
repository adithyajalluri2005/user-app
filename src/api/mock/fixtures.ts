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
} from '../../types';

export const MOCK_CLINICS: Clinic[] = [
  {
    id: 'clinic-1',
    name: 'Apollo Hospitals',
    address: '21 Greams Lane, Off Greams Road',
    city: 'Chennai',
    contactNumber: '+914428290200',
    specializations: ['Cardiology', 'Neurology', 'Orthopedics'],
  },
  {
    id: 'clinic-2',
    name: 'Fortis Healthcare',
    address: '14 Cunningham Road',
    city: 'Bangalore',
    contactNumber: '+918066214444',
    specializations: ['Oncology', 'Dermatology', 'General Medicine'],
  },
  {
    id: 'clinic-3',
    name: 'KIMS Hospital',
    address: '1-8-31/1 Minister Road',
    city: 'Hyderabad',
    contactNumber: '+914044885000',
    specializations: ['Pediatrics', 'ENT', 'Ophthalmology'],
  },
];

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Priya Ramesh',
    specialization: 'Cardiology',
    clinicId: 'clinic-1',
    clinicName: 'Apollo Hospitals',
    fee: 800,
    availableDays: ['Monday', 'Wednesday', 'Friday'],
  },
  {
    id: 'doc-2',
    name: 'Dr. Arun Mehta',
    specialization: 'Neurology',
    clinicId: 'clinic-1',
    clinicName: 'Apollo Hospitals',
    fee: 1000,
    availableDays: ['Tuesday', 'Thursday', 'Saturday'],
  },
  {
    id: 'doc-3',
    name: 'Dr. Sunita Verma',
    specialization: 'Dermatology',
    clinicId: 'clinic-2',
    clinicName: 'Fortis Healthcare',
    fee: 600,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  {
    id: 'doc-4',
    name: 'Dr. Rajesh Kumar',
    specialization: 'Pediatrics',
    clinicId: 'clinic-3',
    clinicName: 'KIMS Hospital',
    fee: 500,
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
  },
];

export const MOCK_UPCOMING_BOOKINGS: Booking[] = [
  {
    id: 'booking-1',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Ramesh',
    clinicId: 'clinic-1',
    clinicName: 'Apollo Hospitals',
    date: '2026-06-25',
    session: 'morning',
    sessionType: 'MORNING',
    tokenNumber: 'A014',
    status: 'confirmed',
    fee: 800,
    createdAt: '2026-06-21T10:00:00Z',
  },
];

export const MOCK_PAST_BOOKINGS: Booking[] = [
  {
    id: 'booking-past-1',
    doctorId: 'doc-3',
    doctorName: 'Dr. Sunita Verma',
    clinicId: 'clinic-2',
    clinicName: 'Fortis Healthcare',
    date: '2026-06-10',
    session: 'afternoon',
    sessionType: 'EVENING',
    tokenNumber: 'E007',
    status: 'completed',
    fee: 600,
    createdAt: '2026-06-09T14:00:00Z',
  },
];

export const MOCK_QUEUE_STATE: QueueState = {
  bookingId: 'booking-1',
  tokenNumber: '14',
  position: 5,
  patientsAhead: 4,
  estimatedWaitMinutes: 20,
  total: 18,
  status: 'waiting',
};

// ASSUMED: OTP endpoints mirror /auth/staff/login pattern
export const mockOtpSend = async (phone: string): Promise<OtpSendResponse> => {
  await delay(800);
  if (phone.length < 10) throw new Error('Invalid phone number');
  return { message: 'OTP sent successfully', expiresInSeconds: 300 };
};

export const mockOtpVerify = async (
  phone: string,
  otp: string
): Promise<OtpVerifyResponse> => {
  await delay(800);
  // Mock: accept "123456" as valid OTP
  if (otp !== '123456') throw new Error('Invalid or expired OTP');
  return {
    token: 'mock-jwt-token-' + phone,
    patient: {
      id: 'patient-1',
      name: 'Test Patient',
      phone,
    },
  };
};

export const mockGetClinics = async (): Promise<Clinic[]> => {
  await delay(500);
  return MOCK_CLINICS;
};

export const mockGetClinic = async (id: string): Promise<Clinic> => {
  await delay(300);
  const clinic = MOCK_CLINICS.find((c) => c.id === id);
  if (!clinic) throw new Error('Clinic not found');
  return clinic;
};

export const mockGetDoctors = async (params: {
  page?: number;
  pageSize?: number;
  name?: string;
  specialization?: string;
  clinicId?: string;
}): Promise<PaginatedResponse<Doctor>> => {
  await delay(500);
  let results = [...MOCK_DOCTORS];
  if (params.name) {
    const q = params.name.toLowerCase();
    results = results.filter((d) => d.name.toLowerCase().includes(q));
  }
  if (params.specialization) {
    results = results.filter((d) =>
      d.specialization.toLowerCase().includes(params.specialization!.toLowerCase())
    );
  }
  if (params.clinicId) {
    results = results.filter((d) => d.clinicId === params.clinicId);
  }
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return {
    items: results.slice(start, start + pageSize),
    page,
    pageSize,
    total: results.length,
  };
};

export const mockGetDoctor = async (id: string): Promise<Doctor> => {
  await delay(300);
  const doctor = MOCK_DOCTORS.find((d) => d.id === id);
  if (!doctor) throw new Error('Doctor not found');
  return doctor;
};

export const mockGetUpcomingBookings = async (): Promise<Booking[]> => {
  await delay(500);
  return MOCK_UPCOMING_BOOKINGS;
};

export const mockGetPastBookings = async (): Promise<Booking[]> => {
  await delay(500);
  return MOCK_PAST_BOOKINGS;
};

// ASSUMED: booking creation returns Razorpay order
export const mockCreateBooking = async (params: {
  doctorId: string;
  date: string;
  session: string;
}): Promise<BookingCreateResponse> => {
  await delay(800);
  const doctor = MOCK_DOCTORS.find((d) => d.id === params.doctorId);
  return {
    bookingId: 'booking-new-' + Date.now(),
    orderId: 'order_mock_' + Date.now(),
    amount: (doctor?.fee ?? 500) * 100, // paise
  };
};

// ASSUMED: confirm after Razorpay payment
export const mockConfirmBooking = async (params: {
  bookingId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<BookingConfirmResponse> => {
  await delay(600);
  return {
    bookingId: params.bookingId,
    tokenNumber: '15',
    alreadyProcessed: false,
  };
};

export const mockRegisterDevice = async (_fcmToken: string): Promise<void> => {
  await delay(300);
};

export const mockGetQueueState = async (bookingId: string): Promise<QueueState> => {
  await delay(400);
  return { ...MOCK_QUEUE_STATE, bookingId };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
