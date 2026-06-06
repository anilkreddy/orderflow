package com.orderflow.product.repository;

import com.orderflow.product.domain.Product;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = "category")
    List<Product> findAllByOrderByCreatedAtDesc();

    @Override
    @EntityGraph(attributePaths = "category")
    Optional<Product> findById(Long id);
}
