package com.muse.service.backend.global.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ErrorResponse> handleCustomException(CustomException exception, HttpServletRequest request) {
        ErrorCode errorCode = exception.getErrorCode();
        return ResponseEntity.status(errorCode.getStatus())
                .body(ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(errorCode.getStatus().value())
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .path(request.getRequestURI())
                        .build());
    }

    @ExceptionHandler(PerformanceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceNotFoundException(
            PerformanceNotFoundException exception,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(404)
                .body(ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(404)
                        .code("PERFORMANCE_001")
                        .message(exception.getMessage())
                        .path(request.getRequestURI())
                        .build());
    }

    @ExceptionHandler(PerformanceSongNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSongNotFoundException(
            PerformanceSongNotFoundException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(404, "PERFORMANCE_002", exception.getMessage(), request);
    }

    @ExceptionHandler(PerformanceSongAccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSongAccessDeniedException(
            PerformanceSongAccessDeniedException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(403, "PERFORMANCE_003", exception.getMessage(), request);
    }

    @ExceptionHandler(PerformanceSongLockedException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSongLockedException(
            PerformanceSongLockedException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(409, "PERFORMANCE_004", exception.getMessage(), request);
    }

    @ExceptionHandler(PerformanceSongAlreadyDeletedException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSongAlreadyDeletedException(
            PerformanceSongAlreadyDeletedException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(409, "PERFORMANCE_005", exception.getMessage(), request);
    }

    @ExceptionHandler(PerformanceSongSessionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSongSessionNotFoundException(
            PerformanceSongSessionNotFoundException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(404, "PERFORMANCE_006", exception.getMessage(), request);
    }

    @ExceptionHandler(PerformanceSessionColumnNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSessionColumnNotFoundException(
            PerformanceSessionColumnNotFoundException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(404, "PERFORMANCE_007", exception.getMessage(), request);
    }

    @ExceptionHandler(PerformanceSessionColumnLockedException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSessionColumnLockedException(
            PerformanceSessionColumnLockedException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(409, "PERFORMANCE_008", exception.getMessage(), request);
    }

    @ExceptionHandler(PerformanceSessionColumnDuplicateException.class)
    public ResponseEntity<ErrorResponse> handlePerformanceSessionColumnDuplicateException(
            PerformanceSessionColumnDuplicateException exception,
            HttpServletRequest request
    ) {
        return buildSimpleErrorResponse(409, "PERFORMANCE_009", exception.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        Map<String, String> validationErrors = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            validationErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ErrorCode errorCode = ErrorCode.VALIDATION_ERROR;
        return ResponseEntity.status(errorCode.getStatus())
                .body(ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(errorCode.getStatus().value())
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .path(request.getRequestURI())
                        .validationErrors(validationErrors)
                        .build());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException exception,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.DATA_CONFLICT;
        return ResponseEntity.status(errorCode.getStatus())
                .body(ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(errorCode.getStatus().value())
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .path(request.getRequestURI())
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception exception, HttpServletRequest request) {
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(errorCode.getStatus())
                .body(ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(errorCode.getStatus().value())
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .path(request.getRequestURI())
                        .build());
    }

    private ResponseEntity<ErrorResponse> buildSimpleErrorResponse(
            int status,
            String code,
            String message,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(status)
                .body(ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(status)
                        .code(code)
                        .message(message)
                        .path(request.getRequestURI())
                        .build());
    }
}
