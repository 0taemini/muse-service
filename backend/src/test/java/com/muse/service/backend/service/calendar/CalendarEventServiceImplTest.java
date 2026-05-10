package com.muse.service.backend.service.calendar;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.muse.service.backend.dto.calendar.CalendarEventRequest;
import com.muse.service.backend.entity.CalendarEvent;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.CalendarEventRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CalendarEventServiceImplTest {

    @Mock
    private CalendarEventRepository calendarEventRepository;

    @Mock
    private UserRepository userRepository;

    private CalendarEventServiceImpl calendarEventService;

    @BeforeEach
    void setUp() {
        calendarEventService = new CalendarEventServiceImpl(calendarEventRepository, userRepository);
    }

    @Test
    void create_returnsCreatedCalendarEvent() {
        User user = user(7);
        LocalDateTime startAt = LocalDateTime.of(2026, 5, 12, 19, 0);
        LocalDateTime endAt = LocalDateTime.of(2026, 5, 12, 21, 0);

        when(userRepository.findByUserIdAndStatus(7, User.UserStatus.ACTIVE)).thenReturn(Optional.of(user));
        when(calendarEventRepository.save(any(CalendarEvent.class))).thenAnswer(invocation -> {
            CalendarEvent event = invocation.getArgument(0);
            ReflectionTestUtils.setField(event, "eventId", 10);
            ReflectionTestUtils.setField(event, "createdAt", LocalDateTime.of(2026, 5, 8, 12, 0));
            ReflectionTestUtils.setField(event, "updatedAt", LocalDateTime.of(2026, 5, 8, 12, 0));
            return event;
        });

        var response = calendarEventService.create(
                7,
                new CalendarEventRequest(
                        "  정기 합주  ",
                        startAt,
                        endAt,
                        CalendarEvent.EventType.PRACTICE,
                        "동아리방",
                        "합주 일정"
                )
        );

        assertThat(response.eventId()).isEqualTo(10);
        assertThat(response.title()).isEqualTo("정기 합주");
        assertThat(response.eventType()).isEqualTo(CalendarEvent.EventType.PRACTICE);
        assertThat(response.location()).isEqualTo("동아리방");
    }

    @Test
    void create_whenEndAtIsNotAfterStartAt_throwsCustomException() {
        LocalDateTime startAt = LocalDateTime.of(2026, 5, 12, 19, 0);

        assertThatThrownBy(() -> calendarEventService.create(
                7,
                new CalendarEventRequest(
                        "행사",
                        startAt,
                        startAt,
                        CalendarEvent.EventType.EVENT,
                        null,
                        null
                )
        ))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.CALENDAR_EVENT_INVALID_DATE_RANGE));
    }

    @Test
    void getEvents_searchesActiveEventsByDateRange() {
        User user = user(7);
        CalendarEvent event = event(10, user);
        LocalDate startDate = LocalDate.of(2026, 5, 1);
        LocalDate endDate = LocalDate.of(2026, 5, 31);

        when(calendarEventRepository.findActiveBetween(
                startDate.atStartOfDay(),
                endDate.plusDays(1).atStartOfDay()
        )).thenReturn(List.of(event));

        var response = calendarEventService.getEvents(startDate, endDate);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).eventId()).isEqualTo(10);
    }

    @Test
    void getEvents_withoutDateRange_returnsAllActiveEvents() {
        User user = user(7);
        CalendarEvent event = event(10, user);

        when(calendarEventRepository.findAllActive()).thenReturn(List.of(event));

        var response = calendarEventService.getEvents(null, null);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).eventId()).isEqualTo(10);
    }

    @Test
    void update_changesEventDetails() {
        User user = user(7);
        CalendarEvent event = event(10, user);
        LocalDateTime startAt = LocalDateTime.of(2026, 5, 20, 18, 0);
        LocalDateTime endAt = LocalDateTime.of(2026, 5, 20, 19, 0);

        when(calendarEventRepository.findActiveById(10)).thenReturn(Optional.of(event));

        var response = calendarEventService.update(
                10,
                new CalendarEventRequest(
                        "운영 회의",
                        startAt,
                        endAt,
                        CalendarEvent.EventType.MEETING,
                        "온라인",
                        "회의 내용"
                )
        );

        assertThat(response.title()).isEqualTo("운영 회의");
        assertThat(response.eventType()).isEqualTo(CalendarEvent.EventType.MEETING);
        assertThat(response.location()).isEqualTo("온라인");
    }

    @Test
    void delete_removesEvent() {
        User user = user(7);
        CalendarEvent event = event(10, user);

        when(calendarEventRepository.findActiveById(10)).thenReturn(Optional.of(event));

        calendarEventService.delete(10);

        verify(calendarEventRepository).delete(event);
    }

    private CalendarEvent event(Integer eventId, User user) {
        CalendarEvent event = CalendarEvent.builder()
                .title("행사")
                .startAt(LocalDateTime.of(2026, 5, 12, 19, 0))
                .endAt(LocalDateTime.of(2026, 5, 12, 21, 0))
                .eventType(CalendarEvent.EventType.EVENT)
                .location("동아리방")
                .description(null)
                .createdBy(user)
                .build();
        ReflectionTestUtils.setField(event, "eventId", eventId);
        ReflectionTestUtils.setField(event, "createdAt", LocalDateTime.of(2026, 5, 8, 12, 0));
        ReflectionTestUtils.setField(event, "updatedAt", LocalDateTime.of(2026, 5, 8, 12, 0));
        ReflectionTestUtils.setField(event, "isDeleted", Boolean.FALSE);
        return event;
    }

    private User user(Integer userId) {
        User user = User.builder()
                .allUser(null)
                .name("User " + userId)
                .cohort(1)
                .email("user" + userId + "@example.com")
                .password("encoded")
                .nickname("user" + userId)
                .representativeSessionType(null)
                .rank(User.UserRank.ACTIVE)
                .status(User.UserStatus.ACTIVE)
                .role(User.UserRole.USER)
                .build();
        ReflectionTestUtils.setField(user, "userId", userId);
        return user;
    }
}
