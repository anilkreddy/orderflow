package com.orderflow.notification.consumer;

import com.orderflow.notification.event.OrderCancelledEvent;
import com.orderflow.notification.service.NotificationOrchestratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCancelledConsumer {

    private final NotificationOrchestratorService notificationOrchestratorService;

    @KafkaListener(
            topics = "${application.kafka.topics.order-cancelled}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "orderCancelledKafkaListenerContainerFactory")
    public void handleOrderCancelled(OrderCancelledEvent event) {
        log.info("Event consumed topic=order.cancelled eventId={} orderId={} recipient={}", event.eventId(), event.orderId(), event.customerEmail());
        notificationOrchestratorService.handleOrderCancelled(event);
    }
}
