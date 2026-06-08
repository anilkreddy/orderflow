package com.orderflow.order.service;

import com.orderflow.order.dto.OrderRequest;
import com.orderflow.order.dto.OrderResponse;
import java.util.List;
import org.springframework.security.core.Authentication;

public interface OrderService {

    OrderResponse createOrder(OrderRequest request, Authentication authentication);

    List<OrderResponse> getAllOrders();

    List<OrderResponse> getCurrentCustomerOrders(Authentication authentication);

    OrderResponse getOrderById(Long id, Authentication authentication);

    OrderResponse getOrderByCode(String orderCode, Authentication authentication);

    List<OrderResponse> lookupOrders(String customerEmail, String orderCode);

    OrderResponse lookupOrderByCode(String orderCode, String customerEmail);
}
