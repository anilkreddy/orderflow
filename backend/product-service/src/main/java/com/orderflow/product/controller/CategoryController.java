package com.orderflow.product.controller;

import com.orderflow.product.dto.CategoryResponse;
import com.orderflow.product.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Product category reference data")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Retrieve all categories")
    public List<CategoryResponse> getCategories() {
        return categoryService.getAllCategories();
    }

    @GetMapping("/{code}")
    @Operation(summary = "Retrieve a category by code")
    public CategoryResponse getCategory(@PathVariable String code) {
        return categoryService.getCategoryByCode(code);
    }
}
