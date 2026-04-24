package com.muse.service.backend.dto.auth;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long accessTokenExpiresInMs,
        String email
) {
}
