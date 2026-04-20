package com.muse.service.backend.repository;

import com.muse.service.backend.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Integer> {
}
