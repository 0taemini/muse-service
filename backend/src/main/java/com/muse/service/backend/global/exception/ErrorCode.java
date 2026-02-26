package com.muse.service.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    ALL_USER_ALREADY_LINKED(HttpStatus.CONFLICT, "USER_001", "allUserId is already linked to a user account."),
    NICKNAME_ALREADY_IN_USE(HttpStatus.CONFLICT, "USER_002", "Nickname is already in use."),
    EMAIL_ALREADY_IN_USE(HttpStatus.CONFLICT, "USER_003", "Email is already in use."),
    ALL_USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_004", "allUser not found."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_005", "user not found."),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "Authentication is required."),
    AUTHENTICATION_FAILED(HttpStatus.UNAUTHORIZED, "AUTH_002", "Invalid username or password."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "AUTH_003", "Access is denied."),

    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "COMMON_001", "Request validation failed."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_999", "Internal server error.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
