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

export interface OrderItemPayload {
  productId: number;
  quantity: number;
}

export interface OrderPayload {
  customerName: string;
  customerEmail: string;
  items: OrderItemPayload[];
}

export interface CustomerRegistrationPayload {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface CustomerProfile {
  id: string;
  identityUserId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerified: boolean;
  registeredAt: string;
  passwordChangedAt: string;
  passwordExpiresAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
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

export interface SearchSuggestionResponse {
  suggestions: string[];
}

export interface Order {
  id: number;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: 'CREATED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
}

export interface CartItem {
  productId: number;
  quantity: number;
}
