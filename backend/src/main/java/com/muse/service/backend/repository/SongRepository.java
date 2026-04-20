package com.muse.service.backend.repository;

import com.muse.service.backend.entity.Song;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongRepository extends JpaRepository<Song, Integer> {
}
