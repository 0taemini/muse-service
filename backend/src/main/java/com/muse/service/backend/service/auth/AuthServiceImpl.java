package com.muse.service.backend.service.auth;

import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.AllUserRepository;
import com.muse.service.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AllUserRepository allUserRepository;
    private final UserService userService;
    private final PhoneVerificationService phoneVerificationService;

    @Override
    @Transactional(readOnly = true)
    public void requestPhoneVerification(PhoneVerificationRequest request) {
        findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        phoneVerificationService.issueCode(request.name(), request.cohort(), request.phone());
    }

    @Override
    @Transactional
    public UserResponse signup(SignupRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        phoneVerificationService.verifyCode(request.name(), request.cohort(), request.phone(), request.verificationCode());

        return userService.create(new UserCreateRequest(
                allUser.getAllUserId(),
                request.email(),
                request.password(),
                request.nickname()
        ));
    }

    private AllUser findRegisteredAllUser(String name, Integer cohort, String phone) {
        return allUserRepository.findByNameAndCohortAndPhoneAndStatus(name, cohort, phone, AllUser.AllUserStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.UNREGISTERED_USER));
    }
}
