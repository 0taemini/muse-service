package com.muse.service.backend.controller;

import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth API", description = "Authentication API")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Request phone verification", description = "Verify user exists in allUser and issue phone verification code")
    @PostMapping("/phone-verification/request")
    public ResponseEntity<ApiResponse<Void>> requestPhoneVerification(
            @Valid @RequestBody PhoneVerificationRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.requestPhoneVerification(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "Phone verification code issued", null, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "Sign up", description = "Sign up with name/cohort/phone and verified code")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(
            @Valid @RequestBody SignupRequest request,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "Sign up succeeded", response, httpRequest.getRequestURI()));
    }
}
