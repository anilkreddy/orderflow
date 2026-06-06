import type { CustomerSummary, OrderStatus } from '../types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US');

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function orderStatusTone(status: OrderStatus) {
  switch (status) {
    case 'CONFIRMED':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'CANCELLED':
      return 'muted';
    default:
      return 'warning';
  }
}

export function customerTier(customer: CustomerSummary) {
  if (customer.lifetimeValue >= 1500 || customer.ordersCount >= 8) {
    return 'Priority';
  }

  if (customer.lifetimeValue >= 500 || customer.ordersCount >= 3) {
    return 'Growth';
  }

  return 'New';
}
