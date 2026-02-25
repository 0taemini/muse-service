package com.muse.service.backend.repository;

import com.muse.service.backend.entity.AllUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AllUserRepository extends JpaRepository<AllUser, Integer> {
}
