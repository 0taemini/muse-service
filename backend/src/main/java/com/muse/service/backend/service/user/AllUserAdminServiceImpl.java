package com.muse.service.backend.service.user;

import com.muse.service.backend.dto.user.AllUserCreateRequest;
import com.muse.service.backend.dto.user.AllUserResponse;
import com.muse.service.backend.dto.user.AllUserStatusUpdateRequest;
import com.muse.service.backend.dto.user.AllUserUpdateRequest;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.AllUserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AllUserAdminServiceImpl implements AllUserAdminService {

    private final AllUserRepository allUserRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AllUserResponse> getAll() {
        return allUserRepository.findAllByOrderByCohortDescNameAsc().stream()
                .map(AllUserResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public AllUserResponse create(AllUserCreateRequest request) {
        String name = normalizeRequiredText(request.name());
        Integer cohort = request.cohort();
        String email = normalizeOptionalEmail(request.email());
        String phone = normalizePhone(request.phone());

        validateDuplicateForCreate(name, cohort, email, phone);

        AllUser allUser = allUserRepository.save(AllUser.builder()
                .name(name)
                .cohort(cohort)
                .email(email)
                .phone(phone)
                .status(AllUser.AllUserStatus.ACTIVE)
                .build());
        return AllUserResponse.from(allUser);
    }

    @Override
    @Transactional
    public AllUserResponse update(Integer allUserId, AllUserUpdateRequest request) {
        AllUser allUser = findAllUser(allUserId);
        String name = normalizeRequiredText(request.name());
        Integer cohort = request.cohort();
        String email = normalizeOptionalEmail(request.email());
        String phone = normalizePhone(request.phone());

        validateDuplicateForUpdate(allUserId, name, cohort, email, phone);

        allUser.changeName(name);
        allUser.changeCohort(cohort);
        allUser.changeEmail(email);
        allUser.changePhone(phone);
        return AllUserResponse.from(allUser);
    }

    @Override
    @Transactional
    public AllUserResponse updateStatus(Integer allUserId, AllUserStatusUpdateRequest request) {
        AllUser allUser = findAllUser(allUserId);
        allUser.changeStatus(request.status());
        return AllUserResponse.from(allUser);
    }

    @Override
    @Transactional
    public void delete(Integer allUserId) {
        AllUser allUser = findAllUser(allUserId);
        allUser.changeStatus(AllUser.AllUserStatus.DELETED);
    }

    private void validateDuplicateForCreate(String name, Integer cohort, String email, String phone) {
        if (StringUtils.hasText(email) && allUserRepository.existsByEmailIgnoreCase(email)) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_IN_USE);
        }
        if (allUserRepository.existsByNameAndCohortAndPhone(name, cohort, phone)) {
            throw new CustomException(ErrorCode.DATA_CONFLICT);
        }
    }

    private void validateDuplicateForUpdate(Integer allUserId, String name, Integer cohort, String email, String phone) {
        if (StringUtils.hasText(email) && allUserRepository.existsByEmailIgnoreCaseAndAllUserIdNot(email, allUserId)) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_IN_USE);
        }
        if (allUserRepository.existsByNameAndCohortAndPhoneAndAllUserIdNot(name, cohort, phone, allUserId)) {
            throw new CustomException(ErrorCode.DATA_CONFLICT);
        }
    }

    private AllUser findAllUser(Integer allUserId) {
        return allUserRepository.findById(allUserId)
                .orElseThrow(() -> new CustomException(ErrorCode.ALL_USER_NOT_FOUND));
    }

    private String normalizeRequiredText(String value) {
        if (!StringUtils.hasText(value)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR);
        }
        return value.trim();
    }

    private String normalizeOptionalEmail(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim().toLowerCase();
    }

    private String normalizePhone(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String digitsOnly = value.replaceAll("[^0-9]", "");
        return StringUtils.hasText(digitsOnly) ? digitsOnly : null;
    }
}
