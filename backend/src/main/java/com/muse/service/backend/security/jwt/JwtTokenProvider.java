package com.muse.service.backend.security.jwt;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String jwtSecret,
            @Value("${jwt.access-token-expiration-ms:3600000}") long accessTokenExpirationMs
    ) {
        this.secretKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
    }

    public String generateAccessToken(String email, String role) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusMillis(accessTokenExpirationMs);

        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(secretKey)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    public String getEmail(String token) {
        return parseClaims(token).getPayload().getSubject();
    }

    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }

    private io.jsonwebtoken.Jws<io.jsonwebtoken.Claims> parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token);
    }
}
