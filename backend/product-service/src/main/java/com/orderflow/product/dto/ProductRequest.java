package com.orderflow.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "Product name is required")
        String name,
        @NotBlank(message = "Product category code is required")
        @Pattern(regexp = "^[a-z0-9-]+$", message = "Category code must use lowercase letters, numbers, or hyphens")
        String categoryCode,
        @NotBlank(message = "Product description is required")
        String description,
        @NotNull(message = "Product price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Product price must be greater than zero")
        BigDecimal price,
        @NotNull(message = "Stock quantity is required")
        @PositiveOrZero(message = "Stock quantity cannot be negative")
        Integer stockQuantity,
        @NotNull(message = "Active flag is required")
        Boolean active) {
}
