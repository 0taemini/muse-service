package com.muse.service.backend.global.exception;

public class PerformanceSessionColumnDuplicateException extends RuntimeException {

    public PerformanceSessionColumnDuplicateException() {
        super("A session column with the same name already exists.");
    }
}
