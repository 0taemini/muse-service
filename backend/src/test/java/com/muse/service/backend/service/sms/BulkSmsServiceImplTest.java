package com.muse.service.backend.service.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.muse.service.backend.dto.sms.BulkSmsSendRequest;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.repository.AllUserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class BulkSmsServiceImplTest {

    @Mock
    private AllUserRepository allUserRepository;

    @Mock
    private SmsService smsService;

    private BulkSmsServiceImpl bulkSmsService;

    @BeforeEach
    void setUp() {
        bulkSmsService = new BulkSmsServiceImpl(allUserRepository, smsService);
    }

    @Test
    void send_mergesCohortsAndSelectedUsersWithoutDuplicatesAndReplacesName() {
        AllUser cohortMember = user("민수", 41, "01011112222");
        AllUser selectedMember = user("지은", 42, "01033334444");
                ReflectionTestUtils.setField(cohortMember, "allUserId", 1);
                ReflectionTestUtils.setField(selectedMember, "allUserId", 2);
        when(allUserRepository.findAllByStatusAndCohortInOrderByCohortDescNameAsc(
                AllUser.AllUserStatus.ACTIVE, List.of(41)))
                .thenReturn(List.of(cohortMember));
        when(allUserRepository.findAllByAllUserIdInAndStatus(
                List.of(1, 2), AllUser.AllUserStatus.ACTIVE))
                .thenReturn(List.of(cohortMember, selectedMember));

        var response = bulkSmsService.send(new BulkSmsSendRequest(
                List.of(41), List.of(1, 2), "안녕하세요 [이름] 선배님"
        ));

        assertThat(response.recipientCount()).isEqualTo(2);
        ArgumentCaptor<List<SmsMessage>> captor = ArgumentCaptor.forClass(List.class);
        verify(smsService).sendBulk(captor.capture());
        assertThat(captor.getValue()).extracting(SmsMessage::phone)
                .containsExactly("01011112222", "01033334444");
        assertThat(captor.getValue()).extracting(SmsMessage::text)
                .containsExactly("안녕하세요 민수 선배님", "안녕하세요 지은 선배님");
    }

    private AllUser user(String name, int cohort, String phone) {
        return AllUser.builder()
                .name(name)
                .cohort(cohort)
                .phone(phone)
                .status(AllUser.AllUserStatus.ACTIVE)
                .build();
    }
}