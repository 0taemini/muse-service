package com.muse.service.backend.repository;

import com.muse.service.backend.entity.Performance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceRepository extends JpaRepository<Performance, Integer> {
}
