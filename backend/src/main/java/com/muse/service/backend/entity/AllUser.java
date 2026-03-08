package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "all_user")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AllUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "all_user_id")
    private Integer allUserId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer cohort;

    @Column(unique = true, length = 255)
    private String email;

    @Column(length = 30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AllUserStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public AllUser(
            String name,
            Integer cohort,
            String email,
            String phone,
            AllUserStatus status
    ) {
        this.name = name;
        this.cohort = cohort;
        this.email = email;
        this.phone = phone;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = AllUserStatus.ACTIVE;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum AllUserStatus {
        ACTIVE, DELETED
    }

    public void changeEmail(String email) {
        this.email = email;
    }

    public void changeCohort(Integer cohort) {
        this.cohort = cohort;
    }
}
