package com.muse.service.backend.global.exception;

public class PerformanceSongNotFoundException extends RuntimeException {

    public PerformanceSongNotFoundException() {
        super("공연 후보곡을 찾을 수 없습니다.");
    }
}
