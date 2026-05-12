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
@Table(name = "photo_albums")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoAlbum {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "album_id")
    private Integer albumId;

    @Enumerated(EnumType.STRING)
    @Column(name = "album_category", nullable = false, length = 20)
    private AlbumCategory albumCategory;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

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
    public PhotoAlbum(
            AlbumCategory albumCategory,
            String title,
            String description,
            Integer displayOrder,
            User createdBy
    ) {
        this.albumCategory = albumCategory == null ? AlbumCategory.ETC : albumCategory;
        this.title = title;
        this.description = description;
        this.displayOrder = displayOrder == null ? 0 : displayOrder;
        this.createdBy = createdBy;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.albumCategory == null) {
            this.albumCategory = AlbumCategory.ETC;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 0;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDetails(AlbumCategory albumCategory, String title, String description, Integer displayOrder) {
        this.albumCategory = albumCategory == null ? AlbumCategory.ETC : albumCategory;
        this.title = title;
        this.description = description;
        this.displayOrder = displayOrder == null ? 0 : displayOrder;
    }

    public void markDeleted() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public enum AlbumCategory {
        PERFORMANCE, ACTIVITY, ETC
    }
}
