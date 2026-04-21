package com.muse.service.backend.repository;

import com.muse.service.backend.entity.ChatRound;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoundRepository extends JpaRepository<ChatRound, Integer> {

    Optional<ChatRound> findFirstByChatRoom_ChatRoomIdOrderByOpenedAtDesc(Integer chatRoomId);
}
