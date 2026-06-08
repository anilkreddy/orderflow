package com.orderflow.customer.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerUpsertedEvent(
        UUID eventId,
        UUID customerId,
        String identityUserId,
        String username,
        String email,
        String firstName,
        String lastName,
        boolean enabled,
        boolean emailVerified,
        LocalDateTime updatedAt) {
}
