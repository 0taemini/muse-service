package com.muse.service.backend.service.chat;

import com.muse.service.backend.dto.chat.ChatMessageResponse;
import com.muse.service.backend.dto.chat.ChatMessageSendRequest;

public interface ChatMessageService {

    ChatMessageResponse sendMessage(Integer chatRoomId, Integer userId, ChatMessageSendRequest request);
}
