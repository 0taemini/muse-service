package com.muse.service.backend.global.exception;

public class PerformanceSongAlreadyDeletedException extends RuntimeException {

    public PerformanceSongAlreadyDeletedException() {
        super("이미 삭제된 공연 후보곡입니다.");
    }
}
