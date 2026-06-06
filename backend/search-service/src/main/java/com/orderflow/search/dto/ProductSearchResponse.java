package com.orderflow.search.dto;

import java.util.List;

public record ProductSearchResponse(
        List<ProductSearchHitResponse> items,
        long total,
        int page,
        int size,
        boolean hasNext,
        ProductSearchFacetsResponse facets) {
}
