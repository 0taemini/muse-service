package com.muse.service.backend.repository;

import com.muse.service.backend.entity.FeedbackSummary;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackSummaryRepository extends JpaRepository<FeedbackSummary, Integer> {

    boolean existsByChatRound_ChatRoundId(Integer chatRoundId);

    List<FeedbackSummary> findAllByChatRound_ChatRoundIdOrderByPerformanceSongSession_DisplayOrderAsc(
            Integer chatRoundId
    );
}
