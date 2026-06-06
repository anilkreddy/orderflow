import axios from 'axios';
import type {
  Category,
  Order,
  Product,
  ProductPayload,
  ProductSearchResponse,
  ReindexResponse,
  SearchSynonymGroup,
  SearchSynonymPayload,
  SearchTuning,
} from '../types';

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
  get: async (id: number): Promise<Product> => {
    const { data } = await api.get<Product>(`/api/products/${id}`);
    return data;
  },
  create: async (payload: ProductPayload): Promise<Product> => {
    const { data } = await api.post<Product>('/api/products', payload);
    return data;
  },
  update: async (id: number, payload: ProductPayload): Promise<Product> => {
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

export interface SearchParams {
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
  search: async (params: SearchParams): Promise<ProductSearchResponse> => {
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
  tuning: async (): Promise<SearchTuning> => {
    const { data } = await api.get<SearchTuning>('/api/search/tuning');
    return data;
  },
  synonyms: async (): Promise<SearchSynonymGroup[]> => {
    const { data } = await api.get<SearchSynonymGroup[]>('/api/search/synonyms');
    return data;
  },
  createSynonym: async (payload: SearchSynonymPayload): Promise<SearchSynonymGroup> => {
    const { data } = await api.post<SearchSynonymGroup>('/api/search/synonyms', payload);
    return data;
  },
  updateSynonym: async (id: string, payload: SearchSynonymPayload): Promise<SearchSynonymGroup> => {
    const { data } = await api.put<SearchSynonymGroup>(`/api/search/synonyms/${id}`, payload);
    return data;
  },
  removeSynonym: async (id: string): Promise<void> => {
    await api.delete(`/api/search/synonyms/${id}`);
  },
  reindex: async (): Promise<ReindexResponse> => {
    const { data } = await api.post<ReindexResponse>('/api/search/reindex/products');
    return data;
  },
};

export const orderApi = {
  list: async (): Promise<Order[]> => {
    const { data } = await api.get<Order[]>('/api/orders');
    return data;
  },
  get: async (id: number): Promise<Order> => {
    const { data } = await api.get<Order>(`/api/orders/${id}`);
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
