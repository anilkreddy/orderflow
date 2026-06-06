package com.orderflow.product.dto;

import java.time.LocalDateTime;

public record CategoryResponse(
        String code,
        String name,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
