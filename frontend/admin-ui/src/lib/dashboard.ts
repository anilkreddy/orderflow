import type { Order, Product } from '../types';

export interface ChartSegment {
  color: string;
  label: string;
  value: number;
}

export interface ChartDatum {
  label: string;
  segments: ChartSegment[];
}

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

export function splitOrdersByRecentWindow(orders: Order[], days = 30) {
  const now = Date.now();
  const currentStart = now - days * 24 * 60 * 60 * 1000;
  const previousStart = currentStart - days * 24 * 60 * 60 * 1000;

  const current = orders.filter((order) => {
    const createdAt = new Date(order.createdAt).getTime();
    return createdAt >= currentStart && createdAt <= now;
  });

  const previous = orders.filter((order) => {
    const createdAt = new Date(order.createdAt).getTime();
    return createdAt >= previousStart && createdAt < currentStart;
  });

  return { current, previous };
}

export function buildMonthlyStatusRevenueChart(orders: Order[]): ChartDatum[] {
  const months = Array.from({ length: 12 }, (_, index) => ({
    label: monthFormatter.format(new Date(2026, index, 1)),
    created: 0,
    confirmed: 0,
    exceptions: 0,
  }));

  for (const order of orders) {
    const monthIndex = new Date(order.createdAt).getMonth();
    if (monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    if (order.status === 'CONFIRMED') {
      months[monthIndex].confirmed += order.totalAmount;
    } else if (order.status === 'FAILED' || order.status === 'CANCELLED') {
      months[monthIndex].exceptions += order.totalAmount;
    } else {
      months[monthIndex].created += order.totalAmount;
    }
  }

  return months.map((month) => ({
    label: month.label,
    segments: [
      { label: 'Created', value: month.created, color: '#3f46d8' },
      { label: 'Confirmed', value: month.confirmed, color: '#5f7cff' },
      { label: 'Exceptions', value: month.exceptions, color: '#c7d6ff' },
    ],
  }));
}

export function getActiveProducts(products: Product[]) {
  return products.filter((product) => product.active);
}

export function getLowStockProducts(products: Product[], threshold = 10) {
  return getActiveProducts(products).filter((product) => product.stockQuantity <= threshold);
}

export function getTotalInventory(products: Product[]) {
  return getActiveProducts(products).reduce((sum, product) => sum + product.stockQuantity, 0);
}
