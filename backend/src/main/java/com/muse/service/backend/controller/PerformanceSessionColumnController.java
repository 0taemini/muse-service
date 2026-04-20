package com.muse.service.backend.controller;

import com.muse.service.backend.dto.performance.PerformanceSessionColumnResponse;
import com.muse.service.backend.dto.performance.PerformanceSessionColumnUpsertRequest;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.performance.PerformanceSessionColumnService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공연 공통 세션 컬럼 API", description = "공연 공통 세션 컬럼 조회, 등록, 수정 API")
@RestController
@RequestMapping("/api/v1/performances/{performanceId}/session-columns")
@RequiredArgsConstructor
public class PerformanceSessionColumnController {

    private final PerformanceSessionColumnService performanceSessionColumnService;

    @Operation(summary = "공연 공통 세션 컬럼 목록 조회", description = "공연에서 공통으로 사용하는 세션 컬럼 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<PerformanceSessionColumnResponse>>> getAll(
            @PathVariable Integer performanceId,
            HttpServletRequest httpRequest
    ) {
        List<PerformanceSessionColumnResponse> response = performanceSessionColumnService.getAll(performanceId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "공연 공통 세션 컬럼 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "공연 공통 세션 컬럼 등록", description = "공연에서 공통으로 사용할 세션 컬럼을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<PerformanceSessionColumnResponse>> create(
            @PathVariable Integer performanceId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceSessionColumnUpsertRequest request,
            HttpServletRequest httpRequest
    ) {
        PerformanceSessionColumnResponse response = performanceSessionColumnService.create(
                performanceId,
                authenticatedUserId(userDetails),
                request
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "공연 공통 세션 컬럼이 등록되었습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "공연 공통 세션 컬럼 수정", description = "기존 공연 공통 세션 컬럼 정보를 수정합니다.")
    @PatchMapping("/{performanceSessionColumnId}")
    public ResponseEntity<ApiResponse<PerformanceSessionColumnResponse>> update(
            @PathVariable Integer performanceId,
            @PathVariable Integer performanceSessionColumnId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceSessionColumnUpsertRequest request,
            HttpServletRequest httpRequest
    ) {
        PerformanceSessionColumnResponse response = performanceSessionColumnService.update(
                performanceId,
                performanceSessionColumnId,
                authenticatedUserId(userDetails),
                request
        );
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "공연 공통 세션 컬럼이 수정되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userDetails.getUserId();
    }
}
