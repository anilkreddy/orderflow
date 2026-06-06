package com.orderflow.product.service;

import com.orderflow.product.dto.ProductRequest;
import com.orderflow.product.dto.ProductResponse;
import java.util.List;

public interface ProductService {

    ProductResponse createProduct(ProductRequest request);

    List<ProductResponse> getAllProducts();

    ProductResponse getProductById(Long id);

    ProductResponse updateProduct(Long id, ProductRequest request);

    void deleteProduct(Long id);

    ProductResponse reserveStock(Long id, int quantity);
}
