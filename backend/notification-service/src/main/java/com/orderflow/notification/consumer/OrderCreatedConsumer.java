package com.orderflow.notification.consumer;

import com.orderflow.notification.event.OrderCreatedEvent;
import com.orderflow.notification.service.NotificationOrchestratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCreatedConsumer {

    private final NotificationOrchestratorService notificationOrchestratorService;

    @KafkaListener(
            topics = "${application.kafka.topics.order-created}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "orderCreatedKafkaListenerContainerFactory")
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("Event consumed topic=order.created eventId={} orderId={} recipient={}", event.eventId(), event.orderId(), event.customerEmail());
        notificationOrchestratorService.handleOrderCreated(event);
    }
}
