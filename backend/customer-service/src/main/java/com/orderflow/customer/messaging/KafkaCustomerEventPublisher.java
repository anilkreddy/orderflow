package com.orderflow.customer.messaging;

import com.orderflow.customer.config.CustomerKafkaTopicsProperties;
import com.orderflow.customer.event.CustomerDeletedEvent;
import com.orderflow.customer.event.CustomerPasswordChangedEvent;
import com.orderflow.customer.event.CustomerPasswordExpiredEvent;
import com.orderflow.customer.event.CustomerPasswordExpiringEvent;
import com.orderflow.customer.event.CustomerRegisteredEvent;
import com.orderflow.customer.event.CustomerUpsertedEvent;
import com.orderflow.customer.service.CustomerEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaCustomerEventPublisher implements CustomerEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final CustomerKafkaTopicsProperties topics;

    @Override
    public void publishCustomerRegistered(CustomerRegisteredEvent event) {
        publish(topics.customerRegisteredTopic(), event.customerId().toString(), event);
    }

    @Override
    public void publishCustomerUpserted(CustomerUpsertedEvent event) {
        publish(topics.customerUpsertedTopic(), event.customerId().toString(), event);
    }

    @Override
    public void publishCustomerDeleted(CustomerDeletedEvent event) {
        publish(topics.customerDeletedTopic(), event.customerId().toString(), event);
    }

    @Override
    public void publishCustomerPasswordChanged(CustomerPasswordChangedEvent event) {
        publish(topics.customerPasswordChangedTopic(), event.customerId().toString(), event);
    }

    @Override
    public void publishCustomerPasswordExpiring(CustomerPasswordExpiringEvent event) {
        publish(topics.customerPasswordExpiringTopic(), event.customerId().toString(), event);
    }

    @Override
    public void publishCustomerPasswordExpired(CustomerPasswordExpiredEvent event) {
        publish(topics.customerPasswordExpiredTopic(), event.customerId().toString(), event);
    }

    private void publish(String topic, String key, Object event) {
        kafkaTemplate.send(topic, key, event);
        log.info("Published {} to topic={} key={}", event.getClass().getSimpleName(), topic, key);
    }
}
