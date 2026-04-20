package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "performance_session_columns",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"performance_id", "session_name"})
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformanceSessionColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "performance_session_column_id")
    private Integer performanceSessionColumnId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "performance_id", nullable = false)
    private Performance performance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "base_session_type_id")
    private SessionType baseSessionType;

    @Column(name = "session_name", nullable = false, length = 50)
    private String sessionName;

    @Column(name = "is_required", nullable = false)
    private Boolean isRequired;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_source", nullable = false, length = 20)
    private PerformanceSessionSource sessionSource;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public PerformanceSessionColumn(
            Performance performance,
            SessionType baseSessionType,
            String sessionName,
            Boolean isRequired,
            Integer displayOrder,
            PerformanceSessionSource sessionSource
    ) {
        this.performance = performance;
        this.baseSessionType = baseSessionType;
        this.sessionName = sessionName;
        this.isRequired = isRequired;
        this.displayOrder = displayOrder;
        this.sessionSource = sessionSource;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.isRequired == null) {
            this.isRequired = Boolean.TRUE;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 0;
        }
        if (this.sessionSource == null) {
            this.sessionSource = this.baseSessionType == null ? PerformanceSessionSource.CUSTOM : PerformanceSessionSource.DEFAULT;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateStructure(
            SessionType baseSessionType,
            String sessionName,
            Boolean isRequired,
            Integer displayOrder,
            PerformanceSessionSource sessionSource
    ) {
        this.baseSessionType = baseSessionType;
        this.sessionName = sessionName;
        this.isRequired = isRequired;
        this.displayOrder = displayOrder;
        this.sessionSource = sessionSource;
    }
}
