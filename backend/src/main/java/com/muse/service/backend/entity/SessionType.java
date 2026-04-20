package com.muse.service.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "session_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SessionType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_type_id")
    private Integer sessionTypeId;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "display_name", nullable = false, length = 20)
    private String displayName;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Builder
    public SessionType(String code, String displayName, Integer sortOrder, Boolean isDefault, Boolean isActive) {
        this.code = code;
        this.displayName = displayName;
        this.sortOrder = sortOrder;
        this.isDefault = isDefault;
        this.isActive = isActive;
    }

    @PrePersist
    void onCreate() {
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
        if (this.isDefault == null) {
            this.isDefault = Boolean.FALSE;
        }
        if (this.isActive == null) {
            this.isActive = Boolean.TRUE;
        }
    }

    public void syncMetadata(String displayName, Integer sortOrder, Boolean isDefault, Boolean isActive) {
        this.displayName = displayName;
        this.sortOrder = sortOrder;
        this.isDefault = isDefault;
        this.isActive = isActive;
    }
}
