package com.muse.service.backend.controller;

import com.muse.service.backend.dto.performance.PerformanceCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceDetailResponse;
import com.muse.service.backend.dto.performance.PerformanceSummaryResponse;
import com.muse.service.backend.dto.performance.PerformanceUpdateRequest;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.performance.PerformanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공연 API", description = "공연 생성, 목록, 상세 조회 API")
@RestController
@RequestMapping("/api/v1/performances")
@RequiredArgsConstructor
public class PerformanceController {

    private final PerformanceService performanceService;

    @Operation(summary = "공연 생성", description = "새 공연 목차를 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<PerformanceDetailResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        PerformanceDetailResponse response = performanceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "공연이 생성되었습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "공연 수정", description = "관리자만 공연 제목과 진행 상태를 수정할 수 있습니다.")
    @PatchMapping("/{performanceId}")
    public ResponseEntity<ApiResponse<PerformanceDetailResponse>> update(
            @PathVariable Integer performanceId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAdmin(userDetails);

        PerformanceDetailResponse response = performanceService.update(performanceId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "공연 정보를 수정했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "공연 목록 조회", description = "전체 공연 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<PerformanceSummaryResponse>>> getAll(HttpServletRequest httpRequest) {
        List<PerformanceSummaryResponse> response = performanceService.getAll();
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "공연 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "공연 상세 조회", description = "공연 상세 정보와 곡 목록을 조회합니다.")
    @GetMapping("/{performanceId}")
    public ResponseEntity<ApiResponse<PerformanceDetailResponse>> getById(
            @PathVariable Integer performanceId,
            HttpServletRequest httpRequest
    ) {
        PerformanceDetailResponse response = performanceService.getById(performanceId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "공연 상세 정보를 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    private void ensureAdmin(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        if (userDetails.getRole() != User.UserRole.ADMIN) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
    }
}
