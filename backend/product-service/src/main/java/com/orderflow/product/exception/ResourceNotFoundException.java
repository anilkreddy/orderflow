package com.orderflow.product.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " not found with id " + id);
    }

    public ResourceNotFoundException(String resourceName, String key, String value) {
        super(resourceName + " not found with " + key + " " + value);
    }
}
