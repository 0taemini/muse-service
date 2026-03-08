package com.muse.service.backend.repository;

import com.muse.service.backend.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
    boolean existsByNickname(String nickname);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCaseAndUserIdNot(String email, Integer userId);

    boolean existsByAllUser_AllUserId(Integer allUserId);

    Optional<User> findByNickname(String nickname);

    Optional<User> findByEmail(String email);
}
