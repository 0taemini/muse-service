package com.muse.service.backend.service.chat;

import com.muse.service.backend.dto.chat.ChatRoomCreateRequest;
import com.muse.service.backend.dto.chat.ChatRoomSummaryResponse;
import java.util.List;

public interface ChatRoomService {

    List<ChatRoomSummaryResponse> createRooms(Integer performanceId, Integer userId, ChatRoomCreateRequest request);

    List<ChatRoomSummaryResponse> getVisibleRooms(Integer performanceId);
}
