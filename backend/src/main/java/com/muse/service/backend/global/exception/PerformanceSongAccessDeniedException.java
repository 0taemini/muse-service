package com.muse.service.backend.global.exception;

public class PerformanceSongAccessDeniedException extends RuntimeException {

    public PerformanceSongAccessDeniedException() {
        super("후보곡 작성자만 수정할 수 있습니다.");
    }
}
