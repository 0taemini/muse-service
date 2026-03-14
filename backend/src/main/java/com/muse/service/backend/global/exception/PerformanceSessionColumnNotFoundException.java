package com.muse.service.backend.global.exception;

public class PerformanceSessionColumnNotFoundException extends RuntimeException {

    public PerformanceSessionColumnNotFoundException() {
        super("Performance session column not found.");
    }
}
