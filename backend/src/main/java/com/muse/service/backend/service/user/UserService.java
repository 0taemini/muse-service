package com.muse.service.backend.service.user;

import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserProfileUpdateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserRoleUpdateRequest;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;

import java.util.List;

public interface UserService {

    UserResponse create(UserCreateRequest request);

    UserResponse getById(Integer userId);

    List<UserResponse> getAll();

    UserResponse updateStatus(Integer userId, UserStatusUpdateRequest request);

    UserResponse updateRole(Integer userId, UserRoleUpdateRequest request);

    void delete(Integer userId);

    UserResponse updateMyProfile(Integer userId, UserProfileUpdateRequest request);
}
