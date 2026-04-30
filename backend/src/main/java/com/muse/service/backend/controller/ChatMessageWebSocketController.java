package com.muse.service.backend.controller;

import com.muse.service.backend.dto.chat.ChatMessageResponse;
import com.muse.service.backend.dto.chat.ChatMessageSendRequest;
import com.muse.service.backend.dto.chat.ChatTypingRequest;
import com.muse.service.backend.dto.chat.ChatTypingResponse;
import com.muse.service.backend.entity.ChatRoom;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.PerformanceMemberRepository;
import com.muse.service.backend.repository.UserRepository;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.chat.ChatMessageService;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatMessageWebSocketController {

    private final ChatMessageService chatMessageService;
    private final ChatRoomRepository chatRoomRepository;
    private final PerformanceMemberRepository performanceMemberRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat-rooms/{chatRoomId}/messages")
    public void sendMessage(
            @DestinationVariable Integer chatRoomId,
            ChatMessageSendRequest request,
            Principal principal
    ) {
        ChatMessageResponse response = chatMessageService.sendMessage(
                chatRoomId,
                authenticatedUserId(principal),
                request
        );
        messagingTemplate.convertAndSend("/topic/chat-rooms/" + chatRoomId + "/messages", response);
    }

    @MessageMapping("/chat-rooms/{chatRoomId}/typing")
    public void typing(
            @DestinationVariable Integer chatRoomId,
            ChatTypingRequest request,
            Principal principal
    ) {
        Integer userId = authenticatedUserId(principal);
        ensureTypingAllowed(chatRoomId, userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        ChatTypingResponse response = new ChatTypingResponse(
                user.getUserId(),
                user.getName(),
                user.getNickname(),
                request != null && Boolean.TRUE.equals(request.typing())
        );
        messagingTemplate.convertAndSend("/topic/chat-rooms/" + chatRoomId + "/typing", response);
    }

    private void ensureTypingAllowed(Integer chatRoomId, Integer userId) {
        ChatRoom chatRoom = chatRoomRepository.findByIdWithPerformanceSongAndPerformance(chatRoomId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));
        PerformanceSong performanceSong = chatRoom.getPerformanceSong();
        Integer performanceId = performanceSong.getPerformance().getPerformanceId();

        if (!performanceMemberRepository.existsByPerformance_PerformanceIdAndUser_UserId(performanceId, userId)
                || Boolean.TRUE.equals(performanceSong.getIsDeleted())
                || performanceSong.getSelectionStatus() != PerformanceSong.SelectionStatus.CONFIRMED) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }
    }

    private Integer authenticatedUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken authentication
                && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }
        throw new CustomException(ErrorCode.UNAUTHORIZED);
    }
}
