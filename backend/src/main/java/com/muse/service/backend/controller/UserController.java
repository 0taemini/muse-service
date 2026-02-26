package com.muse.service.backend.controller;

import com.muse.service.backend.dto.user.UserCreateRequest;
import com.muse.service.backend.dto.user.UserResponse;
import com.muse.service.backend.dto.user.UserStatusUpdateRequest;
import com.muse.service.backend.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request) {
        return userService.create(request);
    }

    @GetMapping("/{userId}")
    public UserResponse getById(@PathVariable Integer userId) {
        return userService.getById(userId);
    }

    @GetMapping
    public List<UserResponse> getAll() {
        return userService.getAll();
    }

    @PatchMapping("/{userId}/status")
    public UserResponse updateStatus(
            @PathVariable Integer userId,
            @Valid @RequestBody UserStatusUpdateRequest request
    ) {
        return userService.updateStatus(userId, request);
    }
}
