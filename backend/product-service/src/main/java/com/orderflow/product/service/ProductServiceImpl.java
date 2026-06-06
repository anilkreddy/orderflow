package com.orderflow.product.service;

import com.orderflow.product.domain.Category;
import com.orderflow.product.domain.Product;
import com.orderflow.product.dto.ProductRequest;
import com.orderflow.product.dto.ProductResponse;
import com.orderflow.product.exception.BusinessException;
import com.orderflow.product.exception.ResourceNotFoundException;
import com.orderflow.product.mapper.ProductMapper;
import com.orderflow.product.messaging.ProductDeletedEvent;
import com.orderflow.product.messaging.ProductUpsertedEvent;
import com.orderflow.product.repository.CategoryRepository;
import com.orderflow.product.repository.ProductRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private static final String CATEGORY_RESOURCE = "Category";

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductMapper productMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Product product = productMapper.toEntity(request);
        product.setCategory(getActiveCategory(request.categoryCode()));
        Product savedProduct = productRepository.save(product);
        log.info("Created product id={} name={} categoryCode={} stockQuantity={}",
                savedProduct.getId(),
                savedProduct.getName(),
                savedProduct.getCategory().getCode(),
                savedProduct.getStockQuantity());
        ProductResponse response = productMapper.toResponse(savedProduct);
        applicationEventPublisher.publishEvent(ProductUpsertedEvent.from(response));
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(productMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        return productMapper.toResponse(getProduct(id));
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = getProduct(id);
        productMapper.updateEntity(request, product);
        product.setCategory(getActiveCategory(request.categoryCode()));
        Product updatedProduct = productRepository.save(product);
        log.info("Updated product id={} name={} categoryCode={} stockQuantity={}",
                updatedProduct.getId(),
                updatedProduct.getName(),
                updatedProduct.getCategory().getCode(),
                updatedProduct.getStockQuantity());
        ProductResponse response = productMapper.toResponse(updatedProduct);
        applicationEventPublisher.publishEvent(ProductUpsertedEvent.from(response));
        return response;
    }

    @Override
    @Transactional
    public void deleteProduct(Long id) {
        Product product = getProduct(id);
        productRepository.delete(product);
        applicationEventPublisher.publishEvent(ProductDeletedEvent.of(product.getId()));
        log.info("Deleted product id={} name={}", product.getId(), product.getName());
    }

    @Override
    @Transactional
    public ProductResponse reserveStock(Long id, int quantity) {
        Product product = getProduct(id);

        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new BusinessException("Product " + id + " is inactive and cannot be reserved");
        }

        if (product.getStockQuantity() < quantity) {
            throw new BusinessException("Insufficient stock for product " + id);
        }

        product.setStockQuantity(product.getStockQuantity() - quantity);
        Product updatedProduct = productRepository.save(product);
        log.info("Reserved stock for product id={} quantity={} remaining={}",
                updatedProduct.getId(),
                quantity,
                updatedProduct.getStockQuantity());
        ProductResponse response = productMapper.toResponse(updatedProduct);
        applicationEventPublisher.publishEvent(ProductUpsertedEvent.from(response));
        return response;
    }

    private Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private Category getActiveCategory(String categoryCode) {
        Category category = categoryRepository.findById(normalizeCategoryCode(categoryCode))
                .orElseThrow(() -> new ResourceNotFoundException(CATEGORY_RESOURCE, "code", categoryCode));

        if (!Boolean.TRUE.equals(category.getActive())) {
            throw new BusinessException("Category " + categoryCode + " is inactive and cannot be assigned to a product");
        }

        return category;
    }

    private String normalizeCategoryCode(String categoryCode) {
        return categoryCode == null ? null : categoryCode.trim().toLowerCase();
    }
}
