package com.orderflow.search.client;

import com.orderflow.search.exception.BusinessException;
import java.util.Arrays;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Component
public class ProductCatalogClient {

    private final RestClient restClient;

    public ProductCatalogClient(@Qualifier("productCatalogRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public List<ProductCatalogProductResponse> getProducts() {
        try {
            ProductCatalogProductResponse[] response = restClient.get()
                    .uri("/api/products")
                    .retrieve()
                    .body(ProductCatalogProductResponse[].class);

            if (response == null) {
                throw new BusinessException("Product catalog returned an empty search reindex response");
            }

            return Arrays.asList(response);
        } catch (RestClientResponseException exception) {
            log.error("Product catalog fetch failed status={} body={}", exception.getStatusCode(), exception.getResponseBodyAsString());
            throw new BusinessException("Unable to fetch products for search reindexing");
        }
    }
}
