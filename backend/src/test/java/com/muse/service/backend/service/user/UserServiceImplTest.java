package com.muse.service.backend.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.muse.service.backend.dto.user.UserRoleUpdateRequest;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.repository.AllUserRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AllUserRepository allUserRepository;

    @Mock
    private PerformanceSongSessionRepository performanceSongSessionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(
                userRepository,
                allUserRepository,
                performanceSongSessionRepository,
                passwordEncoder
        );
    }

    @Test
    void updateRole_changesUserRole() {
        User user = user(1, User.UserRole.USER);
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        var response = userService.updateRole(1, new UserRoleUpdateRequest(User.UserRole.ADMIN));

        assertThat(response.userId()).isEqualTo(1);
        assertThat(response.role()).isEqualTo(User.UserRole.ADMIN);
        assertThat(user.getRole()).isEqualTo(User.UserRole.ADMIN);
    }

    @Test
    void updateStatus_whenDeleted_clearsSessionAssignments() {
        User user = user(1, User.UserRole.USER);
        PerformanceSongSession session = PerformanceSongSession.builder()
                .assignedUser(user)
                .build();
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(performanceSongSessionRepository.findAllByAssignedUser_UserId(1)).thenReturn(java.util.List.of(session));

        var response = userService.updateStatus(1, new UserStatusUpdateRequest(User.UserStatus.DELETED));

        assertThat(response.status()).isEqualTo(User.UserStatus.DELETED);
        assertThat(session.getAssignedUser()).isNull();
        verify(performanceSongSessionRepository).findAllByAssignedUser_UserId(1);
    }

    private User user(Integer id, User.UserRole role) {
        AllUser allUser = AllUser.builder()
                .name("Admin Target")
                .cohort(41)
                .phone("01012345678")
                .email("target@example.com")
                .build();
        ReflectionTestUtils.setField(allUser, "allUserId", id);

        User user = User.builder()
                .allUser(allUser)
                .name("Admin Target")
                .cohort(41)
                .email("target@example.com")
                .password("encoded")
                .nickname("target")
                .rank(User.UserRank.ACTIVE)
                .status(User.UserStatus.ACTIVE)
                .role(role)
                .build();
        ReflectionTestUtils.setField(user, "userId", id);
        ReflectionTestUtils.setField(user, "createdAt", LocalDateTime.of(2026, 4, 30, 20, 0));
        ReflectionTestUtils.setField(user, "updatedAt", LocalDateTime.of(2026, 4, 30, 20, 0));
        return user;
    }
}
