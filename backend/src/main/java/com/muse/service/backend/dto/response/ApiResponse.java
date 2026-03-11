package com.muse.service.backend.dto.response;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@Builder
public class ApiResponse<T> {

    private final int status;
    private final String message;
    private final T data;
    private final String path;
    private final LocalDateTime timestamp;

    public static <T> ApiResponse<T> of(HttpStatus status, String message, T data, String path) {
        return ApiResponse.<T>builder()
                .status(status.value())
                .message(message)
                .data(data)
                .path(path)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
