package com.example.backend.service;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public User syncUser(Jwt jwt) {
        String keycloakId = jwt.getSubject();
        return userRepository.findByKeycloakId(keycloakId)
                .orElseGet(() -> createUser(jwt));
    }

    private User createUser(Jwt jwt) {
        User user = User.builder()
                .keycloakId(jwt.getSubject())
                .email(jwt.getClaimAsString("email"))
                .username(jwt.getClaimAsString("preferred_username"))
                .firstName(jwt.getClaimAsString("given_name"))
                .lastName(jwt.getClaimAsString("family_name"))
                .build();
        return userRepository.save(user);
    }
}
