package com.muse.service.backend.controller;

import com.muse.service.backend.dto.performance.PerformanceSongCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongDetailResponse;
import com.muse.service.backend.dto.performance.PerformanceSongSessionsUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongStatusUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongUpdateRequest;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.performance.PerformanceSongService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공연 후보곡 API", description = "공연 후보곡 등록, 수정, 상태 변경, 세션 구조 수정 API")
@RestController
@RequestMapping("/api/v1/performances/{performanceId}/songs")
@RequiredArgsConstructor
public class PerformanceSongController {

    private final PerformanceSongService performanceSongService;

    @Operation(summary = "후보곡 등록", description = "공연 아래 후보곡과 초기 세션 구조를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<PerformanceSongDetailResponse>> create(
            @PathVariable Integer performanceId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceSongCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        Integer userId = authenticatedUserId(userDetails);
        PerformanceSongDetailResponse response = performanceSongService.create(performanceId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "후보곡이 등록되었습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "후보곡 상세 조회", description = "후보곡 기본 정보와 세션 구조를 조회합니다.")
    @GetMapping("/{performanceSongId}")
    public ResponseEntity<ApiResponse<PerformanceSongDetailResponse>> getById(
            @PathVariable Integer performanceId,
            @PathVariable Integer performanceSongId,
            HttpServletRequest httpRequest
    ) {
        PerformanceSongDetailResponse response = performanceSongService.getById(performanceId, performanceSongId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "후보곡 상세 정보를 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "후보곡 수정", description = "채팅방 생성 전까지 작성자가 후보곡 기본 정보를 수정합니다.")
    @PatchMapping("/{performanceSongId}")
    public ResponseEntity<ApiResponse<PerformanceSongDetailResponse>> update(
            @PathVariable Integer performanceId,
            @PathVariable Integer performanceSongId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceSongUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        Integer userId = authenticatedUserId(userDetails);
        PerformanceSongDetailResponse response = performanceSongService.update(
                performanceId,
                performanceSongId,
                userId,
                request
        );
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "후보곡이 수정되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "후보곡 상태 변경", description = "채팅방 생성 전까지 누구나 후보곡 상태를 변경할 수 있습니다.")
    @PatchMapping("/{performanceSongId}/status")
    public ResponseEntity<ApiResponse<PerformanceSongDetailResponse>> updateStatus(
            @PathVariable Integer performanceId,
            @PathVariable Integer performanceSongId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceSongStatusUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        Integer userId = authenticatedUserId(userDetails);
        PerformanceSongDetailResponse response = performanceSongService.updateStatus(
                performanceId,
                performanceSongId,
                userId,
                request
        );
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "후보곡 상태가 변경되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "세션 구조 수정", description = "작성자가 후보곡 세션 구조를 추가 또는 수정합니다.")
    @PatchMapping("/{performanceSongId}/sessions")
    public ResponseEntity<ApiResponse<PerformanceSongDetailResponse>> updateSessions(
            @PathVariable Integer performanceId,
            @PathVariable Integer performanceSongId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceSongSessionsUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        Integer userId = authenticatedUserId(userDetails);
        PerformanceSongDetailResponse response = performanceSongService.updateSessions(
                performanceId,
                performanceSongId,
                userId,
                request
        );
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "후보곡 세션 구조가 수정되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "후보곡 삭제", description = "채팅방 생성 전까지 작성자가 후보곡을 논리 삭제합니다.")
    @DeleteMapping("/{performanceSongId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Integer performanceId,
            @PathVariable Integer performanceSongId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        Integer userId = authenticatedUserId(userDetails);
        performanceSongService.delete(performanceId, performanceSongId, userId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "후보곡이 삭제되었습니다.", null, httpRequest.getRequestURI())
        );
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userDetails.getUserId();
    }
}
