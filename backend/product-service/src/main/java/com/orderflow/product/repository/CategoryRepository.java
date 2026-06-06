package com.orderflow.product.repository;

import com.orderflow.product.domain.Category;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, String> {

    List<Category> findAllByOrderByNameAsc();
}
