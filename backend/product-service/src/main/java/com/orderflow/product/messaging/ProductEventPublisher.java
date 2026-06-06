package com.orderflow.product.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${application.kafka.product-upserted-topic}")
    private String productUpsertedTopic;

    @Value("${application.kafka.product-deleted-topic}")
    private String productDeletedTopic;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleProductUpsert(ProductUpsertedEvent event) {
        kafkaTemplate.send(productUpsertedTopic, String.valueOf(event.id()), event);
        log.info("Published Kafka event topic={} productId={} categoryCode={}",
                productUpsertedTopic,
                event.id(),
                event.categoryCode());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleProductDelete(ProductDeletedEvent event) {
        kafkaTemplate.send(productDeletedTopic, String.valueOf(event.productId()), event);
        log.info("Published Kafka event topic={} productId={}",
                productDeletedTopic,
                event.productId());
    }
}
