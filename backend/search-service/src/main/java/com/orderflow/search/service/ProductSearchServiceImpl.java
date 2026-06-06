package com.orderflow.search.service;

import com.orderflow.search.client.ProductCatalogClient;
import com.orderflow.search.config.SearchTuningProperties;
import com.orderflow.search.config.SearchTuningProperties.PriceBand;
import com.orderflow.search.dto.ProductSearchFacetsResponse;
import com.orderflow.search.dto.ProductSearchHitResponse;
import com.orderflow.search.dto.ProductSearchResponse;
import com.orderflow.search.dto.ReindexResponse;
import com.orderflow.search.dto.SearchAvailabilityFacetResponse;
import com.orderflow.search.dto.SearchBoostTuningResponse;
import com.orderflow.search.dto.SearchCategoryFacetResponse;
import com.orderflow.search.dto.SearchPriceBandFacetResponse;
import com.orderflow.search.dto.SearchSuggestionResponse;
import com.orderflow.search.dto.SearchTuningResponse;
import com.orderflow.search.exception.BusinessException;
import com.orderflow.search.messaging.ProductUpsertedEvent;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
public class ProductSearchServiceImpl implements ProductSearchService {

    private static final int MAX_PAGE_SIZE = 60;

    private final RestClient openSearchRestClient;
    private final ObjectMapper objectMapper;
    private final ProductCatalogClient productCatalogClient;
    private final SearchTuningProperties tuningProperties;
    private final SearchSynonymService searchSynonymService;

    public ProductSearchServiceImpl(@Qualifier("openSearchRestClient") RestClient openSearchRestClient,
                                    ObjectMapper objectMapper,
                                    ProductCatalogClient productCatalogClient,
                                    SearchTuningProperties tuningProperties,
                                    SearchSynonymService searchSynonymService) {
        this.openSearchRestClient = openSearchRestClient;
        this.objectMapper = objectMapper;
        this.productCatalogClient = productCatalogClient;
        this.tuningProperties = tuningProperties;
        this.searchSynonymService = searchSynonymService;
    }

    @Value("${application.search.index.products-name}")
    private String productsIndexName;

    @Value("${application.search.index.products-read-alias}")
    private String productsReadAlias;

    @Value("${application.search.index.products-write-alias}")
    private String productsWriteAlias;

    private volatile boolean indexReady;

