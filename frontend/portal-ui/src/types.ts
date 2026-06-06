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
  status: 'CREATED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
}

export interface CartItem {
  productId: number;
  quantity: number;
}
