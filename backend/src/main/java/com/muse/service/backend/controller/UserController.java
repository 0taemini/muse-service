package com.muse.service.backend.controller;

import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import com.muse.service.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "User API", description = "User management API")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "UserId로 단건 조회", description = "userId로 조회")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getById(
            @PathVariable Integer userId,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = userService.getById(userId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "User detail fetched successfully", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "Get all users", description = "Get all users")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAll(HttpServletRequest httpRequest) {
        List<UserResponse> response = userService.getAll();
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "User list fetched successfully", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "Update user status", description = "Update user status by userId")
    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<UserResponse>> updateStatus(
            @PathVariable Integer userId,
            @Valid @RequestBody UserStatusUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = userService.updateStatus(userId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "User status updated successfully", response, httpRequest.getRequestURI())
        );
    }
}
