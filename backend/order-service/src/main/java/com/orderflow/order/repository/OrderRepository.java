package com.orderflow.order.repository;

import com.orderflow.order.domain.Order;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Override
    @EntityGraph(attributePaths = "items")
    List<Order> findAll();

    @EntityGraph(attributePaths = "items")
    Optional<Order> findWithItemsById(Long id);

    @EntityGraph(attributePaths = "items")
    List<Order> findByIdentityUserIdOrderByCreatedAtDesc(String identityUserId);

    @EntityGraph(attributePaths = "items")
    Optional<Order> findWithItemsByOrderCode(String orderCode);

    @EntityGraph(attributePaths = "items")
    List<Order> findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(String customerEmail);

    @EntityGraph(attributePaths = "items")
    Optional<Order> findByIdAndCustomerEmailIgnoreCase(Long id, String customerEmail);

    @EntityGraph(attributePaths = "items")
    Optional<Order> findByOrderCodeAndCustomerEmailIgnoreCase(String orderCode, String customerEmail);
}
