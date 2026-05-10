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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "calendar_events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Integer eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performance_id")
    private Performance performance;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 20)
    private EventType eventType;

    @Column(length = 100)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted = Boolean.FALSE;

    @Builder
    public CalendarEvent(
            Performance performance,
            String title,
            LocalDateTime startAt,
            LocalDateTime endAt,
            EventType eventType,
            String location,
            String description,
            User createdBy
    ) {
        this.performance = performance;
        this.title = title;
        this.startAt = startAt;
        this.endAt = endAt;
        this.eventType = eventType == null ? EventType.EVENT : eventType;
        this.location = location;
        this.description = description;
        this.createdBy = createdBy;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.eventType == null) {
            this.eventType = EventType.EVENT;
        }
        if (this.isDeleted == null) {
            this.isDeleted = Boolean.FALSE;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDetails(
            String title,
            LocalDateTime startAt,
            LocalDateTime endAt,
            EventType eventType,
            String location,
            String description
    ) {
        this.title = title;
        this.startAt = startAt;
        this.endAt = endAt;
        this.eventType = eventType;
        this.location = location;
        this.description = description;
    }

    public void markDeleted() {
        this.isDeleted = Boolean.TRUE;
    }

    public enum EventType {
        PERFORMANCE, PRACTICE, MEETING, EVENT
    }
}
