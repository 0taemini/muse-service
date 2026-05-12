package com.muse.service.backend.repository;

import com.muse.service.backend.entity.PhotoAlbum;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhotoAlbumRepository extends JpaRepository<PhotoAlbum, Integer> {

    @Query("""
            select album
            from PhotoAlbum album
            join fetch album.createdBy
            where album.deletedAt is null
              and (:category is null or album.albumCategory = :category)
            order by album.displayOrder asc, album.createdAt desc
            """)
    List<PhotoAlbum> findActive(@Param("category") PhotoAlbum.AlbumCategory category);

    @Query("""
            select album
            from PhotoAlbum album
            join fetch album.createdBy
            where album.albumId = :albumId
              and album.deletedAt is null
            """)
    Optional<PhotoAlbum> findActiveById(@Param("albumId") Integer albumId);
}
