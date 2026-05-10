package com.muse.service.backend.service.calendar;

import com.muse.service.backend.dto.calendar.CalendarEventRequest;
import com.muse.service.backend.dto.calendar.CalendarEventResponse;
import com.muse.service.backend.entity.CalendarEvent;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.CalendarEventRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CalendarEventServiceImpl implements CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public CalendarEventResponse create(Integer userId, CalendarEventRequest request) {
        validateDateRange(request.startAt(), request.endAt());

        User createdBy = userRepository.findByUserIdAndStatus(userId, User.UserStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        CalendarEvent event = calendarEventRepository.save(
                CalendarEvent.builder()
                        .title(request.title().trim())
                        .startAt(request.startAt())
                        .endAt(request.endAt())
                        .eventType(request.eventType())
                        .location(trimToNull(request.location()))
                        .description(trimToNull(request.description()))
                        .createdBy(createdBy)
                        .build()
        );

        return CalendarEventResponse.from(event);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarEventResponse> getEvents(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startAt = startDate == null ? null : startDate.atStartOfDay();
        LocalDateTime endAt = endDate == null ? null : endDate.plusDays(1).atStartOfDay();

        return findEvents(startAt, endAt).stream()
                .map(CalendarEventResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CalendarEventResponse getEvent(Integer eventId) {
        return CalendarEventResponse.from(findActiveEvent(eventId));
    }

    @Override
    @Transactional
    public CalendarEventResponse update(Integer eventId, CalendarEventRequest request) {
        validateDateRange(request.startAt(), request.endAt());

        CalendarEvent event = findActiveEvent(eventId);
        event.updateDetails(
                request.title().trim(),
                request.startAt(),
                request.endAt(),
                request.eventType(),
                trimToNull(request.location()),
                trimToNull(request.description())
        );

        return CalendarEventResponse.from(event);
    }

    @Override
    @Transactional
    public void delete(Integer eventId) {
        CalendarEvent event = findActiveEvent(eventId);
        calendarEventRepository.delete(event);
    }

    private CalendarEvent findActiveEvent(Integer eventId) {
        return calendarEventRepository.findActiveById(eventId)
                .orElseThrow(() -> new CustomException(ErrorCode.CALENDAR_EVENT_NOT_FOUND));
    }

    private List<CalendarEvent> findEvents(LocalDateTime startAt, LocalDateTime endAt) {
        if (startAt != null && endAt != null) {
            return calendarEventRepository.findActiveBetween(startAt, endAt);
        }

        if (startAt != null) {
            return calendarEventRepository.findActiveEndingAfter(startAt);
        }

        if (endAt != null) {
            return calendarEventRepository.findActiveStartingBefore(endAt);
        }

        return calendarEventRepository.findAllActive();
    }

    private void validateDateRange(LocalDateTime startAt, LocalDateTime endAt) {
        if (!endAt.isAfter(startAt)) {
            throw new CustomException(ErrorCode.CALENDAR_EVENT_INVALID_DATE_RANGE);
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}
