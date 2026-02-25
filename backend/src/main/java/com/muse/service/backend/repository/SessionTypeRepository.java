package com.muse.service.backend.repository;

import com.muse.service.backend.entity.SessionType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionTypeRepository extends JpaRepository<SessionType, Integer> {
}
