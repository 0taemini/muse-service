package com.muse.service.backend.repository;

import com.muse.service.backend.entity.Message;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Integer> {

    List<Message> findAllByChatRound_ChatRoundIdOrderByCreatedAtAsc(Integer chatRoundId);

    boolean existsByChatRound_ChatRoundId(Integer chatRoundId);
}
