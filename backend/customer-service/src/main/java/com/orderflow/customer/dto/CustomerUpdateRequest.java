package com.orderflow.customer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerUpdateRequest(
        @NotBlank @Size(max = 120) String username,
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        boolean enabled,
        boolean emailVerified) {
}
