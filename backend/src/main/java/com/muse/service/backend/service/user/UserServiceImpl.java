package com.muse.service.backend.service.user;

import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserProfileUpdateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserRoleUpdateRequest;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.AllUserRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.UserRepository;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AllUserRepository allUserRepository;
    private final PerformanceSongSessionRepository performanceSongSessionRepository;
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

        User savedUser = userRepository.save(user);
        log.info("회원 생성 완료: userId={}, allUserId={}, role={}, status={}",
                savedUser.getUserId(), allUser.getAllUserId(), savedUser.getRole(), savedUser.getStatus());
        return UserResponse.from(savedUser);
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
        if (request.status() == User.UserStatus.DELETED) {
            clearSessionAssignments(userId);
        }
        log.info("회원 상태 변경 완료: targetUserId={}, status={}", userId, request.status());
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public UserResponse updateRole(Integer userId, UserRoleUpdateRequest request) {
        User user = findUser(userId);
        user.changeRole(request.role());
        log.info("회원 권한 변경 완료: targetUserId={}, role={}", userId, request.role());
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public void delete(Integer userId) {
        User user = findUser(userId);
        user.changeStatus(User.UserStatus.DELETED);
        clearSessionAssignments(userId);
        log.info("회원 논리 삭제 완료: targetUserId={}", userId);
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

        if (request.nickname() != null) {
            String nickname = request.nickname().trim();
            if (!StringUtils.hasText(nickname)) {
                throw new CustomException(ErrorCode.VALIDATION_ERROR);
            }
            if (!nickname.equals(user.getNickname()) && userRepository.existsByNickname(nickname)) {
                throw new CustomException(ErrorCode.NICKNAME_ALREADY_IN_USE);
            }
            user.changeNickname(nickname);
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

        log.info("내 프로필 수정 완료: userId={}, emailChanged={}, cohortChanged={}, nicknameChanged={}, rankChanged={}, passwordChanged={}",
                userId,
                request.email() != null,
                request.cohort() != null,
                request.nickname() != null,
                request.rank() != null,
                request.password() != null);
        return UserResponse.from(user);
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void clearSessionAssignments(Integer userId) {
        performanceSongSessionRepository.findAllByAssignedUser_UserId(userId)
                .forEach(session -> session.assignUser(null));
    }

    private String normalizeEmail(String email) {
        if (!StringUtils.hasText(email)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR);
        }
        return email.trim().toLowerCase();
    }
}
