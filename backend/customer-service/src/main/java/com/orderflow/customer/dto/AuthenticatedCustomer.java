package com.orderflow.customer.dto;

public record AuthenticatedCustomer(
        String identityUserId,
        String username,
        String email,
        String firstName,
        String lastName,
        boolean emailVerified) {
}
