package com.muse.service.backend.controller;

import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.dto.user.UserProfileUpdateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.user.UserService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "사용자 API", description = "사용자 조회 및 상태/개인정보 수정 API")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "마이페이지 조회", description = "현재 로그인한 사용자의 마이페이지 정보를 조회합니다.")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMyPage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        UserResponse response = userService.getById(userDetails.getUserId());
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "마이페이지 조회에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "개인정보 수정", description = "현재 로그인한 사용자의 이메일, 기수, 랭크, 비밀번호를 수정합니다.")
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UserProfileUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        UserResponse response = userService.updateMyProfile(userDetails.getUserId(), request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "개인정보 수정에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사용자 단건 조회", description = "userId로 사용자를 단건 조회합니다.")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getById(
            @PathVariable Integer userId,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = userService.getById(userId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사용자 단건 조회에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사용자 목록 조회", description = "전체 사용자 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAll(HttpServletRequest httpRequest) {
        List<UserResponse> response = userService.getAll();
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사용자 목록 조회에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사용자 상태 변경", description = "userId로 사용자의 상태를 변경합니다.")
    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<UserResponse>> updateStatus(
            @PathVariable Integer userId,
            @Valid @RequestBody UserStatusUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = userService.updateStatus(userId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사용자 상태 변경에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }
}
