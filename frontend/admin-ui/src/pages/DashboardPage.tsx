import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, productApi, toApiMessage } from '../lib/api';
import { buildCustomerSummaries } from '../lib/customers';
import { calculatePercentageChange, getActiveProducts, getLowStockProducts, getTotalInventory, splitOrdersByRecentWindow } from '../lib/dashboard';
import { formatCompactCurrency, formatCurrency, formatDateTime, formatNumber, formatPercent, formatStatus, orderStatusTone } from '../lib/format';
import type { Order, OrderStatus, Product } from '../types';

const statusOrder: OrderStatus[] = ['CREATED', 'CONFIRMED', 'FAILED', 'CANCELLED'];

export function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [productData, orderData] = await Promise.all([productApi.list(), orderApi.list()]);
        setProducts(productData);
        setOrders(orderData.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()));
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load commerce overview'));
      }
    }

    void load();
  }, []);

  const customers = useMemo(() => buildCustomerSummaries(orders), [orders]);
  const activeProducts = useMemo(() => getActiveProducts(products), [products]);
  const lowStockProducts = useMemo(() => getLowStockProducts(products), [products]);
  const totalInventory = useMemo(() => getTotalInventory(products), [products]);
  const grossRevenue = useMemo(() => orders.reduce((sum, order) => sum + order.totalAmount, 0), [orders]);
  const averageOrderValue = useMemo(() => (orders.length > 0 ? grossRevenue / orders.length : 0), [grossRevenue, orders.length]);
  const recentWindow = useMemo(() => splitOrdersByRecentWindow(orders), [orders]);
  const revenueDelta = useMemo(() => {
    const current = recentWindow.current.reduce((sum, order) => sum + order.totalAmount, 0);
    const previous = recentWindow.previous.reduce((sum, order) => sum + order.totalAmount, 0);
    return calculatePercentageChange(current, previous);
  }, [recentWindow]);
  const orderDelta = useMemo(() => calculatePercentageChange(recentWindow.current.length, recentWindow.previous.length), [recentWindow]);
  const repeatRate = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    return (customers.filter((customer) => customer.ordersCount > 1).length / customers.length) * 100;
  }, [customers]);
  const statusSummaries = useMemo(() => {
    return statusOrder.map((status) => {
      const count = orders.filter((order) => order.status === status).length;
      return {
        status,
        count,
        ratio: orders.length > 0 ? (count / orders.length) * 100 : 0,
      };
    });
  }, [orders]);
  const categorySummaries = useMemo(() => {
    const grouped = new Map<string, { activeCount: number; name: string; productCount: number; units: number }>();

    for (const product of products) {
      const entry = grouped.get(product.categoryCode) ?? {
        name: product.categoryName,
        productCount: 0,
        activeCount: 0,
        units: 0,
      };
      entry.productCount += 1;
      entry.units += product.stockQuantity;
      if (product.active) {
        entry.activeCount += 1;
      }
      grouped.set(product.categoryCode, entry);
    }

    return [...grouped.entries()]
      .map(([code, entry]) => ({ code, ...entry }))
      .sort((left, right) => right.productCount - left.productCount)
      .slice(0, 5);
  }, [products]);
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const topCustomers = useMemo(() => customers.slice(0, 5), [customers]);
  const monthlyRevenue = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const points = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - offset), 1);
      date.setHours(0, 0, 0, 0);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: monthFormatter.format(date), value: 0 };
    });

    for (const order of orders) {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const point = points.find((candidate) => candidate.key === key);
      if (point && order.status !== 'FAILED' && order.status !== 'CANCELLED') {
        point.value += order.totalAmount;
      }
    }

    const max = Math.max(...points.map((point) => point.value), 1);
    return points.map((point) => ({ ...point, height: `${Math.max(12, (point.value / max) * 100)}%` }));
  }, [orders]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Commerce overview"
        title="Run trading, fulfillment, and catalog decisions from one workspace"
        description="The overview is oriented around what operators actually need: revenue movement, order-state mix, stock pressure, customer concentration, and the next queue of issues to handle."
        action={<Link to="/orders" className="backoffice-button-primary">Open order queue</Link>}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricTile label="Gross sales" value={formatCompactCurrency(grossRevenue)} note={`${formatDelta(revenueDelta)} vs previous 30 days`} />
        <MetricTile label="Orders captured" value={formatNumber(orders.length)} note={`${formatDelta(orderDelta)} in order volume`} />
        <MetricTile label="Average order value" value={formatCurrency(averageOrderValue)} note={`${formatNumber(customers.length)} unique buying customers`} />
        <MetricTile label="Inventory available" value={formatNumber(totalInventory)} note={`${formatNumber(lowStockProducts.length)} active SKUs under threshold`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Revenue pulse</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Recent confirmed demand</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <StatusPill tone="info">6-month view</StatusPill>
              <span>Confirmed and created orders only</span>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid h-[260px] grid-cols-6 items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              {monthlyRevenue.map((point) => (
                <div key={point.key} className="flex h-full flex-col justify-end gap-3">
                  <div className="text-[11px] font-semibold text-slate-500">{point.value > 0 ? formatCompactCurrency(point.value) : '$0'}</div>
                  <div className="relative flex-1 rounded-xl bg-white">
                    <div className="absolute inset-x-2 bottom-2 rounded-xl bg-slate-900" style={{ height: point.height }} />
                  </div>
                  <div className="text-center text-[12px] font-semibold text-slate-600">{point.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <CompactInsight label="Sellable catalog" value={formatNumber(activeProducts.length)} note={`${formatPercent(products.length > 0 ? (activeProducts.length / products.length) * 100 : 0, 0)} of all products active`} />
              <CompactInsight label="Repeat customer rate" value={formatPercent(repeatRate, 0)} note="Customers with more than one order" />
              <CompactInsight label="Low-stock products" value={formatNumber(lowStockProducts.length)} note="Active products at or below 10 units" />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Attention queue</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Immediate operating pressure</h2>
          </div>
          <div className="grid gap-3 px-5 py-5">
            <AttentionItem tone="rose" title="Failed orders" value={formatNumber(orders.filter((order) => order.status === 'FAILED').length)} note="Orders requiring investigation or retry support." />
            <AttentionItem tone="amber" title="Created not confirmed" value={formatNumber(orders.filter((order) => order.status === 'CREATED').length)} note="New orders still pending downstream completion." />
            <AttentionItem tone="blue" title="Low-stock SKUs" value={formatNumber(lowStockProducts.length)} note="Catalog items approaching stock exhaustion." />
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Recent orders</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Latest queue movement</h2>
            </div>
            <Link to="/orders" className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4">View all</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`} className="font-semibold text-slate-950">#{order.id}</Link>
                    </td>
                    <td>
                      <div className="font-medium text-slate-950">{order.customerName}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{order.customerEmail}</div>
                    </td>
                    <td className="font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</td>
                    <td><StatusPill tone={orderStatusTone(order.status)}>{formatStatus(order.status)}</StatusPill></td>
                    <td>{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Customer concentration</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Top buyers</h2>
          </div>
          <div className="grid gap-3 px-5 py-5">
            {topCustomers.map((customer) => (
              <div key={customer.customerEmail} className="backoffice-surface-muted px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{customer.customerName}</div>
                    <div className="mt-1 text-[12px] text-slate-500">{customer.customerEmail}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-950">{formatCurrency(customer.lifetimeValue)}</div>
                    <div className="mt-1 text-[12px] text-slate-500">{customer.ordersCount} order(s)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Order-state mix</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Fulfillment health</h2>
          </div>
          <div className="grid gap-4 px-5 py-5">
            {statusSummaries.map((summary) => (
              <div key={summary.status}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-950">{formatStatus(summary.status)}</span>
                    <StatusPill tone={orderStatusTone(summary.status)}>{formatNumber(summary.count)}</StatusPill>
                  </div>
                  <span className="text-slate-500">{formatPercent(summary.ratio, 0)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(summary.ratio, summary.count > 0 ? 6 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Category footprint</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Catalog concentration</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Products</th>
                  <th>Active</th>
                  <th>Units</th>
                </tr>
              </thead>
              <tbody>
                {categorySummaries.map((category) => (
                  <tr key={category.code}>
                    <td>
                      <div className="font-semibold text-slate-950">{category.name}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{category.code}</div>
                    </td>
                    <td>{formatNumber(category.productCount)}</td>
                    <td>{formatNumber(category.activeCount)}</td>
                    <td className="font-semibold text-slate-950">{formatNumber(category.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}

interface MetricTileProps {
  label: string;
  note: string;
  value: string;
}

function MetricTile({ label, note, value }: MetricTileProps) {
  return (
    <div className="metric-tile">
      <div className="metric-kicker">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

interface CompactInsightProps {
  label: string;
  note: string;
  value: string;
}

function CompactInsight({ label, note, value }: CompactInsightProps) {
  return (
    <div className="backoffice-surface-muted px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-[12px] text-slate-500">{note}</div>
    </div>
  );
}

interface AttentionItemProps {
  note: string;
  title: string;
  tone: 'amber' | 'blue' | 'rose';
  value: string;
}

function AttentionItem({ note, title, tone, value }: AttentionItemProps) {
  const toneClasses = {
    amber: 'bg-amber-500/10 text-amber-700',
    blue: 'bg-blue-500/10 text-blue-700',
    rose: 'bg-rose-500/10 text-rose-700',
  };

  return (
    <div className="backoffice-surface-muted px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-[12px] leading-6 text-slate-500">{note}</div>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${toneClasses[tone]}`}>{value}</span>
      </div>
    </div>
  );
}

function formatDelta(value: number) {
  const direction = value >= 0 ? '+' : '-';
  return `${direction}${formatPercent(Math.abs(value), 1)}`;
}
