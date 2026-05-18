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
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "image_assets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImageAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id")
    private Integer imageId;

    @Enumerated(EnumType.STRING)
    @Column(name = "image_type", nullable = false, length = 20)
    private ImageType imageType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    private PhotoAlbum album;

    @Column(length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_date")
    private LocalDate imageDate;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ImageStatus status;

    @Column(name = "original_key", nullable = false, length = 500)
    private String originalKey;

    @Column(name = "original_content_type", nullable = false, length = 100)
    private String originalContentType;

    @Column(name = "original_file_size")
    private Long originalFileSize;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public ImageAsset(
            ImageType imageType,
            PhotoAlbum album,
            String title,
            String description,
            LocalDate imageDate,
            Integer displayOrder,
            String originalKey,
            String originalContentType,
            Long originalFileSize,
            User createdBy
    ) {
        this.imageType = imageType;
        this.album = album;
        this.title = title;
        this.description = description;
        this.imageDate = imageDate;
        this.displayOrder = displayOrder == null ? 0 : displayOrder;
        this.status = ImageStatus.PROCESSING;
        this.originalKey = originalKey;
        this.originalContentType = originalContentType;
        this.originalFileSize = originalFileSize;
        this.createdBy = createdBy;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.displayOrder == null) {
            this.displayOrder = 0;
        }
        if (this.status == null) {
            this.status = ImageStatus.PROCESSING;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDetails(String title, String description, LocalDate imageDate, Integer displayOrder) {
        this.title = title;
        this.description = description;
        this.imageDate = imageDate;
        this.displayOrder = displayOrder == null ? 0 : displayOrder;
    }

    public void updateOriginalKey(String originalKey) {
        this.originalKey = originalKey;
    }

    public void markReady() {
        this.status = ImageStatus.READY;
    }

    public void markFailed() {
        this.status = ImageStatus.FAILED;
    }

    public void markDeleted() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public enum ImageType {
        POSTER, MEMORY, ALBUM
    }

    public enum ImageStatus {
        PROCESSING, READY, FAILED
    }
}
