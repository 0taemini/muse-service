package com.muse.service.backend.config.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.cookie")
public record AuthCookieProperties(
        Boolean secure,
        String sameSite,
        String domain
) {
    public String resolvedSameSite() {
        return (sameSite == null || sameSite.isBlank()) ? "Lax" : sameSite;
    }

    public String resolvedDomain() {
        return (domain == null || domain.isBlank()) ? null : domain.trim();
    }
}
