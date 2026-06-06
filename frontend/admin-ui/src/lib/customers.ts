import type { CustomerSummary, Order } from '../types';

export function buildCustomerSummaries(orders: Order[]): CustomerSummary[] {
  const customerMap = new Map<string, CustomerSummary>();

  for (const order of orders) {
    const key = order.customerEmail.trim().toLowerCase();
    const existing = customerMap.get(key);

    if (!existing) {
      customerMap.set(key, {
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        ordersCount: 1,
        lifetimeValue: order.totalAmount,
        lastOrderAt: order.createdAt,
        lastOrderStatus: order.status,
        latestOrderId: order.id,
      });
      continue;
    }

    existing.ordersCount += 1;
    existing.lifetimeValue += order.totalAmount;

    if (new Date(order.createdAt).getTime() >= new Date(existing.lastOrderAt).getTime()) {
      existing.lastOrderAt = order.createdAt;
      existing.lastOrderStatus = order.status;
      existing.latestOrderId = order.id;
      existing.customerName = order.customerName;
    }
  }

  return [...customerMap.values()].sort(
    (left, right) => new Date(right.lastOrderAt).getTime() - new Date(left.lastOrderAt).getTime(),
  );
}
