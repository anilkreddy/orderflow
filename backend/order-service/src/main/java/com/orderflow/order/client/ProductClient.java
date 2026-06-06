package com.orderflow.order.client;

import com.orderflow.order.exception.BusinessException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductClient {

    private static final Pattern MESSAGE_PATTERN = Pattern.compile("\"message\"\\s*:\\s*\"([^\"]+)\"");

    @Qualifier("productServiceRestClient")
    private final RestClient restClient;

    public ProductReservationResponse reserveProduct(Long productId, int quantity) {
        try {
            ProductReservationResponse response = restClient.post()
                    .uri("/api/products/{id}/reserve", productId)
                    .body(new StockReservationRequest(quantity))
                    .retrieve()
                    .body(ProductReservationResponse.class);

            if (response == null) {
                throw new BusinessException("Product reservation returned an empty response for product " + productId);
            }

            log.info("Reserved product stock productId={} quantity={} remaining={}",
                    productId,
                    quantity,
                    response.stockQuantity());
            return response;
        } catch (RestClientResponseException exception) {
            String message = extractMessage(exception);
            throw new BusinessException(message);
        }
    }

    private String extractMessage(RestClientResponseException exception) {
        String fallback = "Unable to reserve product stock";
        String responseBody = exception.getResponseBodyAsString();

        if (responseBody == null || responseBody.isBlank()) {
            log.error("Product service call failed status={} emptyBody=true", exception.getStatusCode());
            return fallback;
        }

        Matcher matcher = MESSAGE_PATTERN.matcher(responseBody);
        if (matcher.find()) {
            String message = matcher.group(1);
            log.error("Product service call failed status={} message={}", exception.getStatusCode(), message);
            return message;
        }

        log.error("Product service call failed status={} rawBody={}", exception.getStatusCode(), responseBody);
        return fallback;
    }
}
