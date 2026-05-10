package com.muse.service.backend.service.calendar;

import com.muse.service.backend.dto.calendar.CalendarEventRequest;
import com.muse.service.backend.dto.calendar.CalendarEventResponse;
import java.time.LocalDate;
import java.util.List;

public interface CalendarEventService {

    CalendarEventResponse create(Integer userId, CalendarEventRequest request);

    List<CalendarEventResponse> getEvents(LocalDate startDate, LocalDate endDate);

    CalendarEventResponse getEvent(Integer eventId);

    CalendarEventResponse update(Integer eventId, CalendarEventRequest request);

    void delete(Integer eventId);
}
