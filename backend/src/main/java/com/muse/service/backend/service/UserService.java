package com.muse.service.backend.service;

import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import java.util.List;

public interface UserService {

    UserResponse create(UserCreateRequest request);

    UserResponse getById(Integer userId);

    List<UserResponse> getAll();

    UserResponse updateStatus(Integer userId, UserStatusUpdateRequest request);
}
