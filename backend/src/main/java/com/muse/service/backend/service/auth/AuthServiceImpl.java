package com.muse.service.backend.service.auth;

import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.AuthTokenResult;
import com.muse.service.backend.dto.auth.FindEmailResponse;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.auth.PasswordResetRequest;
import com.muse.service.backend.dto.auth.VerifyCodeRequest;
import com.muse.service.backend.dto.auth.VerificationTokenResponse;
import com.muse.service.backend.dto.auth.LoginRequest;
import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.AllUserRepository;
import com.muse.service.backend.repository.UserRepository;
import com.muse.service.backend.security.jwt.JwtTokenProvider;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.user.UserService;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String LOGIN_FAILED_COUNT_PREFIX = "auth:login:failed:";
    private static final String LOGIN_IP_FAILED_COUNT_PREFIX = "auth:login:failed:ip:";
    private static final String REFRESH_TOKEN_PREFIX = "auth:refresh:";
    private static final Duration LOGIN_FAILED_COUNT_TTL = Duration.ofMinutes(10);
    private static final int MAX_LOGIN_ATTEMPTS = 5;

    private final AllUserRepository allUserRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PhoneVerificationService phoneVerificationService;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate redisTemplate;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public AuthTokenResult login(LoginRequest request, String clientIp) {
        String normalizedEmail = normalizeEmail(request.email());
        String loginFailedCountKey = LOGIN_FAILED_COUNT_PREFIX + normalizedEmail;
        String loginIpFailedCountKey = LOGIN_IP_FAILED_COUNT_PREFIX + normalizeClientIp(clientIp);
        if (getLoginFailedCount(loginFailedCountKey) >= MAX_LOGIN_ATTEMPTS
                || getLoginFailedCount(loginIpFailedCountKey) >= MAX_LOGIN_ATTEMPTS) {
            throw new CustomException(ErrorCode.LOGIN_ATTEMPT_EXCEEDED);
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.password())
            );
            redisTemplate.delete(loginFailedCountKey);
            redisTemplate.delete(loginIpFailedCountKey);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            String accessToken = jwtTokenProvider.generateAccessToken(
                    userDetails.getUsername(),
                    userDetails.getRole().name()
            );
            String refreshToken = jwtTokenProvider.generateRefreshToken(
                    userDetails.getUsername(),
                    userDetails.getRole().name()
            );
            redisTemplate.opsForValue().set(
                    refreshTokenKey(userDetails.getUsername()),
                    refreshToken,
                    Duration.ofMillis(jwtTokenProvider.getRefreshTokenExpirationMs())
            );
            return new AuthTokenResult(
                    accessToken,
                    refreshToken,
                    "Bearer",
                    jwtTokenProvider.getAccessTokenExpirationMs(),
                    jwtTokenProvider.getRefreshTokenExpirationMs(),
                    userDetails.getUsername()
            );
        } catch (AuthenticationException exception) {
            int failedCount = incrementLoginFailedCount(loginFailedCountKey);
            int ipFailedCount = incrementLoginFailedCount(loginIpFailedCountKey);
            if (failedCount >= MAX_LOGIN_ATTEMPTS || ipFailedCount >= MAX_LOGIN_ATTEMPTS) {
                throw new CustomException(ErrorCode.LOGIN_ATTEMPT_EXCEEDED);
            }
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AuthTokenResult reissue(String refreshToken) {
        String normalizedRefreshToken = refreshToken == null ? "" : refreshToken.trim();
        if (normalizedRefreshToken.isBlank()) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        if (!jwtTokenProvider.validateToken(normalizedRefreshToken)
                || !jwtTokenProvider.isRefreshToken(normalizedRefreshToken)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        String email = normalizeEmail(jwtTokenProvider.getEmail(normalizedRefreshToken));
        String storedRefreshToken = redisTemplate.opsForValue().get(refreshTokenKey(email));
        if (storedRefreshToken == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        if (!storedRefreshToken.equals(normalizedRefreshToken)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        String role = jwtTokenProvider.getRole(normalizedRefreshToken);
        String newAccessToken = jwtTokenProvider.generateAccessToken(email, role);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(email, role);
        redisTemplate.opsForValue().set(
                refreshTokenKey(email),
                newRefreshToken,
                Duration.ofMillis(jwtTokenProvider.getRefreshTokenExpirationMs())
        );

        return new AuthTokenResult(
                newAccessToken,
                newRefreshToken,
                "Bearer",
                jwtTokenProvider.getAccessTokenExpirationMs(),
                jwtTokenProvider.getRefreshTokenExpirationMs(),
                email
        );
    }

    @Override
    public void logout(String refreshToken) {
        String normalizedRefreshToken = refreshToken == null ? "" : refreshToken.trim();
        if (normalizedRefreshToken.isBlank()) {
            return;
        }
        if (!jwtTokenProvider.validateToken(normalizedRefreshToken)
                || !jwtTokenProvider.isRefreshToken(normalizedRefreshToken)) {
            return;
        }

        String email = normalizeEmail(jwtTokenProvider.getEmail(normalizedRefreshToken));
        String storedRefreshToken = redisTemplate.opsForValue().get(refreshTokenKey(email));
        if (storedRefreshToken == null) {
            return;
        }
        if (!storedRefreshToken.equals(normalizedRefreshToken)) {
            return;
        }
        redisTemplate.delete(refreshTokenKey(email));
    }

    @Override
    @Transactional
    public void requestPhoneVerification(PhoneVerificationRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        validateNotLinkedAllUser(allUser);
        phoneVerificationService.issueCode(allUser.getName(), allUser.getCohort(), allUser.getPhone());
    }

    @Override
    @Transactional
    public VerificationTokenResponse verifyPhoneCode(VerifyCodeRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        validateNotLinkedAllUser(allUser);
        String token = phoneVerificationService.verifyCodeAndIssueToken(
                allUser.getName(),
                allUser.getCohort(),
                allUser.getPhone(),
                request.code()
        );
        return new VerificationTokenResponse(token);
    }

    @Override
    @Transactional
    public UserResponse signup(SignupRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new CustomException(ErrorCode.PASSWORD_CONFIRMATION_MISMATCH);
        }

        String verificationToken = request.verificationToken().trim();
        PhoneVerificationService.VerifiedIdentity verifiedIdentity =
                phoneVerificationService.getVerifiedIdentity(verificationToken);

        AllUser allUser = findRegisteredAllUser(
                verifiedIdentity.name(),
                verifiedIdentity.cohort(),
                verifiedIdentity.phone()
        );

        UserResponse createdUser = userService.create(new UserCreateRequest(
                allUser.getAllUserId(),
                request.email(),
                request.password(),
                request.nickname()
        ));
        phoneVerificationService.deleteVerifiedToken(verificationToken);
        return createdUser;
    }

    @Override
    @Transactional(readOnly = true)
    public void requestFindEmailVerification(PhoneVerificationRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        validateLinkedAllUser(allUser);
        phoneVerificationService.issueCode(allUser.getName(), allUser.getCohort(), allUser.getPhone());
    }

    @Override
    @Transactional(readOnly = true)
    public FindEmailResponse findEmail(VerifyCodeRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        User user = findLinkedActiveUser(allUser);
        String verificationToken = phoneVerificationService.verifyCodeAndIssueToken(
                allUser.getName(),
                allUser.getCohort(),
                allUser.getPhone(),
                request.code()
        );
        phoneVerificationService.deleteVerifiedToken(verificationToken);
        return new FindEmailResponse(user.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public void requestPasswordResetVerification(PhoneVerificationRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        validateLinkedAllUser(allUser);
        phoneVerificationService.issueCode(allUser.getName(), allUser.getCohort(), allUser.getPhone());
    }

    @Override
    @Transactional(readOnly = true)
    public VerificationTokenResponse verifyPasswordResetCode(VerifyCodeRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        findLinkedActiveUser(allUser);
        String token = phoneVerificationService.verifyCodeAndIssueToken(
                allUser.getName(),
                allUser.getCohort(),
                allUser.getPhone(),
                request.code()
        );
        return new VerificationTokenResponse(token);
    }

    @Override
    @Transactional
    public void resetPassword(PasswordResetRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new CustomException(ErrorCode.PASSWORD_CONFIRMATION_MISMATCH);
        }

        String verificationToken = request.verificationToken().trim();
        PhoneVerificationService.VerifiedIdentity verifiedIdentity =
                phoneVerificationService.getVerifiedIdentity(verificationToken);

        AllUser allUser = findRegisteredAllUser(
                verifiedIdentity.name(),
                verifiedIdentity.cohort(),
                verifiedIdentity.phone()
        );
        User user = findLinkedActiveUser(allUser);
        user.changePassword(passwordEncoder.encode(request.newPassword().trim()));
        phoneVerificationService.deleteVerifiedToken(verificationToken);
    }

    private AllUser findRegisteredAllUser(String name, Integer cohort, String phone) {
        return allUserRepository.findRegisteredByNameAndCohortAndPhone(
                        name,
                        cohort,
                        normalizePhone(phone),
                        AllUser.AllUserStatus.ACTIVE
                )
                .orElseThrow(() -> new CustomException(ErrorCode.UNREGISTERED_USER));
    }

    private String normalizePhone(String phone) {
        return phone.replaceAll("[^0-9]", "");
    }

    /**
     * 회원가입을 위해 인증 번호를 발송전 회원가입이 되어 있는지 확인
     * 회원 가입이 되어 있으면 에러를 던짐
     *
     * @param allUser
     */
    private void validateNotLinkedAllUser(AllUser allUser) {
        if (userRepository.existsByAllUser_AllUserId(allUser.getAllUserId())) {
            throw new CustomException(ErrorCode.ALL_USER_ALREADY_LINKED);
        }
    }

    private void validateLinkedAllUser(AllUser allUser) {
        findLinkedActiveUser(allUser);
    }

    private User findLinkedActiveUser(AllUser allUser) {
        User user = userRepository.findByAllUser_AllUserId(allUser.getAllUserId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String normalizeClientIp(String clientIp) {
        return clientIp == null || clientIp.isBlank() ? "unknown" : clientIp.trim();
    }

    private int getLoginFailedCount(String key) {
        String rawCount = redisTemplate.opsForValue().get(key);
        if (rawCount == null || rawCount.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(rawCount);
        } catch (NumberFormatException exception) {
            return 0;
        }
    }

    private int incrementLoginFailedCount(String key) {
        Long failedCount = redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, LOGIN_FAILED_COUNT_TTL);
        return failedCount == null ? 0 : failedCount.intValue();
    }

    private String refreshTokenKey(String email) {
        return REFRESH_TOKEN_PREFIX + email;
    }
}
