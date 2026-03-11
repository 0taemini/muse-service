package com.muse.service.backend.service.sms;

public interface SmsService {
    void sendVerificationCode(String phone, String verificationCode);
}
