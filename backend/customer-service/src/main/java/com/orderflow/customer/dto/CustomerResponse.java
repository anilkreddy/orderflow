package com.orderflow.customer.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerResponse(
        UUID id,
        String identityUserId,
        String username,
        String email,
        String firstName,
        String lastName,
        boolean enabled,
        boolean emailVerified,
        LocalDateTime registeredAt,
        LocalDateTime passwordChangedAt,
        LocalDateTime passwordExpiresAt,
        LocalDateTime updatedAt) {
}
