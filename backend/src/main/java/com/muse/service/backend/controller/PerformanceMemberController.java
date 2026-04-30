package com.muse.service.backend.controller;

import com.muse.service.backend.dto.performance.PerformanceMemberCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceMemberResponse;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.performance.PerformanceMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공연 멤버 API", description = "공연별 참여 멤버 조회, 등록, 삭제 API")
@RestController
@RequestMapping("/api/v1/performances/{performanceId}/members")
@RequiredArgsConstructor
public class PerformanceMemberController {

    private final PerformanceMemberService performanceMemberService;

    @Operation(summary = "공연 멤버 목록 조회", description = "선택한 공연에 등록된 멤버 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<PerformanceMemberResponse>>> getAll(
            @PathVariable Integer performanceId,
            HttpServletRequest httpRequest
    ) {
        List<PerformanceMemberResponse> response = performanceMemberService.getAll(performanceId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "공연 멤버 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "공연 멤버 등록", description = "세션 배정에 사용할 공연 멤버를 추가합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<PerformanceMemberResponse>> create(
            @PathVariable Integer performanceId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PerformanceMemberCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        PerformanceMemberResponse response = performanceMemberService.create(
                performanceId,
                authenticatedUserId(userDetails),
                request
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "공연 멤버를 등록했습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "공연 멤버 삭제", description = "공연에서 더 이상 사용하지 않는 멤버를 제거합니다.")
    @DeleteMapping("/{memberUserId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Integer performanceId,
            @PathVariable Integer memberUserId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        performanceMemberService.delete(performanceId, authenticatedUserId(userDetails), memberUserId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "공연 멤버를 삭제했습니다.", null, httpRequest.getRequestURI())
        );
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userDetails.getUserId();
    }
}
