package com.orderflow.search.controller;

import com.orderflow.search.dto.ProductSearchResponse;
import com.orderflow.search.dto.ReindexResponse;
import com.orderflow.search.dto.SearchSuggestionResponse;
import com.orderflow.search.dto.SearchSynonymRequest;
import com.orderflow.search.dto.SearchSynonymResponse;
import com.orderflow.search.dto.SearchTuningResponse;
import com.orderflow.search.service.ProductSearchService;
import com.orderflow.search.service.SearchSynonymService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Product search, suggestions, and search index maintenance")
public class SearchController {

    private final ProductSearchService productSearchService;
    private final SearchSynonymService searchSynonymService;

    @GetMapping("/products")
    @Operation(summary = "Search products from the OpenSearch catalog")
    public ProductSearchResponse searchProducts(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) String categoryCode,
                                                @RequestParam(required = false) Boolean active,
                                                @RequestParam(required = false) Boolean inStock,
                                                @RequestParam(required = false) Integer minStock,
                                                @RequestParam(required = false) BigDecimal minPrice,
                                                @RequestParam(required = false) BigDecimal maxPrice,
                                                @RequestParam(required = false) String priceBand,
                                                @RequestParam(required = false) Long excludeProductId,
                                                @RequestParam(defaultValue = "featured") String sort,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "24") int size) {
        return productSearchService.searchProducts(q, categoryCode, active, inStock, minStock, minPrice, maxPrice, priceBand, excludeProductId, sort, page, size);
    }

    @GetMapping("/suggestions")
    @Operation(summary = "Get product search suggestions")
    public SearchSuggestionResponse getSuggestions(@RequestParam String q,
                                                   @RequestParam(defaultValue = "8") int size) {
        return productSearchService.getSuggestions(q, size);
    }

    @GetMapping("/tuning")
    @Operation(summary = "Inspect current search tuning including synonyms and boost weights")
    public SearchTuningResponse getSearchTuning() {
        return productSearchService.getSearchTuning();
    }

    @GetMapping("/synonyms")
    @Operation(summary = "List editable synonym groups used by search relevance")
    public List<SearchSynonymResponse> listSynonyms() {
        return searchSynonymService.listSynonyms();
    }

    @PostMapping("/synonyms")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a synonym group used by live search expansion")
    public SearchSynonymResponse createSynonym(@RequestBody SearchSynonymRequest request) {
        return searchSynonymService.createSynonym(request);
    }

    @PutMapping("/synonyms/{synonymId}")
    @Operation(summary = "Update a synonym group used by live search expansion")
    public SearchSynonymResponse updateSynonym(@PathVariable String synonymId,
                                               @RequestBody SearchSynonymRequest request) {
        return searchSynonymService.updateSynonym(synonymId, request);
    }

    @DeleteMapping("/synonyms/{synonymId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a synonym group used by live search expansion")
    public void deleteSynonym(@PathVariable String synonymId) {
        searchSynonymService.deleteSynonym(synonymId);
    }

    @PostMapping("/reindex/products")
    @Operation(summary = "Rebuild the product search index from product-service")
    public ReindexResponse reindexProducts() {
        return productSearchService.reindexProducts();
    }
}
