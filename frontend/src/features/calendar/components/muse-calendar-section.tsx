import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiMessage } from '@features/auth/api/auth-api';
import { useAuthStore } from '@features/auth/store/auth-store';
import {
  calendarApi,
  type CalendarEvent,
  type CalendarEventPayload,
  type CalendarEventType,
} from '@features/calendar/api/calendar-api';
import { Button } from '@shared/components/ui/button';
import { FormField } from '@shared/components/ui/form-field';
import { Input } from '@shared/components/ui/input';
import { Modal } from '@shared/components/ui/modal';
import { Select } from '@shared/components/ui/select';
import { StatePanel } from '@shared/components/ui/state-panel';
import { cn } from '@shared/lib/cn';

type CalendarForm = {
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  eventType: CalendarEventType;
  location: string;
  description: string;
};

type CalendarDay = {
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
};

type MultiDayEventSegment = {
  event: CalendarEvent;
  startIndex: number;
  span: number;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
};

const emptyForm: CalendarForm = {
  title: '',
  startAt: '',
  endAt: '',
  allDay: false,
  eventType: 'EVENT',
  location: '',
  description: '',
};

const eventTypeMeta: Record<
  CalendarEventType,
  { label: string; className: string; barClassName: string; accentClassName: string }
> = {
  PERFORMANCE: {
    label: '공연',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
    barClassName: 'bg-[#8cced0]/90 text-[#14323f]',
    accentClassName: 'bg-[#8cced0]',
  },
  PRACTICE: {
    label: '합주',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    barClassName: 'bg-[#b9dfb9]/90 text-[#14323f]',
    accentClassName: 'bg-[#8abf8a]',
  },
  MEETING: {
    label: '회의',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    barClassName: 'bg-[#c9d8ff]/90 text-[#14323f]',
    accentClassName: 'bg-[#9cb4ff]',
  },
  EVENT: {
    label: '행사',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    barClassName: 'bg-[#df5b64]/90 text-white',
    accentClassName: 'bg-[#df5b64]',
  },
};

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function toDateTimeInput(value: string) {
  return value.slice(0, 16);
}

function toDatePart(value: string) {
  return toDateTimeInput(value).slice(0, 10);
}

function toAllDayStart(dateKey: string) {
  return `${dateKey}T00:00`;
}

function toAllDayEnd(dateKey: string) {
  return `${dateKey}T23:59`;
}

function isAllDayEvent(event: CalendarEvent) {
  return event.startAt.slice(11, 16) === '00:00' && event.endAt.slice(11, 16) === '23:59';
}

function formatEventTimeRange(event: CalendarEvent) {
  if (isAllDayEvent(event)) {
    return '하루 종일';
  }

  return `${formatEventTime(event.startAt)} - ${formatEventTime(event.endAt)}`;
}

function getMonthRange(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const calendarStart = addDays(firstDay, -firstDay.getDay());
  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = addDays(calendarStart, i);
    days.push({
      dateKey: toDateInput(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    });
  }

  return days;
}

