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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "all_user_id", nullable = false, unique = true)
    private AllUser allUser;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer cohort;

    @Column(unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, unique = true, length = 30)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRank rank;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public User(
            AllUser allUser,
            String name,
            Integer cohort,
            String email,
            String password,
            String nickname,
            UserRank rank,
            UserStatus status,
            UserRole role
    ) {
        this.allUser = allUser;
        this.name = name;
        this.cohort = cohort;
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.rank = rank;
        this.status = status;
        this.role = role;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum UserRank {
        NEWBIE, ACTIVE, YB, OB
    }

    public enum UserStatus {
        ACTIVE, DELETED
    }

    public enum UserRole {
        USER, ADMIN, GUEST
    }
}
