package com.muse.service.backend.repository;

import com.muse.service.backend.entity.ChatRound;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoundRepository extends JpaRepository<ChatRound, Integer> {
}
