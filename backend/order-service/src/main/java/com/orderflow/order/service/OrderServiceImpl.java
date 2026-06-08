package com.orderflow.order.service;

import com.orderflow.order.client.ProductClient;
import com.orderflow.order.client.ProductReservationResponse;
import com.orderflow.order.domain.Order;
import com.orderflow.order.domain.OrderItem;
import com.orderflow.order.domain.OrderStatus;
import com.orderflow.order.dto.OrderItemRequest;
import com.orderflow.order.dto.OrderRequest;
import com.orderflow.order.dto.OrderResponse;
import com.orderflow.order.exception.BusinessException;
import com.orderflow.order.exception.ForbiddenException;
import com.orderflow.order.exception.ResourceNotFoundException;
import com.orderflow.order.mapper.OrderMapper;
import com.orderflow.order.messaging.OrderEventPublisher;
import com.orderflow.order.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
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
    public OrderResponse createOrder(OrderRequest request, Authentication authentication) {
        AccessContext accessContext = resolveAccessContext(authentication);
        String customerEmail = resolveCustomerEmail(request, accessContext);
        String customerName = resolveCustomerName(request, accessContext);

        log.info("Creating order customerEmail={} itemCount={} authenticatedCustomer={}",
                customerEmail,
                request.items().size(),
                accessContext.hasScope("customer"));

        List<PreparedOrderItem> preparedItems = request.items().stream()
                .map(this::reserveAndPrepareItem)
                .toList();

        Order order = Order.builder()
                .customerName(customerName)
                .customerEmail(customerEmail)
                .identityUserId(accessContext.hasScope("customer") ? accessContext.subject() : null)
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
        log.info("Order created id={} orderCode={} status={} totalAmount={} identityUserId={}",
                savedOrder.getId(),
                savedOrder.getOrderCode(),
                savedOrder.getStatus(),
                savedOrder.getTotalAmount(),
                savedOrder.getIdentityUserId());
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
    public List<OrderResponse> getCurrentCustomerOrders(Authentication authentication) {
        AccessContext accessContext = requireScope(authentication, "customer", "admin");
        if (accessContext.hasScope("admin") && !accessContext.hasScope("customer")) {
            return getAllOrders();
        }
        return orderRepository.findByIdentityUserIdOrderByCreatedAtDesc(accessContext.subject())
                .stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id, Authentication authentication) {
        AccessContext accessContext = requireScope(authentication, "customer", "admin");
        Order order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));

        if (accessContext.hasScope("admin")) {
            return orderMapper.toResponse(order);
        }

        if (order.getIdentityUserId() == null || !order.getIdentityUserId().equals(accessContext.subject())) {
            throw new ForbiddenException("This order is not available for the current customer");
        }

        return orderMapper.toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderByCode(String orderCode, Authentication authentication) {
        AccessContext accessContext = requireScope(authentication, "customer", "admin");
        Order order = orderRepository.findWithItemsByOrderCode(normalizeOrderCode(orderCode))
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderCode));

        if (accessContext.hasScope("admin")) {
            return orderMapper.toResponse(order);
        }

        if (order.getIdentityUserId() == null || !order.getIdentityUserId().equals(accessContext.subject())) {
            throw new ForbiddenException("This order is not available for the current customer");
        }

        return orderMapper.toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> lookupOrders(String customerEmail, String orderCode) {
        String normalizedEmail = normalizeEmail(customerEmail);
        if (orderCode != null && !orderCode.isBlank()) {
            return orderRepository.findByOrderCodeAndCustomerEmailIgnoreCase(normalizeOrderCode(orderCode), normalizedEmail)
                    .map(orderMapper::toResponse)
                    .stream()
                    .toList();
        }

        return orderRepository.findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(normalizedEmail)
                .stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse lookupOrderByCode(String orderCode, String customerEmail) {
        String normalizedOrderCode = normalizeOrderCode(orderCode);
        return orderRepository.findByOrderCodeAndCustomerEmailIgnoreCase(normalizedOrderCode, normalizeEmail(customerEmail))
                .map(orderMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Order", normalizedOrderCode));
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

    private AccessContext requireScope(Authentication authentication, String... allowedScopes) {
        AccessContext context = resolveAccessContext(authentication);
        for (String scope : allowedScopes) {
            if (context.hasScope(scope)) {
                return context;
            }
        }
        throw new ForbiddenException("The current principal does not have access to this order resource");
    }

    private AccessContext resolveAccessContext(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return new AccessContext(null, null, null, Set.of());
        }

        Set<String> scopes = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("SCOPE_"))
                .map(authority -> authority.substring("SCOPE_".length()))
                .collect(java.util.stream.Collectors.toSet());

        String givenName = jwt.getClaimAsString("given_name");
        String familyName = jwt.getClaimAsString("family_name");
        String displayName = firstNonBlank((givenName == null ? "" : givenName) + " " + (familyName == null ? "" : familyName), jwt.getClaimAsString("name"));

        return new AccessContext(jwt.getSubject(), jwt.getClaimAsString("email"), displayName, scopes);
    }

    private String resolveCustomerEmail(OrderRequest request, AccessContext accessContext) {
        if (!accessContext.hasScope("customer")) {
            return normalizeEmail(request.customerEmail());
        }

        if (accessContext.email() == null || accessContext.email().isBlank()) {
            throw new BusinessException("Authenticated customer token does not contain an email claim");
        }

        if (!accessContext.email().equalsIgnoreCase(request.customerEmail())) {
            log.info("Ignoring checkout email override for authenticated customer tokenEmail={} requestedEmail={}",
                    accessContext.email(), request.customerEmail());
        }
        return normalizeEmail(accessContext.email());
    }

    private String resolveCustomerName(OrderRequest request, AccessContext accessContext) {
        return firstNonBlank(request.customerName(), accessContext.displayName());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeOrderCode(String orderCode) {
        return orderCode.trim().toUpperCase(Locale.ROOT);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private record PreparedOrderItem(Long productId, String productName, Integer quantity, BigDecimal unitPrice) {
    }

    private record AccessContext(String subject, String email, String displayName, Set<String> scopes) {
        boolean hasScope(String scope) {
            return scopes.contains(scope);
        }
    }
}
