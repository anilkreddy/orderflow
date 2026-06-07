package com.orderflow.notification.consumer;

import com.orderflow.notification.event.LowStockEvent;
import com.orderflow.notification.service.NotificationOrchestratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LowStockConsumer {

    private final NotificationOrchestratorService notificationOrchestratorService;

    @KafkaListener(
            topics = "${application.kafka.topics.low-stock}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "lowStockKafkaListenerContainerFactory")
    public void handleLowStock(LowStockEvent event) {
        log.info("Event consumed topic=inventory.low-stock eventId={} productId={} recipient={}", event.eventId(), event.productId(), event.adminEmail());
        notificationOrchestratorService.handleLowStock(event);
    }
}
