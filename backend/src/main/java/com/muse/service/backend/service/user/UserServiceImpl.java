package com.muse.service.backend.service.user;

import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserProfileUpdateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.AllUserRepository;
import com.muse.service.backend.repository.UserRepository;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AllUserRepository allUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserResponse create(UserCreateRequest request) {
        if (userRepository.existsByAllUser_AllUserId(request.allUserId())) {
            throw new CustomException(ErrorCode.ALL_USER_ALREADY_LINKED);
        }

        if (userRepository.existsByNickname(request.nickname())) {
            throw new CustomException(ErrorCode.NICKNAME_ALREADY_IN_USE);
        }

        String normalizedEmail = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_IN_USE);
        }

        AllUser allUser = allUserRepository.findById(request.allUserId())
                .orElseThrow(() -> new CustomException(ErrorCode.ALL_USER_NOT_FOUND));
        if (allUserRepository.existsByEmailIgnoreCaseAndAllUserIdNot(normalizedEmail, allUser.getAllUserId())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_IN_USE);
        }

        User user = User.builder()
                .allUser(allUser)
                .name(allUser.getName())
                .cohort(allUser.getCohort())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .rank(User.UserRank.NEWBIE)
                .status(User.UserStatus.ACTIVE)
                .role(User.UserRole.USER)
                .build();

        if (normalizedEmail != null) {
            allUser.changeEmail(normalizedEmail);
        }

        return UserResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(Integer userId) {
        return UserResponse.from(findUser(userId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public UserResponse updateStatus(Integer userId, UserStatusUpdateRequest request) {
        User user = findUser(userId);
        user.changeStatus(request.status());
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public UserResponse updateMyProfile(Integer userId, UserProfileUpdateRequest request) {
        User user = findUser(userId);
        AllUser allUser = user.getAllUser();

        if (request.email() != null) {
            String normalizedEmail = normalizeEmail(request.email());
            if (userRepository.existsByEmailIgnoreCaseAndUserIdNot(normalizedEmail, user.getUserId())) {
                throw new CustomException(ErrorCode.EMAIL_ALREADY_IN_USE);
            }
            if (allUserRepository.existsByEmailIgnoreCaseAndAllUserIdNot(normalizedEmail, allUser.getAllUserId())) {
                throw new CustomException(ErrorCode.EMAIL_ALREADY_IN_USE);
            }
            user.changeEmail(normalizedEmail);
            allUser.changeEmail(normalizedEmail);
        }

        if (request.cohort() != null) {
            user.changeCohort(request.cohort());
            allUser.changeCohort(request.cohort());
        }

        if (request.rank() != null) {
            user.changeRank(request.rank());
        }

        if (request.password() != null) {
            String rawPassword = request.password().trim();
            if (!StringUtils.hasText(rawPassword)) {
                throw new CustomException(ErrorCode.VALIDATION_ERROR);
            }
            if (!StringUtils.hasText(request.currentPassword())
                    || !passwordEncoder.matches(request.currentPassword().trim(), user.getPassword())) {
                throw new CustomException(ErrorCode.AUTHENTICATION_FAILED);
            }
            user.changePassword(passwordEncoder.encode(rawPassword));
        }

        return UserResponse.from(user);
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private String normalizeEmail(String email) {
        if (!StringUtils.hasText(email)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR);
        }
        return email.trim().toLowerCase();
    }
}
