package com.muse.service.backend.dto.auth;

public record AuthTokenResult(
        String accessToken,
        String refreshToken,
        String tokenType,
        long accessTokenExpiresInMs,
        long refreshTokenExpiresInMs,
        String email
) {
    public LoginResponse toLoginResponse() {
        return new LoginResponse(
                accessToken,
                tokenType,
                accessTokenExpiresInMs,
                email
        );
    }
}
