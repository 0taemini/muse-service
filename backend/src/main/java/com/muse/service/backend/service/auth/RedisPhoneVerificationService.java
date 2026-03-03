package com.muse.service.backend.service.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.service.sms.SmsService;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisPhoneVerificationService implements PhoneVerificationService {

    private static final String VERIFICATION_CODE_PREFIX = "sms:verification:";
    private static final String VERIFICATION_FAILED_COUNT_PREFIX = "sms:verification:failed:";
    private static final String VERIFICATION_REQUEST_COOLDOWN_PREFIX = "sms:verification:cooldown:";
    private static final String VERIFIED_TOKEN_PREFIX = "sms:verified:token:";

    private static final Duration VERIFICATION_CODE_TTL = Duration.ofMinutes(3);
    private static final Duration VERIFIED_TOKEN_TTL = Duration.ofMinutes(10);
    private static final Duration REQUEST_COOLDOWN_TTL = Duration.ofSeconds(30);
    private static final int MAX_VERIFY_ATTEMPTS = 5;

    private final SmsService solapiSmsService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void issueCode(String name, Integer cohort, String phone) {
        String identityKey = verificationKey(name, cohort, phone);
        String cooldownKey = VERIFICATION_REQUEST_COOLDOWN_PREFIX + identityKey;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            throw new CustomException(ErrorCode.PHONE_VERIFICATION_REQUEST_TOO_FREQUENT);
        }

        String code = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1_000_000));
        String codeKey = VERIFICATION_CODE_PREFIX + identityKey;

        redisTemplate.opsForValue().set(codeKey, code, VERIFICATION_CODE_TTL);
        redisTemplate.opsForValue().set(cooldownKey, "1", REQUEST_COOLDOWN_TTL);

        // 실제 인증 문자 보내는 코드
        solapiSmsService.sendVerificationCode(phone, code);

        // 민감 정보라 운영환경에서는 지울 예정
        log.info("[PHONE-VERIFY] phone={}, cohort={}, code={}", normalizePhone(phone), cohort, code);
    }

    @Override
    public String verifyCodeAndIssueToken(String name, Integer cohort, String phone, String code) {
        String identityKey = verificationKey(name, cohort, phone);
        String codeKey = VERIFICATION_CODE_PREFIX + identityKey;
        String failedCountKey = VERIFICATION_FAILED_COUNT_PREFIX + identityKey;
        String storedCode = redisTemplate.opsForValue().get(codeKey);
        int failedCount = parseFailedCount(redisTemplate.opsForValue().get(failedCountKey));

        if (failedCount >= MAX_VERIFY_ATTEMPTS) {
            throw new CustomException(ErrorCode.PHONE_VERIFICATION_ATTEMPT_EXCEEDED);
        }

        if (storedCode == null) {
            throw new CustomException(ErrorCode.PHONE_VERIFICATION_CODE_EXPIRED);
        }

        if (!storedCode.equals(code)) {
            int nextFailedCount = failedCount + 1;
            redisTemplate.opsForValue().set(failedCountKey, String.valueOf(nextFailedCount), VERIFICATION_CODE_TTL);
            if (nextFailedCount >= MAX_VERIFY_ATTEMPTS) {
                throw new CustomException(ErrorCode.PHONE_VERIFICATION_ATTEMPT_EXCEEDED);
            }
            throw new CustomException(ErrorCode.PHONE_VERIFICATION_CODE_INVALID);
        }

        String verificationToken = UUID.randomUUID().toString();
        String tokenKey = VERIFIED_TOKEN_PREFIX + verificationToken;
        VerifiedIdentity verifiedIdentity = new VerifiedIdentity(name, cohort, normalizePhone(phone));

        try {
            redisTemplate.opsForValue().set(
                    tokenKey,
                    objectMapper.writeValueAsString(verifiedIdentity),
                    VERIFIED_TOKEN_TTL
            );
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        redisTemplate.delete(codeKey);
        redisTemplate.delete(failedCountKey);
        return verificationToken;
    }

    @Override
    public VerifiedIdentity getVerifiedIdentity(String verificationToken) {
        String tokenKey = VERIFIED_TOKEN_PREFIX + verificationToken;
        String payload = redisTemplate.opsForValue().get(tokenKey);

        if (payload == null) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_TOKEN);
        }

        try {
            VerifiedIdentity verifiedIdentity = objectMapper.readValue(payload, VerifiedIdentity.class);
            return verifiedIdentity;
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_TOKEN);
        }
    }

    @Override
    public void deleteVerifiedToken(String verificationToken) {
        String tokenKey = VERIFIED_TOKEN_PREFIX + verificationToken;
        redisTemplate.delete(tokenKey);
    }

    private String verificationKey(String name, Integer cohort, String phone) {
        return name + "|" + cohort + "|" + normalizePhone(phone);
    }

    private String normalizePhone(String phone) {
        return phone.replaceAll("[^0-9]", "");
    }

    private int parseFailedCount(String raw) {
        if (raw == null || raw.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException exception) {
            return 0;
        }
    }
}
