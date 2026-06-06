package com.orderflow.search.dto;

import java.math.BigDecimal;

public record SearchPriceBandFacetResponse(
        String code,
        String label,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        long count,
        boolean selected) {
}
