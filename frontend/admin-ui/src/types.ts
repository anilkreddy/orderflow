export type OrderStatus = 'CREATED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export interface Product {
  id: number;
  name: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  price: number;
  stockQuantity: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  name: string;
  categoryCode: string;
  description: string;
  price: number;
  stockQuantity: number;
  active: boolean;
}

export interface Category {
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultProduct extends Product {
  inStock: boolean;
  popularityScore: number;
  score: number;
}

export interface SearchCategoryFacet {
  categoryCode: string;
  categoryName: string;
  count: number;
  selected: boolean;
}

export interface SearchPriceBandFacet {
  code: string;
  label: string;
  minPrice: number | null;
  maxPrice: number | null;
  count: number;
  selected: boolean;
}

export interface SearchAvailabilityFacets {
  inStockCount: number;
  outOfStockCount: number;
  activeCount: number;
  inactiveCount: number;
}

export interface ProductSearchFacets {
  categories: SearchCategoryFacet[];
  priceBands: SearchPriceBandFacet[];
  availability: SearchAvailabilityFacets;
}

export interface ProductSearchResponse {
  items: SearchResultProduct[];
  total: number;
  page: number;
  size: number;
  hasNext: boolean;
  facets: ProductSearchFacets;
}

export interface SearchBoostTuning {
  exactName: number;
  phrasePrefix: number;
  category: number;
  keywords: number;
  description: number;
}

export interface SearchTuning {
  synonyms: string[];
  boosts: SearchBoostTuning;
  popularityFactor: number;
  inStockWeight: number;
  activeWeight: number;
}

export interface SearchSynonymGroup {
  id: string;
  primaryTerm: string;
  terms: string[];
  termCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchSynonymPayload {
  terms: string[];
}

export interface ReindexResponse {
  status: string;
  indexedCount: number;
  completedAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}

export interface CustomerSummary {
  customerName: string;
  customerEmail: string;
  ordersCount: number;
  lifetimeValue: number;
  lastOrderAt: string;
  lastOrderStatus: OrderStatus;
  latestOrderId: number;
}

export interface AdminCredentials {
  email: string;
  password: string;
}

export interface AdminSession {
  email: string;
  displayName: string;
  signedInAt: string;
}
