package com.muse.service.backend.service.auth;

import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class InMemoryPhoneVerificationService implements PhoneVerificationService {

    private static final long EXPIRY_MINUTES = 3L;
    private final Map<String, VerificationEntry> store = new ConcurrentHashMap<>();

    @Override
    public void issueCode(String name, Integer cohort, String phone) {
        String code = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(EXPIRY_MINUTES);
        store.put(key(name, cohort, phone), new VerificationEntry(code, expiresAt));

        // TODO: SMS provider 연동 시 실제 발송 로직으로 교체
        log.info("[PHONE-VERIFY] phone={}, cohort={}, code={} (expiresAt={})", phone, cohort, code, expiresAt);
    }

    @Override
    public void verifyCode(String name, Integer cohort, String phone, String code) {
        String key = key(name, cohort, phone);
        VerificationEntry entry = store.get(key);
        if (entry == null) {
            throw new CustomException(ErrorCode.PHONE_VERIFICATION_CODE_INVALID);
        }

        if (entry.expiresAt().isBefore(LocalDateTime.now())) {
            store.remove(key);
            throw new CustomException(ErrorCode.PHONE_VERIFICATION_CODE_EXPIRED);
        }

        if (!entry.code().equals(code)) {
            throw new CustomException(ErrorCode.PHONE_VERIFICATION_CODE_INVALID);
        }

        store.remove(key);
    }

    private String key(String name, Integer cohort, String phone) {
        return name + "|" + cohort + "|" + phone;
    }

    private record VerificationEntry(String code, LocalDateTime expiresAt) {
    }
}
