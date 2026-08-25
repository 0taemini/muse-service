package com.muse.service.backend.service.sms;

import java.util.List;

public interface SmsService {
    void sendVerificationCode(String phone, String verificationCode);

    void sendBulk(List<SmsMessage> messages);
}

record SmsMessage(String phone, String text) {
}
