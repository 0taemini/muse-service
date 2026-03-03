package com.muse.service.backend.controller;

import com.muse.service.backend.dto.auth.LoginRequest;
import com.muse.service.backend.dto.auth.LoginResponse;
import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.auth.VerificationTokenResponse;
import com.muse.service.backend.dto.auth.VerifyCodeRequest;
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

@Tag(name = "인증 API", description = "회원가입 및 휴대폰 인증 관련 API")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인하고 JWT Access Token을 발급합니다.")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "로그인에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(
            summary = "인증번호 발송",
            description = "allUser 등록 사용자인지 확인 후 인증번호를 발송합니다. 같은 번호로 30초 내 재요청하면 제한됩니다."
    )
    @PostMapping("/sms/send-verification")
    public ResponseEntity<ApiResponse<Void>> sendVerificationCode(
            @Valid @RequestBody PhoneVerificationRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.requestPhoneVerification(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "인증번호가 발송되었습니다.", null, httpRequest.getRequestURI())
        );
    }

    @Operation(
            summary = "인증번호 검증",
            description = "인증번호를 검증합니다. 최대 5회까지 시도 가능하며 성공 시 회원가입용 임시 토큰을 발급합니다."
    )
    @PostMapping("/sms/verify-code")
    public ResponseEntity<ApiResponse<VerificationTokenResponse>> verifyCode(
            @Valid @RequestBody VerifyCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        VerificationTokenResponse response = authService.verifyPhoneCode(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "인증이 완료되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(
            summary = "회원가입",
            description = "인증 토큰으로 본인 확인 후 회원가입을 진행합니다. 회원가입 성공 시 인증 토큰은 즉시 만료됩니다."
    )
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(
            @Valid @RequestBody SignupRequest request,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "회원가입이 완료되었습니다.", response, httpRequest.getRequestURI()));
    }
}
