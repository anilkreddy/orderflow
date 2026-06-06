package com.orderflow.search.dto;

import java.util.List;

public record ProductSearchFacetsResponse(
        List<SearchCategoryFacetResponse> categories,
        List<SearchPriceBandFacetResponse> priceBands,
        SearchAvailabilityFacetResponse availability) {
}
