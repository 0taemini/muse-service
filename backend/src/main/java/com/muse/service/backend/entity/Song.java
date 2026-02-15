package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "songs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "song_id")
    private Integer songId;

    @Column(name = "song_title", nullable = false, length = 200)
    private String songTitle;

    @Column(nullable = false, length = 50)
    private String singer;

    @Column(name = "is_sheet", nullable = false)
    private Boolean isSheet;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public Song(String songTitle, String singer, Boolean isSheet) {
        this.songTitle = songTitle;
        this.singer = singer;
        this.isSheet = isSheet;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.isSheet == null) {
            this.isSheet = Boolean.FALSE;
        }
    }
}
