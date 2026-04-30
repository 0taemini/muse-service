package com.muse.service.backend.service.chat;

import com.muse.service.backend.dto.chat.ChatRoomCreateRequest;
import com.muse.service.backend.dto.chat.ChatRoomDetailResponse;
import com.muse.service.backend.dto.chat.ChatRoomSummaryResponse;
import com.muse.service.backend.dto.chat.ChatRoundSummaryResponse;
import com.muse.service.backend.dto.chat.FeedbackSummaryResponse;
import java.util.List;

public interface ChatRoomService {

    List<ChatRoomSummaryResponse> createRooms(Integer performanceId, Integer userId, ChatRoomCreateRequest request);

    List<ChatRoomSummaryResponse> getVisibleRooms(Integer performanceId);

    ChatRoomDetailResponse getDetail(Integer performanceId, Integer chatRoomId, Integer userId);

    ChatRoundSummaryResponse startNewRound(Integer performanceId, Integer chatRoomId, Integer userId);

    List<FeedbackSummaryResponse> summarizeRound(
            Integer performanceId,
            Integer chatRoomId,
            Integer chatRoundId,
            Integer userId
    );
}
