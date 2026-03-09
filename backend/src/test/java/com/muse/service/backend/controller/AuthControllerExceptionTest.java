package com.muse.service.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.global.exception.GlobalExceptionHandler;
import com.muse.service.backend.service.auth.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class AuthControllerExceptionTest {

    @Mock
    private AuthService authService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AuthController(authService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    void sendVerificationCode_whenRequestTooFrequent_returns429() throws Exception {
        doThrow(new CustomException(ErrorCode.PHONE_VERIFICATION_REQUEST_TOO_FREQUENT))
                .when(authService)
                .requestPhoneVerification(any());

        mockMvc.perform(post("/api/v1/auth/sms/send-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PhoneRequest("홍길동", 14, "01012341234"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("AUTH_009"));
    }

    @Test
    void verifyCode_whenCodeInvalid_returns400() throws Exception {
        doThrow(new CustomException(ErrorCode.PHONE_VERIFICATION_CODE_INVALID))
                .when(authService)
                .verifyPhoneCode(any());

        mockMvc.perform(post("/api/v1/auth/sms/verify-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyRequest("홍길동", 14, "01012341234", "123456"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AUTH_004"));
    }

    @Test
    void sendVerificationCode_whenSmsSendFailed_returns502() throws Exception {
        doThrow(new CustomException(ErrorCode.SMS_SEND_FAILED))
                .when(authService)
                .requestPhoneVerification(any());

        mockMvc.perform(post("/api/v1/auth/sms/send-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PhoneRequest("홍길동", 14, "01012341234"))))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("AUTH_007"));
    }

    @Test
    void login_whenAttemptExceeded_returns429() throws Exception {
        doThrow(new CustomException(ErrorCode.LOGIN_ATTEMPT_EXCEEDED))
                .when(authService)
                .login(any(), anyString());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody("test@muse.com", "password123"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("AUTH_012"));
    }

    private record PhoneRequest(String name, Integer cohort, String phone) {
    }

    private record VerifyRequest(String name, Integer cohort, String phone, String code) {
    }

    private record LoginBody(String email, String password) {
    }
}
