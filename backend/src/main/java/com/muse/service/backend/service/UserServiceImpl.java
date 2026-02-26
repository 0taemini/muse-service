package com.muse.service.backend.service;

import com.muse.service.backend.dto.user.UserCreateRequest;
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

        if (request.email() != null && !request.email().isBlank() && userRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_IN_USE);
        }

        AllUser allUser = allUserRepository.findById(request.allUserId())
                .orElseThrow(() -> new CustomException(ErrorCode.ALL_USER_NOT_FOUND));

        User user = User.builder()
                .allUser(allUser)
                .name(allUser.getName())
                .cohort(allUser.getCohort())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .rank(User.UserRank.NEWBIE)
                .status(User.UserStatus.ACTIVE)
                .role(User.UserRole.USER)
                .build();

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

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
