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
