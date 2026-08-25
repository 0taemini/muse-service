package com.muse.service.backend.service.sms;

import com.muse.service.backend.dto.sms.BulkSmsSendRequest;
import com.muse.service.backend.dto.sms.BulkSmsSendResponse;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.AllUserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class BulkSmsServiceImpl implements BulkSmsService {

    private final AllUserRepository allUserRepository;
    private final SmsService smsService;

    @Override
    @Transactional(readOnly = true)
    public BulkSmsSendResponse send(BulkSmsSendRequest request) {
        String template = request.message().trim();
        Map<Integer, AllUser> recipients = new LinkedHashMap<>();

        List<Integer> cohorts = request.cohorts() == null ? List.of() : request.cohorts().stream().distinct().toList();
        if (!cohorts.isEmpty()) {
            allUserRepository.findAllByStatusAndCohortInOrderByCohortDescNameAsc(
                            AllUser.AllUserStatus.ACTIVE, cohorts)
                    .forEach(user -> recipients.put(user.getAllUserId(), user));
        }

        List<Integer> allUserIds = request.allUserIds() == null
                ? List.of()
                : request.allUserIds().stream().distinct().toList();
        if (!allUserIds.isEmpty()) {
            allUserRepository.findAllByAllUserIdInAndStatus(allUserIds, AllUser.AllUserStatus.ACTIVE)
                    .forEach(user -> recipients.put(user.getAllUserId(), user));
        }

        List<SmsMessage> messages = new ArrayList<>();
        for (AllUser user : recipients.values()) {
            if (StringUtils.hasText(user.getName()) && StringUtils.hasText(user.getPhone())) {
                messages.add(new SmsMessage(user.getPhone(), template.replace("[이름]", user.getName())));
            }
        }

        if (messages.isEmpty()) {
            throw new CustomException(ErrorCode.BULK_SMS_NO_RECIPIENTS);
        }

        smsService.sendBulk(messages);
        log.info("단체 문자 발송 완료: recipientCount={}", messages.size());
        return new BulkSmsSendResponse(messages.size());
    }
}