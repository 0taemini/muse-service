package com.muse.service.backend.service.auth;

import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.AuthTokenResult;
import com.muse.service.backend.dto.auth.FindEmailResponse;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.auth.PasswordResetRequest;
import com.muse.service.backend.dto.auth.VerifyCodeRequest;
import com.muse.service.backend.dto.auth.VerificationTokenResponse;
import com.muse.service.backend.dto.auth.LoginRequest;
import com.muse.service.backend.dto.user.UserResponse;

public interface AuthService {

    AuthTokenResult login(LoginRequest request, String clientIp);

    AuthTokenResult reissue(String refreshToken);

    void logout(String refreshToken);

    void requestPhoneVerification(PhoneVerificationRequest request);

    VerificationTokenResponse verifyPhoneCode(VerifyCodeRequest request);

    UserResponse signup(SignupRequest request);

    void requestFindEmailVerification(PhoneVerificationRequest request);

    FindEmailResponse findEmail(VerifyCodeRequest request);

    void requestPasswordResetVerification(PhoneVerificationRequest request);

    VerificationTokenResponse verifyPasswordResetCode(VerifyCodeRequest request);

    void resetPassword(PasswordResetRequest request);
}
