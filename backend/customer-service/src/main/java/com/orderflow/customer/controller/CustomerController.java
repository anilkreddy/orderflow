package com.orderflow.customer.controller;

import com.orderflow.customer.dto.AuthenticatedCustomer;
import com.orderflow.customer.dto.CustomerPasswordChangeRequest;
import com.orderflow.customer.dto.CustomerRegistrationRequest;
import com.orderflow.customer.dto.CustomerResponse;
import com.orderflow.customer.dto.CustomerUpdateRequest;
import com.orderflow.customer.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Customer profile and identity lifecycle management")
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new customer")
    public CustomerResponse registerCustomer(@Valid @RequestBody CustomerRegistrationRequest request) {
        return customerService.registerCustomer(request);
    }

    @GetMapping("/me")
    @Operation(summary = "Retrieve the current signed-in customer profile")
    public CustomerResponse getCurrentCustomer(@AuthenticationPrincipal Jwt jwt) {
        return customerService.getCurrentCustomer(new AuthenticatedCustomer(
                jwt.getSubject(),
                jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("given_name"),
                jwt.getClaimAsString("family_name"),
                Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))));
    }

    @GetMapping
    @Operation(summary = "List all customers")
    public List<CustomerResponse> getCustomers() {
        return customerService.getCustomers();
    }

    @GetMapping("/{customerId}")
    @Operation(summary = "Retrieve a customer by id")
    public CustomerResponse getCustomer(@PathVariable UUID customerId) {
        return customerService.getCustomer(customerId);
    }

    @PutMapping("/{customerId}")
    @Operation(summary = "Update a customer profile")
    public CustomerResponse updateCustomer(@PathVariable UUID customerId, @Valid @RequestBody CustomerUpdateRequest request) {
        return customerService.updateCustomer(customerId, request);
    }

    @DeleteMapping("/{customerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a customer")
    public void deleteCustomer(@PathVariable UUID customerId) {
        customerService.deleteCustomer(customerId);
    }

    @PostMapping("/{customerId}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Change a customer's password")
    public void changePassword(@PathVariable UUID customerId, @Valid @RequestBody CustomerPasswordChangeRequest request) {
        customerService.changePassword(customerId, request);
    }
}
