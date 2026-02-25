package com.muse.service.backend.repository;

import com.muse.service.backend.entity.PerformanceSong;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceSongRepository extends JpaRepository<PerformanceSong, Integer> {
}
