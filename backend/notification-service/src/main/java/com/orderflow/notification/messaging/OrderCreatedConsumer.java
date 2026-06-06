package com.orderflow.notification.messaging;

import com.orderflow.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCreatedConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "${application.kafka.order-created-topic}", groupId = "${spring.kafka.consumer.group-id}")
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("Consumed Kafka event orderId={} customerEmail={}", event.orderId(), event.customerEmail());
        notificationService.sendOrderConfirmation(event);
    }
}