function chunkWeeks(days: CalendarDay[]) {
  const weeks: CalendarDay[][] = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

function getEventStartDateKey(event: CalendarEvent) {
  return event.startAt.slice(0, 10);
}

function getEventEndDateKey(event: CalendarEvent) {
  return event.endAt.slice(0, 10);
}

function isMultiDayEvent(event: CalendarEvent) {
  return getEventStartDateKey(event) !== getEventEndDateKey(event);
}

function isEventOnDate(event: CalendarEvent, dateKey: string) {
  return getEventStartDateKey(event) <= dateKey && getEventEndDateKey(event) >= dateKey;
}

function buildMultiDayEventSegments(week: CalendarDay[], events: CalendarEvent[]) {
  const weekStartKey = week[0].dateKey;
  const weekEndKey = week[6].dateKey;

  return events
    .filter((event) => {
      if (!isMultiDayEvent(event)) {
        return false;
      }

      return getEventStartDateKey(event) <= weekEndKey && getEventEndDateKey(event) >= weekStartKey;
    })
    .slice(0, 2)
    .map<MultiDayEventSegment>((event, lane) => {
      const eventStartKey = getEventStartDateKey(event);
      const eventEndKey = getEventEndDateKey(event);
      const startIndex = Math.max(
        0,
        week.findIndex((day) => day.dateKey >= eventStartKey),
      );
      let endIndex = -1;

      for (let i = week.length - 1; i >= 0; i -= 1) {
        if (week[i].dateKey <= eventEndKey) {
          endIndex = i;
          break;
        }
      }

      const safeEndIndex = endIndex === -1 ? startIndex : endIndex;

      return {
        event,
        startIndex,
        span: safeEndIndex - startIndex + 1,
        lane,
        isStart: eventStartKey >= weekStartKey,
        isEnd: eventEndKey <= weekEndKey,
      };
    });
}

function formatMonthLabel(monthDate: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(monthDate);
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formFromEvent(event: CalendarEvent): CalendarForm {
  const allDay = isAllDayEvent(event);

  return {
    title: event.title,
    startAt: toDateTimeInput(event.startAt),
    endAt: toDateTimeInput(event.endAt),
    allDay,
    eventType: event.eventType,
    location: event.location ?? '',
    description: event.description ?? '',
  };
}

function payloadFromForm(form: CalendarForm): CalendarEventPayload {
  const startAt = form.allDay ? toAllDayStart(form.startAt) : form.startAt;
  const endAt = form.allDay ? toAllDayEnd(form.endAt) : form.endAt;

  return {
    title: form.title.trim(),
    startAt,
    endAt,
    eventType: form.eventType,
    location: form.location.trim() || null,
    description: form.description.trim() || null,
  };
}

export function MuseCalendarSection() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()));
  const [isDayEventsModalOpen, setIsDayEventsModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<CalendarForm>(emptyForm);

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const calendarWeeks = useMemo(() => chunkWeeks(calendarDays), [calendarDays]);
  const calendarRange = useMemo(
    () => ({
      startDate: calendarDays[0]?.dateKey ?? getMonthRange(monthDate).startDate,
      endDate: calendarDays[calendarDays.length - 1]?.dateKey ?? getMonthRange(monthDate).endDate,
    }),
    [calendarDays, monthDate],
  );
  const todayDate = toDateInput(new Date());
  const eventsQuery = useQuery({
    queryKey: ['calendar-events', calendarRange.startDate, calendarRange.endDate],
    queryFn: () => calendarApi.getEvents(calendarRange.startDate, calendarRange.endDate),
  });

  const events = eventsQuery.data?.data ?? [];
  const eventsByDate = useMemo(
    () =>
      calendarDays.reduce<Record<string, CalendarEvent[]>>((groups, day) => {
        groups[day.dateKey] = events.filter((event) => isEventOnDate(event, day.dateKey));
        return groups;
      }, {}),
    [calendarDays, events],
  );
  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const todayEvents = eventsByDate[todayDate] ?? [];
  const formStartValue = form.allDay ? toAllDayStart(form.startAt) : form.startAt;
  const formEndValue = form.allDay ? toAllDayEnd(form.endAt) : form.endAt;
  const isFormValid = Boolean(form.title.trim() && form.startAt && form.endAt && formEndValue > formStartValue);

  const invalidateEvents = async () => {
    await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
    setForm(emptyForm);
  };

  const openCreateForm = () => {
    const defaultStartAt = `${selectedDate}T19:00`;
    const defaultEndAt = `${selectedDate}T21:00`;
    setIsDayEventsModalOpen(false);
    setEditingEvent(null);
    setForm({ ...emptyForm, startAt: defaultStartAt, endAt: defaultEndAt, allDay: false });
    setIsFormOpen(true);
  };

  const toggleAllDay = (allDay: boolean) => {
    setForm((current) => {
      if (current.allDay === allDay) {
        return current;
      }

      if (allDay) {
        return {
          ...current,
          allDay: true,
          startAt: toDatePart(current.startAt || `${selectedDate}T00:00`),
          endAt: toDatePart(current.endAt || current.startAt || `${selectedDate}T00:00`),
        };
      }

      return {
        ...current,
        allDay: false,
        startAt: `${current.startAt || selectedDate}T09:00`,
        endAt: `${current.endAt || current.startAt || selectedDate}T10:00`,
      };
    });
  };

  const openEditForm = (event: CalendarEvent) => {
    setIsDayEventsModalOpen(false);
    setEditingEvent(event);
    setForm(formFromEvent(event));
    setIsFormOpen(true);
  };

  const selectDate = (dateKey: string) => {
    setSelectedDate(dateKey);

    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setIsDayEventsModalOpen(true);
    }
  };

  const createMutation = useMutation({
    mutationFn: calendarApi.createEvent,
    onSuccess: async (response) => {
      setSelectedDate(response.data.startAt.slice(0, 10));
      closeForm();
      await invalidateEvents();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: number; payload: CalendarEventPayload }) =>
      calendarApi.updateEvent(eventId, payload),
    onSuccess: async (response) => {
      setSelectedDate(response.data.startAt.slice(0, 10));
      closeForm();
      await invalidateEvents();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: calendarApi.deleteEvent,
    onSuccess: async () => {
      setDeletingEvent(null);
      await invalidateEvents();
    },
  });

  const moveMonth = (amount: number) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8350]">Calendar</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-tight text-[#241b42] md:text-[2.35rem]">
            MUSE 일정
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#6f678b]">
            뮤즈의 공연, 합주, 회의, 행사를 한눈에 확인해요.
          </p>
        </div>
        {isAuthenticated ? (
          <Button className="hidden md:inline-flex md:w-auto" onClick={openCreateForm}>
            일정 등록
          </Button>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-[rgba(95,75,182,0.1)] bg-white p-4 shadow-[0_12px_28px_rgba(52,35,110,0.05)] md:hidden">
        <div>
          <p className="text-xs font-semibold text-[#5a43ba]">오늘 일정</p>
          <h3 className="mt-1 text-xl font-semibold text-[#241b42]">
            {new Intl.DateTimeFormat('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            }).format(new Date(`${todayDate}T00:00:00`))}
          </h3>
        </div>

        <div className="mt-4 space-y-3">
          {eventsQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
              <div className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
            </div>
          ) : eventsQuery.isError ? (
            <StatePanel tone="danger" title="일정을 불러오지 못했습니다." description={toApiMessage(eventsQuery.error)} />
          ) : todayEvents.length ? (
            todayEvents.map((event) => {
              const meta = eventTypeMeta[event.eventType];

              return (
                <article key={event.eventId} className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2.5 py-1 text-xs font-bold', meta.className)}>
                      {meta.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {formatEventTimeRange(event)}
                    </span>
                  </div>
                  <h4 className="mt-3 break-words text-base font-semibold text-slate-950">{event.title}</h4>
                  {event.location ? <p className="mt-1 text-sm text-slate-600">장소: {event.location}</p> : null}
                  {event.description ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                      {event.description}
                    </p>
                  ) : null}
                </article>
              );
            })
          ) : (
            <StatePanel title="오늘 일정이 없습니다." description="오늘 등록된 일정이 없습니다." />
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-[rgba(36,27,66,0.08)] bg-white px-3 py-4 shadow-[0_12px_28px_rgba(52,35,110,0.05)] md:px-5 md:py-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => moveMonth(-1)}>
              이전
            </Button>
            <p className="text-lg font-semibold text-[#241b42]">{formatMonthLabel(monthDate)}</p>
            <Button variant="ghost" size="sm" onClick={() => moveMonth(1)}>
              다음
            </Button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-bold md:text-sm">
            {weekdayLabels.map((label, index) => (
              <div
                key={label}
                className={cn(
                  'py-2',
                  index === 0 ? 'text-rose-500' : '',
                  index === 6 ? 'text-sky-500' : '',
                  index !== 0 && index !== 6 ? 'text-slate-500' : '',
                )}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-1 md:space-y-2">
            {calendarWeeks.map((week) => {
              const multiDaySegments = buildMultiDayEventSegments(week, events);

              return (
                <div key={week[0].dateKey} className="relative">
                  <div className="grid grid-cols-7">
                    {week.map((day) => {
                      const dayEvents = day.day === null ? [] : eventsByDate[day.dateKey] ?? [];
                      const singleDayEvents = dayEvents.filter((event) => !isMultiDayEvent(event));
                      const isSelected = selectedDate === day.dateKey;
                      const isToday = day.dateKey === todayDate;
                      const dayOfWeek = new Date(`${day.dateKey}T00:00:00`).getDay();

                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => selectDate(day.dateKey)}
                          className={cn(
                            'relative h-[92px] px-1.5 py-2 text-left transition md:h-[126px] md:px-2',
                            'hover:bg-slate-50/70',
                            isSelected ? 'rounded-[10px] ring-2 ring-[#13a78b] ring-offset-[-2px]' : '',
                          )}
                        >
                          <span
                            className={cn(
                              'relative z-20 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-bold md:text-base',
                              day.inCurrentMonth ? 'text-slate-900' : 'text-slate-300',
                              dayOfWeek === 0 && day.inCurrentMonth ? 'text-rose-500' : '',
                              dayOfWeek === 6 && day.inCurrentMonth ? 'text-sky-600' : '',
                              isToday ? 'bg-rose-500 text-white' : '',
                            )}
                          >
                            {day.day}
                          </span>
                          <div className="mt-8 min-h-0 space-y-1 overflow-hidden md:mt-9">
                            {singleDayEvents.slice(0, 1).map((event) => (
                              <span
                                key={event.eventId}
                                className="flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold text-slate-700 md:text-xs"
                              >
                                <span
                                  className={cn(
                                    'h-4 w-1 shrink-0 rounded-full',
                                    eventTypeMeta[event.eventType].accentClassName,
                                  )}
                                />
                                <span className="truncate">{event.title}</span>
                              </span>
                            ))}
                            {singleDayEvents.length > 1 ? (
                              <span className="block px-1 text-[10px] font-bold text-slate-400">
                                +{singleDayEvents.length - 1}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 top-[44px] z-20 md:top-[50px]">
                    {multiDaySegments.map((segment) => {
                      const meta = eventTypeMeta[segment.event.eventType];

                      return (
                        <div
                          key={`${week[0].dateKey}-${segment.event.eventId}`}
                          className={cn(
                            'absolute h-[18px] truncate px-1.5 text-[10px] font-semibold leading-[18px] md:h-5 md:text-xs md:leading-5',
                            meta.barClassName,
                            segment.isStart ? 'rounded-l-[4px]' : '',
                            segment.isEnd ? 'rounded-r-[4px]' : '',
                          )}
                          style={{
                            left: `${(segment.startIndex / 7) * 100}%`,
                            top: `${segment.lane * 22}px`,
                            width: `${(segment.span / 7) * 100}%`,
                          }}
                        >
                          {segment.isStart ? segment.event.title : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="hidden rounded-[28px] border border-[rgba(95,75,182,0.1)] bg-white p-4 shadow-[0_12px_28px_rgba(52,35,110,0.05)] md:block md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#5a43ba]">Selected day</p>
              <h3 className="mt-1 text-xl font-semibold text-[#241b42]">
                {new Intl.DateTimeFormat('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                }).format(new Date(`${selectedDate}T00:00:00`))}
              </h3>
            </div>
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={openCreateForm}>
                추가
              </Button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {eventsQuery.isLoading ? (
              <div className="space-y-2">
                <div className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
                <div className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
              </div>
            ) : eventsQuery.isError ? (
              <StatePanel tone="danger" title="일정을 불러오지 못했습니다." description={toApiMessage(eventsQuery.error)} />
            ) : selectedEvents.length ? (
              selectedEvents.map((event) => {
                const meta = eventTypeMeta[event.eventType];

                return (
                  <article key={event.eventId} className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full border px-2.5 py-1 text-xs font-bold', meta.className)}>
                        {meta.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatEventTimeRange(event)}
                      </span>
                    </div>
                    <h4 className="mt-3 break-words text-base font-semibold text-slate-950">{event.title}</h4>
                    {event.location ? <p className="mt-1 text-sm text-slate-600">장소: {event.location}</p> : null}
                    {event.description ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                        {event.description}
                      </p>
                    ) : null}
                    {isAuthenticated ? (
                      <div className="mt-3 flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(event)}>
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => {
                            setIsDayEventsModalOpen(false);
                            setDeletingEvent(event);
                          }}
                        >
                          삭제
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <StatePanel title="일정이 없습니다." description="선택한 날짜에는 등록된 일정이 없습니다." />
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={isDayEventsModalOpen}
        title={new Intl.DateTimeFormat('ko-KR', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }).format(new Date(`${selectedDate}T00:00:00`))}
        onClose={() => setIsDayEventsModalOpen(false)}
        headerActions={
          isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={openCreateForm}>
              추가
            </Button>
          ) : null
        }
      >
        <div className="space-y-3">
          {eventsQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
              <div className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
            </div>
          ) : eventsQuery.isError ? (
            <StatePanel tone="danger" title="일정을 불러오지 못했습니다." description={toApiMessage(eventsQuery.error)} />
          ) : selectedEvents.length ? (
            selectedEvents.map((event) => {
              const meta = eventTypeMeta[event.eventType];

              return (
                <article key={event.eventId} className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2.5 py-1 text-xs font-bold', meta.className)}>
                      {meta.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {formatEventTimeRange(event)}
                    </span>
                  </div>
                  <h4 className="mt-3 break-words text-base font-semibold text-slate-950">{event.title}</h4>
                  {event.location ? <p className="mt-1 text-sm text-slate-600">장소: {event.location}</p> : null}
                  {event.description ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                      {event.description}
                    </p>
                  ) : null}
                  {isAuthenticated ? (
                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditForm(event)}>
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => {
                          setIsDayEventsModalOpen(false);
                          setDeletingEvent(event);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <StatePanel title="일정이 없습니다." description="선택한 날짜에는 등록된 일정이 없습니다." />
          )}
        </div>
      </Modal>

      <Modal
        open={isFormOpen}
        title={editingEvent ? '일정 수정' : '일정 등록'}
        onClose={closeForm}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm}>
              취소
            </Button>
            <Button
              disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                const payload = payloadFromForm(form);
                if (editingEvent) {
                  updateMutation.mutate({ eventId: editingEvent.eventId, payload });
                  return;
                }
                createMutation.mutate(payload);
              }}
            >
              {createMutation.isPending || updateMutation.isPending
                ? '저장 중...'
                : editingEvent
                  ? '수정하기'
                  : '등록하기'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="일정 제목" className="md:col-span-2">
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="예: 정기 합주"
            />
          </FormField>
          <FormField label="일정 유형">
            <Select
              value={form.eventType}
              onChange={(event) =>
                setForm((current) => ({ ...current, eventType: event.target.value as CalendarEventType }))
              }
            >
              <option value="EVENT">행사</option>
              <option value="PERFORMANCE">공연</option>
              <option value="PRACTICE">합주</option>
              <option value="MEETING">회의</option>
            </Select>
          </FormField>
          <FormField label="장소">
            <Input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="예: 동아리방"
            />
          </FormField>
          <div className="md:col-span-2 flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition',
                !form.allDay ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500',
              )}
              onClick={() => toggleAllDay(false)}
            >
              시간
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition',
                form.allDay ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500',
              )}
              onClick={() => toggleAllDay(true)}
            >
              하루 종일
            </button>
          </div>
          <FormField label={form.allDay ? '시작 날짜' : '시작 시간'}>
            <Input
              type={form.allDay ? 'date' : 'datetime-local'}
              value={form.startAt}
              onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
            />
          </FormField>
          <FormField
            label={form.allDay ? '종료 날짜' : '종료 시간'}
            error={
              form.startAt && form.endAt && formEndValue <= formStartValue
                ? form.allDay
                  ? '종료 날짜는 시작 날짜보다 빠를 수 없습니다.'
                  : '종료 시간은 시작 시간보다 뒤여야 합니다.'
                : undefined
            }
          >
            <Input
              type={form.allDay ? 'date' : 'datetime-local'}
              value={form.endAt}
              onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))}
            />
          </FormField>
          <FormField label="설명" className="md:col-span-2">
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-300/90 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14323f] focus:ring-4 focus:ring-[#d8e5e9]"
              placeholder="일정 설명을 입력해 주세요."
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={deletingEvent !== null}
        title="일정 삭제"
        description={deletingEvent ? `"${deletingEvent.title}" 일정을 삭제할까요?` : undefined}
        onClose={() => setDeletingEvent(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeletingEvent(null)}>
              취소
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!deletingEvent || deleteMutation.isPending}
              onClick={() => {
                if (deletingEvent) {
                  deleteMutation.mutate(deletingEvent.eventId);
                }
              }}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-7 text-slate-600">삭제한 일정은 캘린더에서 완전히 삭제됩니다.</p>
      </Modal>
    </section>
  );
}
