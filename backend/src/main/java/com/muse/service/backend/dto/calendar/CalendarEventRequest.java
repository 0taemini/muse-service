package com.muse.service.backend.dto.calendar;

import com.muse.service.backend.entity.CalendarEvent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record CalendarEventRequest(
        @NotBlank(message = "일정 제목을 입력해 주세요.")
        @Size(max = 100, message = "일정 제목은 100자 이하로 입력해 주세요.")
        String title,

        @NotNull(message = "일정 시작 시간을 입력해 주세요.")
        LocalDateTime startAt,

        @NotNull(message = "일정 종료 시간을 입력해 주세요.")
        LocalDateTime endAt,

        @NotNull(message = "일정 유형을 선택해 주세요.")
        CalendarEvent.EventType eventType,

        @Size(max = 100, message = "장소는 100자 이하로 입력해 주세요.")
        String location,

        String description
) {
}
