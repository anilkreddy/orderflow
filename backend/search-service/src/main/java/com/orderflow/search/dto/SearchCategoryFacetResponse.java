package com.orderflow.search.dto;

public record SearchCategoryFacetResponse(
        String categoryCode,
        String categoryName,
        long count,
        boolean selected) {
}
