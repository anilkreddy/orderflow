package com.orderflow.search.messaging;

import com.orderflow.search.service.ProductSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductIndexingConsumer {

    private final ProductSearchService productSearchService;

    @KafkaListener(
            topics = "${application.kafka.product-upserted-topic}",
            groupId = "${spring.kafka.consumer.group-id}",
            properties = "spring.json.value.default.type=com.orderflow.search.messaging.ProductUpsertedEvent")
    public void handleProductUpsert(ProductUpsertedEvent event) {
        log.info("Consumed Kafka event topic=product.upserted productId={} categoryCode={}", event.id(), event.categoryCode());
        productSearchService.upsertIndexedProduct(event);
    }

    @KafkaListener(
            topics = "${application.kafka.product-deleted-topic}",
            groupId = "${spring.kafka.consumer.group-id}",
            properties = "spring.json.value.default.type=com.orderflow.search.messaging.ProductDeletedEvent")
    public void handleProductDelete(ProductDeletedEvent event) {
        log.info("Consumed Kafka event topic=product.deleted productId={}", event.productId());
        productSearchService.deleteIndexedProduct(event.productId());
    }
}
