package com.muse.service.backend.config.logging;

import com.muse.service.backend.security.model.CustomUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        String requestId = resolveRequestId(request);

        MDC.put("requestId", requestId);
        MDC.put("method", request.getMethod());
        MDC.put("uri", request.getRequestURI());
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
            putAuthenticationMdc();
            logRequest(request, response.getStatus(), System.currentTimeMillis() - startedAt, null);
        } catch (ServletException | IOException | RuntimeException exception) {
            putAuthenticationMdc();
            logRequest(request, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, System.currentTimeMillis() - startedAt, exception);
            throw exception;
        } finally {
            MDC.clear();
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            return UUID.randomUUID().toString();
        }
        return requestId.trim();
    }

    private void putAuthenticationMdc() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            MDC.put("userId", String.valueOf(userDetails.getUserId()));
            MDC.put("role", userDetails.getRole().name());
        }
    }

    private void logRequest(HttpServletRequest request, int status, long durationMs, Exception exception) {
        String path = request.getRequestURI();

        if (exception != null) {
            log.error("API 요청 처리 실패: method={}, path={}, status={}, durationMs={}",
                    request.getMethod(), path, status, durationMs, exception);
            return;
        }

        if (status >= 500) {
            log.error("API 요청 실패: method={}, path={}, status={}, durationMs={}",
                    request.getMethod(), path, status, durationMs);
        } else if (status >= 400) {
            log.warn("API 요청 경고: method={}, path={}, status={}, durationMs={}",
                    request.getMethod(), path, status, durationMs);
        } else {
            log.info("API 요청 완료: method={}, path={}, status={}, durationMs={}",
                    request.getMethod(), path, status, durationMs);
        }
    }
}
