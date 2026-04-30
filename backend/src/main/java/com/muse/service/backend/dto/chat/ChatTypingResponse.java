package com.muse.service.backend.dto.chat;

public record ChatTypingResponse(
        Integer userId,
        String senderName,
        String senderNickname,
        Boolean typing
) {
}
