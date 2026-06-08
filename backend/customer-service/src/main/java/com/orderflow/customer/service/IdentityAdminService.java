package com.orderflow.customer.service;

import com.orderflow.customer.dto.CustomerPasswordChangeRequest;
import com.orderflow.customer.dto.CustomerRegistrationRequest;
import com.orderflow.customer.dto.CustomerUpdateRequest;

public interface IdentityAdminService {

    String createCustomer(CustomerRegistrationRequest request);

    void updateCustomer(String identityUserId, CustomerUpdateRequest request);

    void deleteCustomer(String identityUserId);

    void changePassword(String identityUserId, CustomerPasswordChangeRequest request);
}
