package com.orderflow.order.service;

import com.orderflow.order.client.ProductClient;
import com.orderflow.order.client.ProductReservationResponse;
import com.orderflow.order.domain.Order;
import com.orderflow.order.domain.OrderItem;
import com.orderflow.order.domain.OrderStatus;
import com.orderflow.order.dto.OrderItemRequest;
import com.orderflow.order.dto.OrderRequest;
import com.orderflow.order.dto.OrderResponse;
import com.orderflow.order.exception.ResourceNotFoundException;
import com.orderflow.order.mapper.OrderMapper;
import com.orderflow.order.messaging.OrderEventPublisher;
import com.orderflow.order.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final ProductClient productClient;
    private final OrderEventPublisher orderEventPublisher;

    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        log.info("Creating order customerEmail={} itemCount={}", request.customerEmail(), request.items().size());

        List<PreparedOrderItem> preparedItems = request.items().stream()
                .map(this::reserveAndPrepareItem)
                .toList();

        Order order = Order.builder()
                .customerName(request.customerName())
                .customerEmail(request.customerEmail())
                .status(OrderStatus.CONFIRMED)
                .totalAmount(calculateTotal(preparedItems))
                .build();

        preparedItems.forEach(item -> order.addItem(OrderItem.builder()
                .productId(item.productId())
                .productName(item.productName())
                .quantity(item.quantity())
                .unitPrice(item.unitPrice())
                .build()));

        Order savedOrder = orderRepository.save(order);
        orderEventPublisher.publishOrderCreated(savedOrder);
        log.info("Order created id={} status={} totalAmount={}",
                savedOrder.getId(),
                savedOrder.getStatus(),
                savedOrder.getTotalAmount());
        return orderMapper.toResponse(savedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll()
                .stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        return orderMapper.toResponse(orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id)));
    }

    private PreparedOrderItem reserveAndPrepareItem(OrderItemRequest request) {
        ProductReservationResponse reservedProduct = productClient.reserveProduct(request.productId(), request.quantity());
        return new PreparedOrderItem(
                reservedProduct.id(),
                reservedProduct.name(),
                request.quantity(),
                reservedProduct.price());
    }

    private BigDecimal calculateTotal(List<PreparedOrderItem> items) {
        return items.stream()
                .map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private record PreparedOrderItem(Long productId, String productName, Integer quantity, BigDecimal unitPrice) {
    }
}
