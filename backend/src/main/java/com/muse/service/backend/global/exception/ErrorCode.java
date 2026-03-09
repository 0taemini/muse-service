package com.muse.service.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    ALL_USER_ALREADY_LINKED(HttpStatus.CONFLICT, "USER_001", "이미 계정과 연결된 사용자입니다."),
    NICKNAME_ALREADY_IN_USE(HttpStatus.CONFLICT, "USER_002", "이미 사용 중인 닉네임입니다."),
    EMAIL_ALREADY_IN_USE(HttpStatus.CONFLICT, "USER_003", "이미 사용 중인 이메일입니다."),
    ALL_USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_004", "등록된 전체 사용자 정보를 찾을 수 없습니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_005", "사용자를 찾을 수 없습니다."),
    UNREGISTERED_USER(HttpStatus.NOT_FOUND, "USER_006", "등록되지 않은 사용자입니다."),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "인증이 필요합니다."),
    AUTHENTICATION_FAILED(HttpStatus.UNAUTHORIZED, "AUTH_002", "이메일 또는 비밀번호가 올바르지 않습니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "AUTH_003", "접근 권한이 없습니다."),
    PHONE_VERIFICATION_CODE_INVALID(HttpStatus.BAD_REQUEST, "AUTH_004", "인증번호가 올바르지 않습니다."),
    PHONE_VERIFICATION_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "AUTH_005", "인증번호가 만료되었습니다."),
    INVALID_VERIFICATION_TOKEN(HttpStatus.BAD_REQUEST, "AUTH_006", "인증 토큰이 유효하지 않습니다."),
    SMS_SEND_FAILED(HttpStatus.BAD_GATEWAY, "AUTH_007", "인증번호 문자 발송에 실패했습니다."),
    PHONE_VERIFICATION_ATTEMPT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "AUTH_008", "인증번호 입력 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."),
    PHONE_VERIFICATION_REQUEST_TOO_FREQUENT(HttpStatus.TOO_MANY_REQUESTS, "AUTH_009", "인증번호 요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요."),
    PASSWORD_CONFIRMATION_MISMATCH(HttpStatus.BAD_REQUEST, "AUTH_010", "비밀번호 확인이 일치하지 않습니다."),
    PHONE_VERIFICATION_CODE_NOT_SET(HttpStatus.INTERNAL_SERVER_ERROR, "AUTH_011", "인증번호 저장에 실패했습니다."),
    LOGIN_ATTEMPT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "AUTH_012", "로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."),

    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "COMMON_001", "요청값 검증에 실패했습니다."),
    DATA_CONFLICT(HttpStatus.CONFLICT, "COMMON_002", "중복되었거나 무결성 제약을 위반한 요청입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_999", "서버 내부 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
