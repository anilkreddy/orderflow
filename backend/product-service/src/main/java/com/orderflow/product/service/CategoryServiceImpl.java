package com.orderflow.product.service;

import com.orderflow.product.dto.CategoryResponse;
import com.orderflow.product.exception.ResourceNotFoundException;
import com.orderflow.product.repository.CategoryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc()
                .stream()
                .map(category -> new CategoryResponse(
                        category.getCode(),
                        category.getName(),
                        category.getActive(),
                        category.getCreatedAt(),
                        category.getUpdatedAt()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryByCode(String code) {
        return categoryRepository.findById(normalizeCode(code))
                .map(category -> new CategoryResponse(
                        category.getCode(),
                        category.getName(),
                        category.getActive(),
                        category.getCreatedAt(),
                        category.getUpdatedAt()))
                .orElseThrow(() -> new ResourceNotFoundException("Category", "code", code));
    }

    private String normalizeCode(String code) {
        return code == null ? null : code.trim().toLowerCase();
    }
}
