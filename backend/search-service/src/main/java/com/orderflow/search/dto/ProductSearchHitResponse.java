package com.orderflow.search.dto;

import java.math.BigDecimal;

public record ProductSearchHitResponse(
        Long id,
        String name,
        String categoryCode,
        String categoryName,
        String description,
        BigDecimal price,
        Integer stockQuantity,
        Boolean active,
        Boolean inStock,
        Double popularityScore,
        Double score,
        String createdAt,
        String updatedAt) {
}
