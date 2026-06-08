package com.orderflow.order.controller;

import com.orderflow.order.dto.OrderRequest;
import com.orderflow.order.dto.OrderResponse;
import com.orderflow.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order creation and retrieval")
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @Operation(summary = "Create a new order")
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request,
                                                     Authentication authentication) {
        OrderResponse response = orderService.createOrder(request, authentication);
        return ResponseEntity.created(URI.create("/api/orders/code/" + response.orderCode())).body(response);
    }

    @GetMapping
    @Operation(summary = "Retrieve all orders")
    public List<OrderResponse> getOrders() {
        return orderService.getAllOrders();
    }

    @GetMapping("/me")
    @Operation(summary = "Retrieve orders for the signed-in customer")
    public List<OrderResponse> getCurrentCustomerOrders(Authentication authentication) {
        return orderService.getCurrentCustomerOrders(authentication);
    }

    @GetMapping("/lookup")
    @Operation(summary = "Retrieve guest orders by checkout email")
    public List<OrderResponse> lookupOrders(@RequestParam String customerEmail,
                                            @RequestParam(required = false) String orderCode) {
        return orderService.lookupOrders(customerEmail, orderCode);
    }

    @GetMapping("/lookup/code/{orderCode}")
    @Operation(summary = "Retrieve a guest order by order code and checkout email")
    public OrderResponse lookupOrder(@PathVariable String orderCode,
                                     @RequestParam String customerEmail) {
        return orderService.lookupOrderByCode(orderCode, customerEmail);
    }

    @GetMapping("/code/{orderCode}")
    @Operation(summary = "Retrieve a customer-facing order by order code")
    public OrderResponse getOrderByCode(@PathVariable String orderCode, Authentication authentication) {
        return orderService.getOrderByCode(orderCode, authentication);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve an order by internal id")
    public OrderResponse getOrder(@PathVariable Long id, Authentication authentication) {
        return orderService.getOrderById(id, authentication);
    }
}
