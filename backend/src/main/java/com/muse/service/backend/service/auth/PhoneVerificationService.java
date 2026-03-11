package com.muse.service.backend.service.auth;

public interface PhoneVerificationService {

    void issueCode(String name, Integer cohort, String phone);

    String verifyCodeAndIssueToken(String name, Integer cohort, String phone, String code);

    VerifiedIdentity getVerifiedIdentity(String verificationToken);

    void deleteVerifiedToken(String verificationToken);

    record VerifiedIdentity(String name, Integer cohort, String phone) {
    }
}
