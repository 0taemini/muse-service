package com.muse.service.backend.repository;

import com.muse.service.backend.entity.Performance;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceRepository extends JpaRepository<Performance, Integer> {

    List<Performance> findAllByOrderByCreatedAtDesc();
}
