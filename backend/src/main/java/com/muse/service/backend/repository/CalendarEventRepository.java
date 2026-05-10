package com.muse.service.backend.repository;

import com.muse.service.backend.entity.CalendarEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Integer> {

    @Query("""
            select event
            from CalendarEvent event
            join fetch event.createdBy
            where event.eventId = :eventId
              and (event.isDeleted = false or event.isDeleted is null)
            """)
    Optional<CalendarEvent> findActiveById(@Param("eventId") Integer eventId);

    @Query("""
            select event
            from CalendarEvent event
            join fetch event.createdBy
            where (event.isDeleted = false or event.isDeleted is null)
            order by event.startAt asc, event.eventId asc
            """)
    List<CalendarEvent> findAllActive();

    @Query("""
            select event
            from CalendarEvent event
            join fetch event.createdBy
            where (event.isDeleted = false or event.isDeleted is null)
              and event.endAt >= :startAt
            order by event.startAt asc, event.eventId asc
            """)
    List<CalendarEvent> findActiveEndingAfter(@Param("startAt") LocalDateTime startAt);

    @Query("""
            select event
            from CalendarEvent event
            join fetch event.createdBy
            where (event.isDeleted = false or event.isDeleted is null)
              and event.startAt < :endAt
            order by event.startAt asc, event.eventId asc
            """)
    List<CalendarEvent> findActiveStartingBefore(@Param("endAt") LocalDateTime endAt);

    @Query("""
            select event
            from CalendarEvent event
            join fetch event.createdBy
            where (event.isDeleted = false or event.isDeleted is null)
              and event.endAt >= :startAt
              and event.startAt < :endAt
            order by event.startAt asc, event.eventId asc
            """)
    List<CalendarEvent> findActiveBetween(
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt
    );
}
