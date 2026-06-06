import axios from 'axios';
import type { Category, Order, OrderPayload, Product, ProductPayload, ProductSearchResponse, SearchSuggestionResponse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productApi = {
  list: async (): Promise<Product[]> => {
    const { data } = await api.get<Product[]>('/api/products');
    return data;
  },
  get: async (id: string): Promise<Product> => {
    const { data } = await api.get<Product>(`/api/products/${id}`);
    return data;
  },
  create: async (payload: ProductPayload): Promise<Product> => {
    const { data } = await api.post<Product>('/api/products', payload);
    return data;
  },
  update: async (id: string, payload: ProductPayload): Promise<Product> => {
    const { data } = await api.put<Product>(`/api/products/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/products/${id}`);
  },
};

export const categoryApi = {
  list: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/api/categories');
    return data;
  },
};

export interface ProductSearchParams {
  q?: string;
  categoryCode?: string;
  active?: boolean;
  inStock?: boolean;
  minStock?: number;
  minPrice?: number;
  maxPrice?: number;
  priceBand?: string;
  excludeProductId?: number;
  sort?: string;
  page?: number;
  size?: number;
}

export const searchApi = {
  search: async (params: ProductSearchParams): Promise<ProductSearchResponse> => {
    const { data } = await api.get<ProductSearchResponse>('/api/search/products', {
      params: {
        q: params.q,
        categoryCode: params.categoryCode,
        active: params.active,
        inStock: params.inStock,
        minStock: params.minStock,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        priceBand: params.priceBand,
        excludeProductId: params.excludeProductId,
        sort: params.sort,
        page: params.page,
        size: params.size,
      },
    });
    return data;
  },
  suggestions: async (q: string, size = 8): Promise<SearchSuggestionResponse> => {
    const { data } = await api.get<SearchSuggestionResponse>('/api/search/suggestions', {
      params: { q, size },
    });
    return data;
  },
};

export const orderApi = {
  list: async (): Promise<Order[]> => {
    const { data } = await api.get<Order[]>('/api/orders');
    return data;
  },
  get: async (id: string): Promise<Order> => {
    const { data } = await api.get<Order>(`/api/orders/${id}`);
    return data;
  },
  create: async (payload: OrderPayload): Promise<Order> => {
    const { data } = await api.post<Order>('/api/orders', payload);
    return data;
  },
};

export function toApiMessage(error: unknown, fallback = 'Something went wrong') {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}
