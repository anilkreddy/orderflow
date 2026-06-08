package com.orderflow.customer.service;

import com.orderflow.customer.event.CustomerDeletedEvent;
import com.orderflow.customer.event.CustomerPasswordChangedEvent;
import com.orderflow.customer.event.CustomerPasswordExpiredEvent;
import com.orderflow.customer.event.CustomerPasswordExpiringEvent;
import com.orderflow.customer.event.CustomerRegisteredEvent;
import com.orderflow.customer.event.CustomerUpsertedEvent;

public interface CustomerEventPublisher {

    void publishCustomerRegistered(CustomerRegisteredEvent event);

    void publishCustomerUpserted(CustomerUpsertedEvent event);

    void publishCustomerDeleted(CustomerDeletedEvent event);

    void publishCustomerPasswordChanged(CustomerPasswordChangedEvent event);

    void publishCustomerPasswordExpiring(CustomerPasswordExpiringEvent event);

    void publishCustomerPasswordExpired(CustomerPasswordExpiredEvent event);
}
