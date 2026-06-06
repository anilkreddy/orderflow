package com.orderflow.product.service;

import com.orderflow.product.dto.CategoryResponse;
import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getAllCategories();

    CategoryResponse getCategoryByCode(String code);
}
