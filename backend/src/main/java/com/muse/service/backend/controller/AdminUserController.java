package com.muse.service.backend.controller;

import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserRoleUpdateRequest;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import com.muse.service.backend.service.user.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 사용자 API", description = "관리자 전용 사용자 목록 조회 및 계정 상태/권한 변경 API")
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @Operation(summary = "사용자 목록 조회", description = "관리자가 전체 사용자 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAll(HttpServletRequest httpRequest) {
        List<UserResponse> response = userService.getAll();
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사용자 목록 조회에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사용자 상태 변경", description = "관리자가 userId로 사용자의 상태를 변경합니다.")
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

    @Operation(summary = "사용자 권한 변경", description = "관리자가 userId로 사용자의 권한을 변경합니다.")
    @PatchMapping("/{userId}/role")
    public ResponseEntity<ApiResponse<UserResponse>> updateRole(
            @PathVariable Integer userId,
            @Valid @RequestBody UserRoleUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = userService.updateRole(userId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사용자 권한 변경에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사용자 삭제", description = "관리자가 userId로 가입 사용자를 논리 삭제합니다.")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Integer userId,
            HttpServletRequest httpRequest
    ) {
        userService.delete(userId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사용자 삭제에 성공했습니다.", null, httpRequest.getRequestURI())
        );
    }
}
