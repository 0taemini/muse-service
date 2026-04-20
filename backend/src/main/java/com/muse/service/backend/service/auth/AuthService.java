package com.muse.service.backend.service.auth;

import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.FindEmailResponse;
import com.muse.service.backend.dto.auth.RefreshTokenRequest;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.auth.PasswordResetRequest;
import com.muse.service.backend.dto.auth.VerifyCodeRequest;
import com.muse.service.backend.dto.auth.VerificationTokenResponse;
import com.muse.service.backend.dto.auth.LoginRequest;
import com.muse.service.backend.dto.auth.LoginResponse;
import com.muse.service.backend.dto.user.UserResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request, String clientIp);

    LoginResponse reissue(RefreshTokenRequest request);

    void logout(RefreshTokenRequest request);

    void requestPhoneVerification(PhoneVerificationRequest request);

    VerificationTokenResponse verifyPhoneCode(VerifyCodeRequest request);

    UserResponse signup(SignupRequest request);

    void requestFindEmailVerification(PhoneVerificationRequest request);

    FindEmailResponse findEmail(VerifyCodeRequest request);

    void requestPasswordResetVerification(PhoneVerificationRequest request);

    VerificationTokenResponse verifyPasswordResetCode(VerifyCodeRequest request);

    void resetPassword(PasswordResetRequest request);
}
