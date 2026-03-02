package com.muse.service.backend.service.auth;

public interface PhoneVerificationService {

    void issueCode(String name, Integer cohort, String phone);

    void verifyCode(String name, Integer cohort, String phone, String code);
}
