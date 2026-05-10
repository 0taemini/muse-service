import { http } from '@shared/api/http';
import type { ApiResponse } from '@shared/types/api';

export type CalendarEventType = 'PERFORMANCE' | 'PRACTICE' | 'MEETING' | 'EVENT';

export interface CalendarEvent {
  eventId: number;
  title: string;
  startAt: string;
  endAt: string;
  eventType: CalendarEventType;
  location: string | null;
  description: string | null;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CalendarEventPayload {
  title: string;
  startAt: string;
  endAt: string;
  eventType: CalendarEventType;
  location?: string | null;
  description?: string | null;
}

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise;
  return response.data;
};

export const calendarApi = {
  getEvents: (startDate: string, endDate: string) =>
    unwrap<CalendarEvent[]>(
      http.get('/api/v1/calendar/events', {
        params: { startDate, endDate },
      }),
    ),
  createEvent: (payload: CalendarEventPayload) =>
    unwrap<CalendarEvent>(http.post('/api/v1/calendar/events', payload)),
  updateEvent: (eventId: number, payload: CalendarEventPayload) =>
    unwrap<CalendarEvent>(http.patch(`/api/v1/calendar/events/${eventId}`, payload)),
  deleteEvent: (eventId: number) =>
    unwrap<void>(http.delete(`/api/v1/calendar/events/${eventId}`)),
};
