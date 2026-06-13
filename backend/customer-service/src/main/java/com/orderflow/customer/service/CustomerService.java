package com.orderflow.customer.service;

import com.orderflow.customer.dto.AuthenticatedCustomer;
import com.orderflow.customer.dto.CustomerPasswordChangeRequest;
import com.orderflow.customer.dto.CustomerRegistrationRequest;
import com.orderflow.customer.dto.CustomerResponse;
import com.orderflow.customer.dto.CustomerUpdateRequest;
import java.util.List;
import java.util.UUID;

public interface CustomerService {

    CustomerResponse registerCustomer(CustomerRegistrationRequest request);

    List<CustomerResponse> getCustomers();

    CustomerResponse getCustomer(UUID customerId);

    CustomerResponse getCurrentCustomer(AuthenticatedCustomer authenticatedCustomer);

    CustomerResponse updateCustomer(UUID customerId, CustomerUpdateRequest request);

    void deleteCustomer(UUID customerId);

    void changePassword(UUID customerId, CustomerPasswordChangeRequest request);
}
