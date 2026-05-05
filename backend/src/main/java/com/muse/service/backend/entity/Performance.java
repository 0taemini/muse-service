package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "performances")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Performance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "performance_id")
    private Integer performanceId;

    @Column(nullable = false, length = 50)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PerformanceStatus status = PerformanceStatus.ONGOING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public Performance(String title) {
        this.title = title;
        this.status = PerformanceStatus.ONGOING;
    }

    @PrePersist
    void onCreate() {
        if (this.status == null) {
            this.status = PerformanceStatus.ONGOING;
        }
        this.createdAt = LocalDateTime.now();
    }

    public PerformanceStatus getStatus() {
        return status == null ? PerformanceStatus.ONGOING : status;
    }

    public void updateDetails(String title, PerformanceStatus status) {
        this.title = title;
        this.status = status;
    }

    public enum PerformanceStatus {
        ONGOING, COMPLETED
    }
}
