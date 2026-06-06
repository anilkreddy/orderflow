package com.orderflow.search.service;

import com.orderflow.search.dto.ProductSearchResponse;
import com.orderflow.search.dto.ReindexResponse;
import com.orderflow.search.dto.SearchSuggestionResponse;
import com.orderflow.search.dto.SearchTuningResponse;
import com.orderflow.search.messaging.ProductUpsertedEvent;
import java.math.BigDecimal;

public interface ProductSearchService {

    ProductSearchResponse searchProducts(String query,
                                         String categoryCode,
                                         Boolean active,
                                         Boolean inStock,
                                         Integer minStock,
                                         BigDecimal minPrice,
                                         BigDecimal maxPrice,
                                         String priceBand,
                                         Long excludeProductId,
                                         String sort,
                                         int page,
                                         int size);

    SearchSuggestionResponse getSuggestions(String query, int size);

    SearchTuningResponse getSearchTuning();

    ReindexResponse reindexProducts();

    void upsertIndexedProduct(ProductUpsertedEvent event);

    void deleteIndexedProduct(Long productId);
}
