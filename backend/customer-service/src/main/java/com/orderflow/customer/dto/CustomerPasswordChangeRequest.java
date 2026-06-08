package com.orderflow.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerPasswordChangeRequest(
        @NotBlank @Size(min = 8, max = 120) String newPassword) {
}
