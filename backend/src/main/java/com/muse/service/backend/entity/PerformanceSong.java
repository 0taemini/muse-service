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
@Table(name = "performance_songs")
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

    @Column(name = "song_title", nullable = false, length = 200)
    private String songTitle;

    @Column(nullable = false, length = 50)
    private String singer;

    @Column(name = "is_sheet", nullable = false)
    private Boolean isSheet;

    @Column(name = "order_no", nullable = false)
    private Integer orderNo;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_status", nullable = false, length = 20)
    private SelectionStatus selectionStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by_user_id")
    private User deletedByUser;

    @Builder
    public PerformanceSong(
            Performance performance,
            String songTitle,
            String singer,
            Boolean isSheet,
            Integer orderNo,
            SelectionStatus selectionStatus,
            User createdByUser,
            Boolean isDeleted,
            LocalDateTime deletedAt,
            User deletedByUser
    ) {
        this.performance = performance;
        this.songTitle = songTitle;
        this.singer = singer;
        this.isSheet = isSheet;
        this.orderNo = orderNo;
        this.selectionStatus = selectionStatus;
        this.createdByUser = createdByUser;
        this.isDeleted = isDeleted;
        this.deletedAt = deletedAt;
        this.deletedByUser = deletedByUser;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.selectionStatus == null) {
            this.selectionStatus = SelectionStatus.NOT_BAD;
        }
        if (this.isSheet == null) {
            this.isSheet = Boolean.FALSE;
        }
        if (this.isDeleted == null) {
            this.isDeleted = Boolean.FALSE;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDetails(String songTitle, String singer, Boolean isSheet, Integer orderNo) {
        this.songTitle = songTitle;
        this.singer = singer;
        this.isSheet = isSheet;
        this.orderNo = orderNo;
    }

    public void changeSelectionStatus(SelectionStatus selectionStatus) {
        this.selectionStatus = selectionStatus;
    }

    public void softDelete(User deletedByUser) {
        this.isDeleted = Boolean.TRUE;
        this.deletedAt = LocalDateTime.now();
        this.deletedByUser = deletedByUser;
    }

    public enum SelectionStatus {
        CONFIRMED, NOT_BAD, OUT
    }
}
