package com.muse.service.backend.util;

import com.muse.service.backend.config.auth.AuthCookieProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieUtils {

    public static final String REFRESH_TOKEN_COOKIE_NAME = "muse_refresh_token";
    private static final String FORWARDED_PROTO_HEADER = "X-Forwarded-Proto";
    private final AuthCookieProperties authCookieProperties;

    public void addRefreshTokenCookie(
            HttpServletRequest request,
            HttpServletResponse response,
            String refreshToken,
            long refreshTokenExpiresInMs
    ) {
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                buildCookie(request, refreshToken, Duration.ofMillis(refreshTokenExpiresInMs)).toString()
        );
    }

    public void expireRefreshTokenCookie(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                buildCookie(request, "", Duration.ZERO).toString()
        );
    }

    public String extractRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }

    private ResponseCookie buildCookie(
            HttpServletRequest request,
            String refreshToken,
            Duration maxAge
    ) {
        ResponseCookie.ResponseCookieBuilder cookieBuilder = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(resolveSecureFlag(request))
                .path("/")
                .sameSite(authCookieProperties.resolvedSameSite())
                .maxAge(maxAge);

        String domain = authCookieProperties.resolvedDomain();
        if (domain != null) {
            cookieBuilder.domain(domain);
        }

        return cookieBuilder.build();
    }

    private boolean resolveSecureFlag(HttpServletRequest request) {
        if (authCookieProperties.secure() != null) {
            return authCookieProperties.secure();
        }
        return isSecureRequest(request);
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        String forwardedProto = request.getHeader(FORWARDED_PROTO_HEADER);
        return request.isSecure() || "https".equalsIgnoreCase(forwardedProto);
    }
}
