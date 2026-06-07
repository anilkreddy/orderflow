package com.orderflow.notification.config;

import com.orderflow.notification.event.LowStockEvent;
import com.orderflow.notification.event.OrderCancelledEvent;
import com.orderflow.notification.event.OrderCreatedEvent;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.util.backoff.FixedBackOff;

@Slf4j
@Configuration
public class KafkaConsumerConfiguration {

    @Bean
    public ConsumerFactory<String, OrderCreatedEvent> orderCreatedConsumerFactory(KafkaProperties kafkaProperties) {
        return consumerFactory(kafkaProperties, OrderCreatedEvent.class);
    }

    @Bean
    public ConsumerFactory<String, OrderCancelledEvent> orderCancelledConsumerFactory(KafkaProperties kafkaProperties) {
        return consumerFactory(kafkaProperties, OrderCancelledEvent.class);
    }

    @Bean
    public ConsumerFactory<String, LowStockEvent> lowStockConsumerFactory(KafkaProperties kafkaProperties) {
        return consumerFactory(kafkaProperties, LowStockEvent.class);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderCreatedEvent> orderCreatedKafkaListenerContainerFactory(
            ConsumerFactory<String, OrderCreatedEvent> orderCreatedConsumerFactory,
            DefaultErrorHandler kafkaErrorHandler) {
        return listenerContainerFactory(orderCreatedConsumerFactory, kafkaErrorHandler);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderCancelledEvent> orderCancelledKafkaListenerContainerFactory(
            ConsumerFactory<String, OrderCancelledEvent> orderCancelledConsumerFactory,
            DefaultErrorHandler kafkaErrorHandler) {
        return listenerContainerFactory(orderCancelledConsumerFactory, kafkaErrorHandler);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, LowStockEvent> lowStockKafkaListenerContainerFactory(
            ConsumerFactory<String, LowStockEvent> lowStockConsumerFactory,
            DefaultErrorHandler kafkaErrorHandler) {
        return listenerContainerFactory(lowStockConsumerFactory, kafkaErrorHandler);
    }

    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(
                (record, exception) -> log.error(
                        "Kafka listener error topic={} partition={} offset={} payload={} message={}",
                        record.topic(),
                        record.partition(),
                        record.offset(),
                        record.value(),
                        exception.getMessage(),
                        exception),
                new FixedBackOff(0L, 0L));
        errorHandler.addNotRetryableExceptions(Exception.class);
        return errorHandler;
    }

    @SuppressWarnings("removal")
    private <T> ConsumerFactory<String, T> consumerFactory(KafkaProperties kafkaProperties, Class<T> eventType) {
        Map<String, Object> properties = new HashMap<>(kafkaProperties.buildConsumerProperties());
        properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        properties.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
        properties.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class);
        properties.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        properties.put(JsonDeserializer.VALUE_DEFAULT_TYPE, eventType.getName());
        properties.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        return new DefaultKafkaConsumerFactory<>(properties);
    }

    private <T> ConcurrentKafkaListenerContainerFactory<String, T> listenerContainerFactory(
            ConsumerFactory<String, T> consumerFactory,
            DefaultErrorHandler kafkaErrorHandler) {
        ConcurrentKafkaListenerContainerFactory<String, T> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(kafkaErrorHandler);
        return factory;
    }
}
