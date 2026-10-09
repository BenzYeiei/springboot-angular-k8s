package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        User user = userService.syncUser(jwt);
        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "keycloakId", user.getKeycloakId(),
            "email", user.getEmail() != null ? user.getEmail() : "",
            "username", user.getUsername(),
            "firstName", user.getFirstName() != null ? user.getFirstName() : "",
            "lastName", user.getLastName() != null ? user.getLastName() : ""
        ));
    }
}
