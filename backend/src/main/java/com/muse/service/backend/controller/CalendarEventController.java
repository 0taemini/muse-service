package com.muse.service.backend.controller;

import com.muse.service.backend.dto.calendar.CalendarEventRequest;
import com.muse.service.backend.dto.calendar.CalendarEventResponse;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.calendar.CalendarEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "캘린더 API", description = "뮤즈 전체 일정을 조회하고 회원이 일정을 관리하는 API")
@RestController
@RequestMapping("/api/v1/calendar/events")
@RequiredArgsConstructor
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    @Operation(summary = "전체 일정 조회", description = "비로그인 사용자도 뮤즈 전체 일정을 조회할 수 있습니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CalendarEventResponse>>> getEvents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            HttpServletRequest httpRequest
    ) {
        List<CalendarEventResponse> response = calendarEventService.getEvents(startDate, endDate);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "일정 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "일정 상세 조회", description = "비로그인 사용자도 일정 상세 정보를 조회할 수 있습니다.")
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<CalendarEventResponse>> getEvent(
            @PathVariable Integer eventId,
            HttpServletRequest httpRequest
    ) {
        CalendarEventResponse response = calendarEventService.getEvent(eventId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "일정 상세 정보를 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "일정 등록", description = "로그인한 회원이 새 일정을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<CalendarEventResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CalendarEventRequest request,
            HttpServletRequest httpRequest
    ) {
        CalendarEventResponse response = calendarEventService.create(authenticatedUserId(userDetails), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "일정이 등록되었습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "일정 수정", description = "로그인한 회원이 일정을 수정합니다.")
    @PatchMapping("/{eventId}")
    public ResponseEntity<ApiResponse<CalendarEventResponse>> update(
            @PathVariable Integer eventId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CalendarEventRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAuthenticated(userDetails);
        CalendarEventResponse response = calendarEventService.update(eventId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "일정이 수정되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "일정 삭제", description = "로그인한 회원이 일정을 삭제합니다.")
    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Integer eventId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        ensureAuthenticated(userDetails);
        calendarEventService.delete(eventId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "일정이 삭제되었습니다.", null, httpRequest.getRequestURI())
        );
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        ensureAuthenticated(userDetails);
        return userDetails.getUserId();
    }

    private void ensureAuthenticated(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
    }
}
