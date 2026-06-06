package com.orderflow.notification.service;

import com.orderflow.notification.messaging.OrderCreatedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class NotificationService {

    public void sendOrderConfirmation(OrderCreatedEvent event) {
        log.info("Order confirmation sent to {} for order {}", event.customerEmail(), event.orderId());
    }
}
