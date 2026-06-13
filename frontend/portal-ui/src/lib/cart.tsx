import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { CartItem } from '../types';

const STORAGE_KEY = 'orderflow_portal_cart';
export const CART_ITEM_ADDED_EVENT = 'orderflow:cart-item-added';

export interface CartItemAddedEventDetail {
  productName: string;
  sourceX: number;
  sourceY: number;
}

export function notifyCartItemAdded(source: HTMLElement, productName: string) {
  const sourceRect = source.getBoundingClientRect();
  window.dispatchEvent(new CustomEvent<CartItemAddedEventDetail>(CART_ITEM_ADDED_EVENT, {
    detail: {
      productName,
      sourceX: sourceRect.left + sourceRect.width / 2,
      sourceY: sourceRect.top + sourceRect.height / 2,
    },
  }));
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    addItem: (productId, quantity = 1) => {
      setItems((current) => {
        const existing = current.find((item) => item.productId === productId);
        if (existing) {
          return current.map((item) =>
            item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
          );
        }
        return [...current, { productId, quantity }];
      });
    },
    setQuantity: (productId, quantity) => {
      setItems((current) => {
        if (quantity <= 0) {
          return current.filter((item) => item.productId !== productId);
        }
        return current.map((item) => (item.productId === productId ? { ...item, quantity } : item));
      });
    },
    removeItem: (productId) => {
      setItems((current) => current.filter((item) => item.productId !== productId));
    },
    clearCart: () => {
      setItems([]);
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
