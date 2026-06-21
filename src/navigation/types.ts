export type QueueTrackerParams = {
  bookingId: string;
  doctorId: string;
  sessionDate: string;
  sessionType: 'MORNING' | 'EVENING';
  tokenNumber: string;
};

export type SearchStackParamList = {
  Search: undefined;
  Hospital: { clinicId: string };
  Doctor: { doctorId: string };
  BookingFlow: { doctorId: string };
  TokenConfirmation: { bookingId: string };
  QueueTracker: QueueTrackerParams;
};

export type BookingsStackParamList = {
  Bookings: undefined;
  QueueTracker: QueueTrackerParams;
};

export type TabParamList = {
  SearchTab: undefined;
  BookingsTab: undefined;
};

export type RootParamList = TabParamList & BookingsStackParamList & SearchStackParamList;
