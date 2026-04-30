package com.muse.service.backend.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.muse.service.backend.dto.user.AllUserCreateRequest;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.repository.AllUserRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AllUserAdminServiceImplTest {

    @Mock
    private AllUserRepository allUserRepository;

    private AllUserAdminServiceImpl allUserAdminService;

    @BeforeEach
    void setUp() {
        allUserAdminService = new AllUserAdminServiceImpl(allUserRepository);
    }

    @Test
    void create_normalizesEmailAndPhone() {
        when(allUserRepository.existsByEmailIgnoreCase("member@example.com")).thenReturn(false);
        when(allUserRepository.existsByNameAndCohortAndPhone("Member", 41, "01012345678")).thenReturn(false);
        when(allUserRepository.save(any(AllUser.class))).thenAnswer(invocation -> {
            AllUser allUser = invocation.getArgument(0);
            ReflectionTestUtils.setField(allUser, "allUserId", 1);
            ReflectionTestUtils.setField(allUser, "createdAt", LocalDateTime.of(2026, 4, 30, 20, 0));
            ReflectionTestUtils.setField(allUser, "updatedAt", LocalDateTime.of(2026, 4, 30, 20, 0));
            return allUser;
        });

        var response = allUserAdminService.create(new AllUserCreateRequest(
                " Member ",
                41,
                " Member@Example.com ",
                "010-1234-5678"
        ));

        assertThat(response.allUserId()).isEqualTo(1);
        assertThat(response.name()).isEqualTo("Member");
        assertThat(response.email()).isEqualTo("member@example.com");
        assertThat(response.phone()).isEqualTo("01012345678");
        assertThat(response.status()).isEqualTo(AllUser.AllUserStatus.ACTIVE);
    }

    @Test
    void delete_changesStatusToDeleted() {
        AllUser allUser = allUser(1);
        when(allUserRepository.findById(1)).thenReturn(Optional.of(allUser));

        allUserAdminService.delete(1);

        assertThat(allUser.getStatus()).isEqualTo(AllUser.AllUserStatus.DELETED);
    }

    private AllUser allUser(Integer id) {
        AllUser allUser = AllUser.builder()
                .name("Member")
                .cohort(41)
                .email("member@example.com")
                .phone("01012345678")
                .status(AllUser.AllUserStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(allUser, "allUserId", id);
        ReflectionTestUtils.setField(allUser, "createdAt", LocalDateTime.of(2026, 4, 30, 20, 0));
        ReflectionTestUtils.setField(allUser, "updatedAt", LocalDateTime.of(2026, 4, 30, 20, 0));
        return allUser;
    }
}
