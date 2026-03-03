package com.muse.service.backend.service.auth;

import com.muse.service.backend.dto.auth.PhoneVerificationRequest;
import com.muse.service.backend.dto.auth.SignupRequest;
import com.muse.service.backend.dto.auth.VerifyCodeRequest;
import com.muse.service.backend.dto.auth.VerificationTokenResponse;
import com.muse.service.backend.dto.auth.LoginRequest;
import com.muse.service.backend.dto.auth.LoginResponse;
import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.AllUserRepository;
import com.muse.service.backend.security.jwt.JwtTokenProvider;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AllUserRepository allUserRepository;
    private final UserService userService;
    private final PhoneVerificationService phoneVerificationService;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().trim(), request.password())
            );
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            String accessToken = jwtTokenProvider.generateAccessToken(
                    userDetails.getUsername(),
                    userDetails.getRole().name()
            );
            return new LoginResponse(accessToken, "Bearer", jwtTokenProvider.getAccessTokenExpirationMs());
        } catch (AuthenticationException exception) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED);
        }
    }
    
    @Override
    @Transactional
    public void requestPhoneVerification(PhoneVerificationRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
        phoneVerificationService.issueCode(allUser.getName(), allUser.getCohort(), allUser.getPhone());
    }

    @Override
    @Transactional
    public VerificationTokenResponse verifyPhoneCode(VerifyCodeRequest request) {
        AllUser allUser = findRegisteredAllUser(request.name(), request.cohort(), request.phone());
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
}
