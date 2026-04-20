package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "messages",
        indexes = {
                @Index(name = "idx_messages_round_created", columnList = "chat_round_id, created_at"),
                @Index(name = "idx_messages_sender_created", columnList = "sender_user_id, created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Integer messageId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chat_round_id", nullable = false)
    private ChatRound chatRound;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_user_id", nullable = false)
    private User senderUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_performance_song_session_id", nullable = false)
    private PerformanceSongSession targetPerformanceSongSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_representative_session_type_id")
    private SessionType senderRepresentativeSessionType;

    @Column(name = "sender_representative_session_name", length = 50)
    private String senderRepresentativeSessionName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public Message(
            ChatRound chatRound,
            User senderUser,
            PerformanceSongSession targetPerformanceSongSession,
            SessionType senderRepresentativeSessionType,
            String senderRepresentativeSessionName,
            String content
    ) {
        this.chatRound = chatRound;
        this.senderUser = senderUser;
        this.targetPerformanceSongSession = targetPerformanceSongSession;
        this.senderRepresentativeSessionType = senderRepresentativeSessionType;
        this.senderRepresentativeSessionName = senderRepresentativeSessionName;
        this.content = content;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
