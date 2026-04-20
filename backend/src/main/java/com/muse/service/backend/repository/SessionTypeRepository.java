package com.muse.service.backend.repository;

import com.muse.service.backend.entity.SessionType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionTypeRepository extends JpaRepository<SessionType, Integer> {

    List<SessionType> findAllByIsDefaultTrueAndIsActiveTrueOrderBySortOrderAsc();

    List<SessionType> findAllByIsActiveTrueOrderBySortOrderAsc();
}
