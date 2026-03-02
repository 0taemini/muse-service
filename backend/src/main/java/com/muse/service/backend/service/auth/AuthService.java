package com.muse.service.backend.service.auth;

import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.user.UserResponse;

public interface AuthService {

    void requestPhoneVerification(PhoneVerificationRequest request);

    UserResponse signup(SignupRequest request);
}
