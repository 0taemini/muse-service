package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
        name = "performance_song_sessions",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"performance_song_id", "performance_session_column_id"}),
                @UniqueConstraint(columnNames = {"performance_song_id", "session_name"})
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformanceSongSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "performance_song_session_id")
    private Integer performanceSongSessionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "performance_song_id", nullable = false)
    private PerformanceSong performanceSong;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performance_session_column_id")
    private PerformanceSessionColumn performanceSessionColumn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "base_session_type_id")
    private SessionType baseSessionType;

    @Column(name = "session_name", nullable = false, length = 50)
    private String sessionName;

    @Column(name = "is_required", nullable = false)
    private Boolean isRequired;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_user_id")
    private User assignedUser;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "session_source", nullable = false, length = 20)
    private PerformanceSessionSource sessionSource;

    @Builder
    public PerformanceSongSession(
            PerformanceSong performanceSong,
            PerformanceSessionColumn performanceSessionColumn,
            SessionType baseSessionType,
            String sessionName,
            Boolean isRequired,
            Integer displayOrder,
            User assignedUser,
            PerformanceSessionSource sessionSource
    ) {
        this.performanceSong = performanceSong;
        this.performanceSessionColumn = performanceSessionColumn;
        this.baseSessionType = baseSessionType;
        this.sessionName = sessionName;
        this.isRequired = isRequired;
        this.displayOrder = displayOrder;
        this.assignedUser = assignedUser;
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
            this.sessionSource = this.performanceSessionColumn == null
                    ? (this.baseSessionType == null ? PerformanceSessionSource.CUSTOM : PerformanceSessionSource.DEFAULT)
                    : this.performanceSessionColumn.getSessionSource();
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void applyColumn(PerformanceSessionColumn performanceSessionColumn) {
        this.performanceSessionColumn = performanceSessionColumn;
        this.baseSessionType = performanceSessionColumn.getBaseSessionType();
        this.sessionName = performanceSessionColumn.getSessionName();
        this.isRequired = performanceSessionColumn.getIsRequired();
        this.displayOrder = performanceSessionColumn.getDisplayOrder();
        this.sessionSource = performanceSessionColumn.getSessionSource();
    }

    public void assignUser(User assignedUser) {
        this.assignedUser = assignedUser;
    }

    public void syncBaseSessionType(
            SessionType baseSessionType,
            String sessionName,
            PerformanceSessionSource sessionSource
    ) {
        this.baseSessionType = baseSessionType;
        this.sessionName = sessionName;
        this.sessionSource = sessionSource;
    }
}
