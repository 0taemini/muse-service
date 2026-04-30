package com.muse.service.backend.service.user;

import com.muse.service.backend.dto.user.AllUserCreateRequest;
import com.muse.service.backend.dto.user.AllUserResponse;
import com.muse.service.backend.dto.user.AllUserStatusUpdateRequest;
import com.muse.service.backend.dto.user.AllUserUpdateRequest;
import java.util.List;

public interface AllUserAdminService {

    List<AllUserResponse> getAll();

    AllUserResponse create(AllUserCreateRequest request);

    AllUserResponse update(Integer allUserId, AllUserUpdateRequest request);

    AllUserResponse updateStatus(Integer allUserId, AllUserStatusUpdateRequest request);

    void delete(Integer allUserId);
}
