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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "performance_songs",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"performance_id", "song_id"}),
                @UniqueConstraint(columnNames = {"performance_id", "order_no"})
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformanceSong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "performance_song_id")
    private Integer performanceSongId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "performance_id", nullable = false)
    private Performance performance;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Column(name = "order_no", nullable = false)
    private Integer orderNo;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_status", nullable = false, length = 20)
    private SelectionStatus selectionStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public PerformanceSong(
            Performance performance,
            Song song,
            Integer orderNo,
            SelectionStatus selectionStatus
    ) {
        this.performance = performance;
        this.song = song;
        this.orderNo = orderNo;
        this.selectionStatus = selectionStatus;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.selectionStatus == null) {
            this.selectionStatus = SelectionStatus.NOT_BAD;
        }
    }

    public enum SelectionStatus {
        CONFIRMED, NOT_BAD, OUT
    }
}
