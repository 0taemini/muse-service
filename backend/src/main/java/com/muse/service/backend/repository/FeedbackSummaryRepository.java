package com.muse.service.backend.repository;

import com.muse.service.backend.entity.FeedbackSummary;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackSummaryRepository extends JpaRepository<FeedbackSummary, Integer> {
}
