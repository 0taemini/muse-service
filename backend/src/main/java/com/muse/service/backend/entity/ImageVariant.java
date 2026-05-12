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
        name = "image_variants",
        uniqueConstraints = @UniqueConstraint(name = "uk_image_variant_type", columnNames = {"image_id", "variant_type"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImageVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_variant_id")
    private Integer imageVariantId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "image_id", nullable = false)
    private ImageAsset image;

    @Enumerated(EnumType.STRING)
    @Column(name = "variant_type", nullable = false, length = 30)
    private VariantType variantType;

    @Column(name = "s3_key", nullable = false, length = 500)
    private String s3Key;

    @Column
    private Integer width;

    @Column
    private Integer height;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public ImageVariant(
            ImageAsset image,
            VariantType variantType,
            String s3Key,
            Integer width,
            Integer height,
            String contentType
    ) {
        this.image = image;
        this.variantType = variantType;
        this.s3Key = s3Key;
        this.width = width;
        this.height = height;
        this.contentType = contentType;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void updateFile(String s3Key, Integer width, Integer height, String contentType) {
        this.s3Key = s3Key;
        this.width = width;
        this.height = height;
        this.contentType = contentType;
    }

    public enum VariantType {
        THUMB_320, THUMB_480, DETAIL_1200, POSTER_1600
    }
}
