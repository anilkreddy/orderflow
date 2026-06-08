package com.orderflow.order.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " not found with id " + id);
    }

    public ResourceNotFoundException(String resourceName, String reference) {
        super(resourceName + " not found with reference " + reference);
    }
}
