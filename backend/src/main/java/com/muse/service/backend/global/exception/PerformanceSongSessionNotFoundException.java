package com.muse.service.backend.global.exception;

public class PerformanceSongSessionNotFoundException extends RuntimeException {

    public PerformanceSongSessionNotFoundException() {
        super("공연 곡 세션을 찾을 수 없습니다.");
    }
}
