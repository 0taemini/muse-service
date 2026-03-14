package com.muse.service.backend.global.exception;

public class PerformanceSessionColumnLockedException extends RuntimeException {

    public PerformanceSessionColumnLockedException() {
        super("This performance already has chat rooms, so its session columns cannot be changed.");
    }
}
