package com.orderflow.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record OrderRequest(
        @NotBlank(message = "Customer name is required")
        String customerName,
        @NotBlank(message = "Customer email is required")
        @Email(message = "Customer email must be valid")
        String customerEmail,
        @NotEmpty(message = "At least one order item is required")
        List<@Valid OrderItemRequest> items) {
}