    @Override
    public ProductSearchResponse searchProducts(String query,
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
                                                int size) {
        SearchRequestCriteria criteria = new SearchRequestCriteria(
                query,
                normalize(categoryCode),
                active,
                inStock,
                minStock,
                minPrice,
                maxPrice,
                normalize(priceBand),
                excludeProductId,
                sort,
                page,
                size,
                resolvePriceBand(priceBand),
                searchSynonymService.resolveExpandedTerms(query));

        validateSearchRequest(criteria);
        ensureIndexReady();

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "from", page * size,
                    "size", size,
                    "track_total_hits", true,
                    "query", buildScoredQuery(criteria, true, true, true, true),
                    "sort", buildSort(sort),
                    "aggs", buildAggregations(criteria)));

            JsonNode response = openSearchRestClient.post()
                    .uri("/{alias}/_search", productsReadAlias)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            return toSearchResponse(response, criteria);
        } catch (IOException | RestClientException exception) {
            throw new BusinessException("Unable to execute product search", exception);
        }
    }

    @Override
    public SearchSuggestionResponse getSuggestions(String query, int size) {
        if (query == null || query.isBlank()) {
            return new SearchSuggestionResponse(List.of());
        }

        int boundedSize = Math.min(Math.max(size, 1), 12);
        ensureIndexReady();

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "size", boundedSize,
                    "_source", List.of("name"),
                    "query", buildSuggestionQuery(query.trim())));

            JsonNode response = openSearchRestClient.post()
                    .uri("/{alias}/_search", productsReadAlias)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return new SearchSuggestionResponse(List.of());
            }

            List<String> suggestions = new ArrayList<>();
            for (JsonNode hit : response.path("hits").path("hits")) {
                String name = hit.path("_source").path("name").asText(null);
                if (name == null || name.isBlank() || suggestions.contains(name)) {
                    continue;
                }
                suggestions.add(name);
                if (suggestions.size() >= boundedSize) {
                    break;
                }
            }

            return new SearchSuggestionResponse(suggestions);
        } catch (RestClientException exception) {
            throw new BusinessException("Unable to load product suggestions", exception);
        }
    }

    @Override
    public SearchTuningResponse getSearchTuning() {
        return new SearchTuningResponse(
                searchSynonymService.listSynonymExpressions(),
                new SearchBoostTuningResponse(
                        tuningProperties.getBoosts().getExactName(),
                        tuningProperties.getBoosts().getPhrasePrefix(),
                        tuningProperties.getBoosts().getCategory(),
                        tuningProperties.getBoosts().getKeywords(),
                        tuningProperties.getBoosts().getDescription()),
                tuningProperties.getWeights().getPopularityFactor(),
                tuningProperties.getWeights().getInStock(),
                tuningProperties.getWeights().getActive());
    }

    @Override
    public ReindexResponse reindexProducts() {
        try {
            recreateIndex();
            List<IndexedProductDocument> documents = productCatalogClient.getProducts().stream()
                    .map(IndexedProductDocument::fromCatalogProduct)
                    .toList();

            for (IndexedProductDocument document : documents) {
                indexDocument(document);
            }
            refreshIndex();

            log.info("Reindexed OpenSearch catalog indexedCount={} index={} readAlias={}", documents.size(), productsIndexName, productsReadAlias);
            return new ReindexResponse("completed", documents.size(), LocalDateTime.now().toString());
        } catch (IOException | RestClientException exception) {
            throw new BusinessException("Unable to rebuild the product search index", exception);
        }
    }

    @Override
    public void upsertIndexedProduct(ProductUpsertedEvent event) {
        ensureIndexReady();
        try {
            indexDocument(IndexedProductDocument.fromEvent(event));
            refreshIndex();
        } catch (IOException | RestClientException exception) {
            throw new BusinessException("Unable to upsert product into the search index", exception);
        }
    }

    @Override
    public void deleteIndexedProduct(Long productId) {
        ensureIndexReady();
        try {
            openSearchRestClient.delete()
                    .uri("/{alias}/_doc/{id}", productsWriteAlias, productId)
                    .retrieve()
                    .toBodilessEntity();
            refreshIndex();
            log.info("Deleted search document productId={} indexAlias={}", productId, productsWriteAlias);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                log.info("Search document already absent productId={} indexAlias={}", productId, productsWriteAlias);
                return;
            }
            throw new BusinessException("Unable to delete product from the search index", exception);
        }
    }

    private ProductSearchResponse toSearchResponse(JsonNode response, SearchRequestCriteria criteria) throws IOException {
        if (response == null) {
            return new ProductSearchResponse(List.of(), 0, criteria.page(), criteria.size(), false, emptyFacets(criteria));
        }

        List<ProductSearchHitResponse> items = new ArrayList<>();
        for (JsonNode hit : response.path("hits").path("hits")) {
            JsonNode source = hit.path("_source");
            if (source.isMissingNode()) {
                continue;
            }
            IndexedProductDocument document = objectMapper.treeToValue(source, IndexedProductDocument.class);
            items.add(document.toResponse(hit.path("_score").asDouble(0.0)));
        }

        long total = response.path("hits").path("total").path("value").asLong(items.size());
        return new ProductSearchResponse(items, total, criteria.page(), criteria.size(), (long) (criteria.page() + 1) * criteria.size() < total, toFacets(response, criteria));
    }

    private ProductSearchFacetsResponse toFacets(JsonNode response, SearchRequestCriteria criteria) {
        JsonNode aggregations = response.path("aggregations");
        if (aggregations.isMissingNode()) {
            return emptyFacets(criteria);
        }

        List<SearchCategoryFacetResponse> categories = new ArrayList<>();
        for (JsonNode bucket : aggregations.path("categories").path("by_category").path("buckets")) {
            String categoryCode = bucket.path("key").asText(null);
            if (categoryCode == null || categoryCode.isBlank()) {
                continue;
            }
            String categoryName = bucket.path("category_name").path("hits").path("hits").path(0).path("_source").path("categoryName").asText(categoryCode);
            categories.add(new SearchCategoryFacetResponse(
                    categoryCode,
                    categoryName,
                    bucket.path("doc_count").asLong(0),
                    Objects.equals(categoryCode, criteria.categoryCode())));
        }

        List<SearchPriceBandFacetResponse> priceBands = new ArrayList<>();
        for (PriceBand configuredBand : tuningProperties.getPriceBands()) {
            JsonNode bucket = aggregations.path("priceBands").path(configuredBand.getCode());
            priceBands.add(new SearchPriceBandFacetResponse(
                    configuredBand.getCode(),
                    configuredBand.getLabel(),
                    configuredBand.getMinPrice(),
                    configuredBand.getMaxPrice(),
                    bucket.path("doc_count").asLong(0),
                    Objects.equals(configuredBand.getCode(), criteria.priceBandCode())));
        }

        JsonNode availability = aggregations.path("availability");
        SearchAvailabilityFacetResponse availabilityFacet = new SearchAvailabilityFacetResponse(
                availability.path("in_stock").path("doc_count").asLong(0),
                availability.path("out_of_stock").path("doc_count").asLong(0),
                availability.path("active").path("doc_count").asLong(0),
                availability.path("inactive").path("doc_count").asLong(0));

        return new ProductSearchFacetsResponse(categories, priceBands, availabilityFacet);
    }

    private ProductSearchFacetsResponse emptyFacets(SearchRequestCriteria criteria) {
        List<SearchPriceBandFacetResponse> priceBands = tuningProperties.getPriceBands().stream()
                .map(band -> new SearchPriceBandFacetResponse(
                        band.getCode(),
                        band.getLabel(),
                        band.getMinPrice(),
                        band.getMaxPrice(),
                        0,
                        Objects.equals(band.getCode(), criteria.priceBandCode())))
                .toList();
        return new ProductSearchFacetsResponse(
                List.of(),
                priceBands,
                new SearchAvailabilityFacetResponse(0, 0, 0, 0));
    }

    private void validateSearchRequest(SearchRequestCriteria criteria) {
        if (criteria.page() < 0) {
            throw new BusinessException("Page cannot be negative");
        }
        if (criteria.size() < 1 || criteria.size() > MAX_PAGE_SIZE) {
            throw new BusinessException("Size must be between 1 and " + MAX_PAGE_SIZE);
        }
        if (criteria.minStock() != null && criteria.minStock() < 0) {
            throw new BusinessException("Minimum stock cannot be negative");
        }
        if (criteria.minPrice() != null && criteria.minPrice().signum() < 0) {
            throw new BusinessException("Minimum price cannot be negative");
        }
        if (criteria.maxPrice() != null && criteria.maxPrice().signum() < 0) {
            throw new BusinessException("Maximum price cannot be negative");
        }
        if (criteria.minPrice() != null && criteria.maxPrice() != null && criteria.minPrice().compareTo(criteria.maxPrice()) > 0) {
            throw new BusinessException("Minimum price cannot be greater than maximum price");
        }
        if (criteria.priceBandCode() != null && criteria.resolvedPriceBand() == null) {
            throw new BusinessException("Unsupported price band: " + criteria.priceBandCode());
        }
    }

    private Map<String, Object> buildAggregations(SearchRequestCriteria criteria) {
        Map<String, Object> priceBandAggregations = new LinkedHashMap<>();
        for (PriceBand priceBand : tuningProperties.getPriceBands()) {
            priceBandAggregations.put(priceBand.getCode(), Map.of(
                    "filter", Map.of("range", Map.of("price", buildRangeDefinition(priceBand)))));
        }

        Map<String, Object> categoryAggregation = new LinkedHashMap<>();
        categoryAggregation.put("filter", buildBaseQuery(criteria, false, true, true, true));
        categoryAggregation.put("aggs", Map.of(
                "by_category", Map.of(
                        "terms", Map.of("field", "categoryCode", "size", 20, "order", Map.of("_count", "desc")),
                        "aggs", Map.of(
                                "category_name", Map.of(
                                        "top_hits", Map.of("_source", List.of("categoryName"), "size", 1))))));

        Map<String, Object> priceBandAggregation = new LinkedHashMap<>();
        priceBandAggregation.put("filter", buildBaseQuery(criteria, true, true, true, false));
        priceBandAggregation.put("aggs", priceBandAggregations);

        Map<String, Object> availabilityAggregation = new LinkedHashMap<>();
        availabilityAggregation.put("filter", buildBaseQuery(criteria, true, false, false, true));
        availabilityAggregation.put("aggs", Map.of(
                "in_stock", Map.of("filter", Map.of("term", Map.of("inStock", true))),
                "out_of_stock", Map.of("filter", Map.of("term", Map.of("inStock", false))),
                "active", Map.of("filter", Map.of("term", Map.of("active", true))),
                "inactive", Map.of("filter", Map.of("term", Map.of("active", false)))));

        Map<String, Object> aggregations = new LinkedHashMap<>();
        aggregations.put("categories", categoryAggregation);
        aggregations.put("priceBands", priceBandAggregation);
        aggregations.put("availability", availabilityAggregation);
        return aggregations;
    }

    private Map<String, Object> buildScoredQuery(SearchRequestCriteria criteria,
                                                 boolean includeCategory,
                                                 boolean includeInStock,
                                                 boolean includeActive,
                                                 boolean includePrice) {
        return Map.of(
                "function_score", Map.of(
                        "query", buildBaseQuery(criteria, includeCategory, includeInStock, includeActive, includePrice),
                        "boost_mode", "sum",
                        "score_mode", "sum",
                        "functions", List.of(
                                Map.of(
                                        "field_value_factor", Map.of(
                                                "field", "popularityScore",
                                                "factor", tuningProperties.getWeights().getPopularityFactor(),
                                                "missing", 0)),
                                Map.of(
                                        "filter", Map.of("term", Map.of("inStock", true)),
                                        "weight", tuningProperties.getWeights().getInStock()),
                                Map.of(
                                        "filter", Map.of("term", Map.of("active", true)),
                                        "weight", tuningProperties.getWeights().getActive()))));
    }

    private Map<String, Object> buildBaseQuery(SearchRequestCriteria criteria,
                                               boolean includeCategory,
                                               boolean includeInStock,
                                               boolean includeActive,
                                               boolean includePrice) {
        List<Object> must = new ArrayList<>();

        if (criteria.query() == null || criteria.query().isBlank()) {
            must.add(Map.of("match_all", Map.of()));
        } else {
            String trimmedQuery = criteria.query().trim();
            List<Object> queryShould = new ArrayList<>();
            Map<String, Object> baseTextQuery = new LinkedHashMap<>();
            baseTextQuery.put("query", trimmedQuery);
            baseTextQuery.put("fields", List.of(
                    "name^5",
                    "categoryName^2.2",
                    "description^" + tuningProperties.getBoosts().getDescription(),
                    "searchKeywords^" + tuningProperties.getBoosts().getKeywords()));
            baseTextQuery.put("type", "best_fields");
            baseTextQuery.put("fuzziness", "AUTO");
            baseTextQuery.put("operator", "and");
            queryShould.add(Map.of("multi_match", baseTextQuery));

            queryShould.add(Map.of("match_phrase", Map.of(
                    "name", Map.of(
                            "query", trimmedQuery,
                            "boost", tuningProperties.getBoosts().getExactName()))));
            queryShould.add(Map.of("match_phrase_prefix", Map.of(
                    "nameSuggest", Map.of(
                            "query", trimmedQuery,
                            "boost", tuningProperties.getBoosts().getPhrasePrefix()))));
            queryShould.add(Map.of("match", Map.of(
                    "categoryName", Map.of(
                            "query", trimmedQuery,
                            "boost", tuningProperties.getBoosts().getCategory()))));
            queryShould.add(Map.of("match", Map.of(
                    "searchKeywords", Map.of(
                            "query", trimmedQuery,
                            "boost", tuningProperties.getBoosts().getKeywords()))));
            for (String expandedTerm : criteria.expandedTerms()) {
                queryShould.add(Map.of("multi_match", Map.of(
                        "query", expandedTerm,
                        "fields", List.of(
                                "name^4.5",
                                "categoryName^2.0",
                                "description^" + tuningProperties.getBoosts().getDescription(),
                                "searchKeywords^" + tuningProperties.getBoosts().getKeywords()),
                        "type", "best_fields",
                        "boost", tuningProperties.getBoosts().getKeywords())));
            }
            must.add(Map.of("bool", Map.of(
                    "should", queryShould,
                    "minimum_should_match", 1)));
        }

        List<Object> filter = new ArrayList<>();

        if (includeCategory && criteria.categoryCode() != null) {
            filter.add(Map.of("term", Map.of("categoryCode", criteria.categoryCode())));
        }
        if (includeActive && criteria.active() != null) {
            filter.add(Map.of("term", Map.of("active", criteria.active())));
        }
        if (includeInStock && Boolean.TRUE.equals(criteria.inStock())) {
            filter.add(Map.of("term", Map.of("inStock", true)));
        }
        if (criteria.minStock() != null) {
            filter.add(Map.of("range", Map.of("stockQuantity", Map.of("gte", criteria.minStock()))));
        }
        if (includePrice) {
            appendPriceFilter(filter, criteria);
        }

        List<Object> mustNot = new ArrayList<>();
        if (criteria.excludeProductId() != null) {
            mustNot.add(Map.of("term", Map.of("id", criteria.excludeProductId())));
        }

        Map<String, Object> boolQuery = new LinkedHashMap<>();
        boolQuery.put("must", must);
        if (!filter.isEmpty()) {
            boolQuery.put("filter", filter);
        }
        if (!mustNot.isEmpty()) {
            boolQuery.put("must_not", mustNot);
        }

        return Map.of("bool", boolQuery);
    }

    private void appendPriceFilter(List<Object> filter, SearchRequestCriteria criteria) {
        Map<String, Object> priceRange = new LinkedHashMap<>();
        PriceBand priceBand = criteria.resolvedPriceBand();
        if (priceBand != null) {
            if (priceBand.getMinPrice() != null) {
                priceRange.put("gte", priceBand.getMinPrice());
            }
            if (priceBand.getMaxPrice() != null) {
                priceRange.put(priceBand.isUpperExclusive() ? "lt" : "lte", priceBand.getMaxPrice());
            }
        }
        if (criteria.minPrice() != null) {
            priceRange.put("gte", criteria.minPrice());
        }
        if (criteria.maxPrice() != null) {
            priceRange.put("lte", criteria.maxPrice());
        }
        if (!priceRange.isEmpty()) {
            filter.add(Map.of("range", Map.of("price", priceRange)));
        }
    }

    private Map<String, Object> buildRangeDefinition(PriceBand priceBand) {
        Map<String, Object> range = new LinkedHashMap<>();
        if (priceBand.getMinPrice() != null) {
            range.put("gte", priceBand.getMinPrice());
        }
        if (priceBand.getMaxPrice() != null) {
            range.put(priceBand.isUpperExclusive() ? "lt" : "lte", priceBand.getMaxPrice());
        }
        return range;
    }

    private Map<String, Object> buildSuggestionQuery(String query) {
        return Map.of(
                "bool", Map.of(
                        "must", List.of(Map.of(
                                "multi_match", Map.of(
                                        "query", query,
                                        "type", "bool_prefix",
                                        "fields", List.of("nameSuggest", "nameSuggest._2gram", "nameSuggest._3gram")))),
                        "filter", List.of(Map.of("term", Map.of("active", true)))));
    }

    private List<Object> buildSort(String sort) {
        String normalizedSort = normalize(sort);
        if (normalizedSort == null || normalizedSort.equals("featured")) {
            return List.of(
                    Map.of("_score", Map.of("order", "desc")),
                    Map.of("popularityScore", Map.of("order", "desc")),
                    Map.of("stockQuantity", Map.of("order", "desc")),
                    Map.of("updatedAt", Map.of("order", "desc")));
        }
        return switch (normalizedSort) {
            case "popular" -> List.of(
                    Map.of("popularityScore", Map.of("order", "desc")),
                    Map.of("_score", Map.of("order", "desc")));
            case "price-low" -> List.of(Map.of("price", Map.of("order", "asc")));
            case "price-high" -> List.of(Map.of("price", Map.of("order", "desc")));
            case "inventory" -> List.of(Map.of("stockQuantity", Map.of("order", "desc")));
            case "newest" -> List.of(Map.of("updatedAt", Map.of("order", "desc")));
            default -> throw new BusinessException("Unsupported sort: " + sort);
        };
    }

    private synchronized void ensureIndexReady() {
        if (indexReady) {
            return;
        }

        if (!resourceExists("/_alias/{alias}", productsReadAlias)) {
            createIndex();
        }
        indexReady = true;
    }

    private boolean resourceExists(String pathTemplate, Object... uriVariables) {
        try {
            openSearchRestClient.method(HttpMethod.HEAD)
                    .uri(pathTemplate, uriVariables)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return false;
            }
            throw new BusinessException("Unable to inspect OpenSearch resource state", exception);
        }
    }

    private void recreateIndex() {
        if (resourceExists("/{index}", productsIndexName)) {
            openSearchRestClient.delete()
                    .uri("/{index}", productsIndexName)
                    .retrieve()
                    .toBodilessEntity();
        }
        indexReady = false;
        ensureIndexReady();
    }

    private void createIndex() {
        openSearchRestClient.put()
                .uri("/{index}", productsIndexName)
                .body(buildIndexDefinition())
                .retrieve()
                .toBodilessEntity();
        log.info("Created OpenSearch product index index={} readAlias={} writeAlias={}", productsIndexName, productsReadAlias, productsWriteAlias);
    }

    private String buildIndexDefinition() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("id", Map.of("type", "long"));
        properties.put("name", Map.of(
                "type", "text",
                "analyzer", "catalog_index_analyzer",
                "search_analyzer", "catalog_search_analyzer",
                "fields", Map.of("keyword", Map.of("type", "keyword", "ignore_above", 256))));
        properties.put("nameSuggest", Map.of(
                "type", "search_as_you_type",
                "analyzer", "catalog_index_analyzer",
                "search_analyzer", "catalog_search_analyzer"));
        properties.put("categoryCode", Map.of("type", "keyword"));
        properties.put("categoryName", Map.of(
                "type", "text",
                "analyzer", "catalog_index_analyzer",
                "search_analyzer", "catalog_search_analyzer"));
        properties.put("description", Map.of(
                "type", "text",
                "analyzer", "catalog_index_analyzer",
                "search_analyzer", "catalog_search_analyzer"));
        properties.put("searchKeywords", Map.of(
                "type", "text",
                "analyzer", "catalog_index_analyzer",
                "search_analyzer", "catalog_search_analyzer"));
        properties.put("price", Map.of("type", "double"));
        properties.put("stockQuantity", Map.of("type", "integer"));
        properties.put("active", Map.of("type", "boolean"));
        properties.put("inStock", Map.of("type", "boolean"));
        properties.put("popularityScore", Map.of("type", "double"));
        properties.put("createdAt", Map.of("type", "date"));
        properties.put("updatedAt", Map.of("type", "date"));

        Map<String, Object> definition = new LinkedHashMap<>();
        definition.put("settings", Map.of(
                "index", Map.of(
                        "number_of_shards", 1,
                        "number_of_replicas", 0),
                "analysis", Map.of(
                        "analyzer", Map.of(
                                "catalog_index_analyzer", Map.of(
                                        "tokenizer", "standard",
                                        "filter", List.of("lowercase", "asciifolding")),
                                "catalog_search_analyzer", Map.of(
                                        "tokenizer", "standard",
                                        "filter", List.of("lowercase", "asciifolding"))))));
        definition.put("mappings", Map.of("properties", properties));
        definition.put("aliases", Map.of(
                productsReadAlias, Map.of(),
                productsWriteAlias, Map.of()));
        return objectMapper.writeValueAsString(definition);
    }

    private void indexDocument(IndexedProductDocument document) throws IOException {
        openSearchRestClient.put()
                .uri("/{alias}/_doc/{id}", productsWriteAlias, document.id())
                .body(objectMapper.writeValueAsString(document))
                .retrieve()
                .toBodilessEntity();
        log.info("Indexed search document productId={} categoryCode={} inStock={} popularityScore={}",
                document.id(),
                document.categoryCode(),
                document.inStock(),
                document.popularityScore());
    }

    private void refreshIndex() {
        openSearchRestClient.post()
                .uri("/{index}/_refresh", productsIndexName)
                .retrieve()
                .toBodilessEntity();
    }

    private PriceBand resolvePriceBand(String priceBandCode) {
        String normalizedPriceBand = normalize(priceBandCode);
        if (normalizedPriceBand == null) {
            return null;
        }
        return tuningProperties.getPriceBands().stream()
                .filter(band -> normalizedPriceBand.equals(normalize(band.getCode())))
                .findFirst()
                .orElse(null);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private record SearchRequestCriteria(
            String query,
            String categoryCode,
            Boolean active,
            Boolean inStock,
            Integer minStock,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String priceBandCode,
            Long excludeProductId,
            String sort,
            int page,
            int size,
            PriceBand resolvedPriceBand,
            List<String> expandedTerms) {
    }
}
