package com.muse.service.backend.service.sms;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class SolapiAuth {

    private SolapiAuth() {
    }

    public static String createAuthHeader(String apiKey, String apiSecret) {
        String date = Instant.now().toString();
        String salt = UUID.randomUUID().toString().replace("-", "");
        String signature = hmacSha256Base64(apiSecret, date + salt);
        return String.format(
                "HMAC-SHA256 apiKey=%s, date=%s, salt=%s, signature=%s",
                apiKey,
                date,
                salt,
                signature
        );
    }

    private static String hmacSha256Base64(String secret, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return toHex(raw);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to generate Solapi signature", exception);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format("%02x", value));
        }
        return builder.toString();
    }
}
