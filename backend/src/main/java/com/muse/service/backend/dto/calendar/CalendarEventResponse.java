package com.muse.service.backend.dto.calendar;

import com.muse.service.backend.entity.CalendarEvent;
import java.time.LocalDateTime;

public record CalendarEventResponse(
        Integer eventId,
        String title,
        LocalDateTime startAt,
        LocalDateTime endAt,
        CalendarEvent.EventType eventType,
        String location,
        String description,
        Integer createdByUserId,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static CalendarEventResponse from(CalendarEvent event) {
        return new CalendarEventResponse(
                event.getEventId(),
                event.getTitle(),
                event.getStartAt(),
                event.getEndAt(),
                event.getEventType() == null ? CalendarEvent.EventType.EVENT : event.getEventType(),
                event.getLocation(),
                event.getDescription(),
                event.getCreatedBy().getUserId(),
                event.getCreatedBy().getName(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }
}
