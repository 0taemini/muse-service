package com.muse.service.backend.global.exception;

public class PerformanceSongLockedException extends RuntimeException {

    public PerformanceSongLockedException() {
        super("채팅방이 생성된 뒤에는 세션 구조만 수정할 수 있습니다.");
    }
}
