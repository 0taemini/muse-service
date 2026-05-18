package com.muse.service.backend.repository;

import com.muse.service.backend.entity.ImageAsset;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImageAssetRepository extends JpaRepository<ImageAsset, Integer> {

    @Query("""
            select image
            from ImageAsset image
            join fetch image.createdBy
            left join fetch image.album
            where image.imageId = :imageId
              and image.deletedAt is null
            """)
    Optional<ImageAsset> findActiveById(@Param("imageId") Integer imageId);

    @Query("""
            select image
            from ImageAsset image
            join fetch image.createdBy
            left join fetch image.album
            where image.imageType = :imageType
              and image.status = :status
              and image.deletedAt is null
            order by image.displayOrder asc, image.createdAt desc
            """)
    List<ImageAsset> findByTypeAndStatus(
            @Param("imageType") ImageAsset.ImageType imageType,
            @Param("status") ImageAsset.ImageStatus status
    );

    @Query("""
            select image
            from ImageAsset image
            join fetch image.createdBy
            left join fetch image.album
            where image.imageType = :imageType
              and image.status = :status
              and image.deletedAt is null
              and image.imageDate = :imageDate
            order by image.displayOrder asc, image.createdAt desc
            """)
    List<ImageAsset> findMemoriesByDate(
            @Param("imageType") ImageAsset.ImageType imageType,
            @Param("status") ImageAsset.ImageStatus status,
            @Param("imageDate") LocalDate imageDate
    );

    @Query("""
            select image
            from ImageAsset image
            join fetch image.createdBy
            left join fetch image.album
            where image.imageType = :imageType
              and image.status = :status
              and image.deletedAt is null
              and image.imageDate between :startDate and :endDate
            order by image.imageDate asc, image.displayOrder asc, image.createdAt desc
            """)
    List<ImageAsset> findMemoriesBetween(
            @Param("imageType") ImageAsset.ImageType imageType,
            @Param("status") ImageAsset.ImageStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("""
            select image
            from ImageAsset image
            join fetch image.createdBy
            join fetch image.album album
            where album.albumId = :albumId
              and image.imageType = :imageType
              and image.status = :status
              and image.deletedAt is null
            order by image.displayOrder asc, image.createdAt desc
            """)
    List<ImageAsset> findByAlbumIdAndTypeAndStatus(
            @Param("albumId") Integer albumId,
            @Param("imageType") ImageAsset.ImageType imageType,
            @Param("status") ImageAsset.ImageStatus status
    );
}
