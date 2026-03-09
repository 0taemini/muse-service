package com.muse.service.backend.controller;

import com.muse.service.backend.dto.auth.FindEmailResponse;
import com.muse.service.backend.dto.auth.LoginRequest;
import com.muse.service.backend.dto.auth.LoginResponse;
import com.muse.service.backend.dto.auth.PasswordResetRequest;
import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.RefreshTokenRequest;
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

@Tag(name = "인증 API", description = "로그인, 회원가입, 아이디/비밀번호 찾기 관련 API")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인하고 Access Token과 Refresh Token을 발급합니다.")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.login(request, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "로그인에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "회원가입용 인증번호 발송", description = "등록된 전체 사용자 정보와 일치하고 아직 가입하지 않은 사용자에게 인증번호를 발송합니다.")
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

    @Operation(summary = "회원가입용 인증번호 검증", description = "회원가입에 사용할 인증번호를 검증하고 임시 인증 토큰을 발급합니다.")
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

    @Operation(summary = "회원가입", description = "휴대폰 인증 토큰으로 본인 확인 후 회원가입을 진행합니다.")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(
            @Valid @RequestBody SignupRequest request,
            HttpServletRequest httpRequest
    ) {
        UserResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "회원가입이 완료되었습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "토큰 재발급", description = "Refresh Token으로 Access Token과 Refresh Token을 재발급합니다.")
    @PostMapping("/reissue")
    public ResponseEntity<ApiResponse<LoginResponse>> reissue(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.reissue(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "토큰이 재발급되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "로그아웃", description = "저장된 Refresh Token을 삭제해 현재 로그인 세션을 종료합니다.")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.logout(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "로그아웃이 완료되었습니다.", null, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "아이디 찾기용 인증번호 발송", description = "가입된 사용자에게 아이디 찾기용 인증번호를 발송합니다.")
    @PostMapping("/account/email/send-verification")
    public ResponseEntity<ApiResponse<Void>> requestFindEmailVerification(
            @Valid @RequestBody PhoneVerificationRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.requestFindEmailVerification(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "인증번호가 발송되었습니다.", null, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "아이디 찾기", description = "인증번호를 검증한 뒤 가입된 이메일 아이디를 반환합니다.")
    @PostMapping("/account/email/verify-code")
    public ResponseEntity<ApiResponse<FindEmailResponse>> findEmail(
            @Valid @RequestBody VerifyCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        FindEmailResponse response = authService.findEmail(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "아이디 조회가 완료되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "비밀번호 재설정용 인증번호 발송", description = "가입된 사용자에게 비밀번호 재설정용 인증번호를 발송합니다.")
    @PostMapping("/password/send-verification")
    public ResponseEntity<ApiResponse<Void>> requestPasswordResetVerification(
            @Valid @RequestBody PhoneVerificationRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.requestPasswordResetVerification(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "인증번호가 발송되었습니다.", null, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "비밀번호 재설정용 인증번호 검증", description = "비밀번호 재설정에 사용할 인증번호를 검증하고 임시 인증 토큰을 발급합니다.")
    @PostMapping("/password/verify-code")
    public ResponseEntity<ApiResponse<VerificationTokenResponse>> verifyPasswordResetCode(
            @Valid @RequestBody VerifyCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        VerificationTokenResponse response = authService.verifyPasswordResetCode(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "인증이 완료되었습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "비밀번호 재설정", description = "휴대폰 인증을 마친 뒤 새로운 비밀번호로 변경합니다.")
    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody PasswordResetRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.resetPassword(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "비밀번호가 변경되었습니다.", null, httpRequest.getRequestURI())
        );
    }
}
