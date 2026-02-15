package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "chat_rounds",
        indexes = {
                @Index(name = "idx_chat_rounds_room_opened", columnList = "chat_room_id, opened_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_round_id")
    private Integer chatRoundId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoundStatus status;

    @Column(name = "summarized_at")
    private LocalDateTime summarizedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "summarized_by")
    private User summarizedBy;

    @Builder
    public ChatRound(
            ChatRoom chatRoom,
            LocalDateTime closedAt,
            RoundStatus status,
            LocalDateTime summarizedAt,
            User summarizedBy
    ) {
        this.chatRoom = chatRoom;
        this.closedAt = closedAt;
        this.status = status;
        this.summarizedAt = summarizedAt;
        this.summarizedBy = summarizedBy;
    }

    @PrePersist
    void onCreate() {
        this.openedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = RoundStatus.OPEN;
        }
    }

    public enum RoundStatus {
        OPEN, CLOSED
    }
}
