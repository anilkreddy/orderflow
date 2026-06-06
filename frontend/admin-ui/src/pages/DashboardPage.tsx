import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminMetric } from '../components/AdminMetric';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StackedBarChart } from '../components/StackedBarChart';
import { StatusPill } from '../components/StatusPill';
import { ProgressRing } from '../components/ProgressRing';
import { orderApi, productApi, toApiMessage } from '../lib/api';
import { buildCustomerSummaries } from '../lib/customers';
import { buildMonthlyStatusRevenueChart, calculatePercentageChange, getActiveProducts, getLowStockProducts, getTotalInventory, splitOrdersByRecentWindow } from '../lib/dashboard';
import { formatCompactCurrency, formatCurrency, formatDateTime, formatNumber, formatPercent, formatStatus, orderStatusTone } from '../lib/format';
import type { Order, Product } from '../types';

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
        setError(toApiMessage(loadError, 'Unable to load backoffice overview'));
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
  const repeatCustomerRate = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    return (customers.filter((customer) => customer.ordersCount > 1).length / customers.length) * 100;
  }, [customers]);
  const inStockRate = useMemo(() => {
    if (activeProducts.length === 0) {
      return 0;
    }

    return (activeProducts.filter((product) => product.stockQuantity > 0).length / activeProducts.length) * 100;
  }, [activeProducts]);
  const chartData = useMemo(() => buildMonthlyStatusRevenueChart(orders), [orders]);
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const topCustomers = useMemo(() => customers.slice(0, 5), [customers]);
  const revenueWindow = useMemo(() => splitOrdersByRecentWindow(orders), [orders]);
  const revenueChange = useMemo(() => {
    const current = revenueWindow.current.reduce((sum, order) => sum + order.totalAmount, 0);
    const previous = revenueWindow.previous.reduce((sum, order) => sum + order.totalAmount, 0);
    return calculatePercentageChange(current, previous);
  }, [revenueWindow]);
  const orderChange = useMemo(
    () => calculatePercentageChange(revenueWindow.current.length, revenueWindow.previous.length),
    [revenueWindow],
  );
  const activeProductRate = useMemo(() => {
    if (products.length === 0) {
      return 0;
    }

    return (activeProducts.length / products.length) * 100;
  }, [activeProducts.length, products.length]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Ecommerce command center"
        title="Track revenue, inventory, and customer activity in one place"
        description="This dashboard is fed from the live order and product services, so the numbers below reflect the same data your storefront and backoffice workflows are using."
        action={<Link to="/orders" className="inline-flex items-center rounded-full bg-[#2558f5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1947db]">Review live orders</Link>}
      />

      {error ? <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <AdminMetric
          caption="vs previous 30 days"
          progress={Math.min(100, Math.max(22, Math.abs(revenueChange)))}
          progressColor="#2558f5"
          progressTrackColor="#dbe7ff"
          title="Gross revenue"
          trend={formatPercent(Math.abs(revenueChange), 1)}
          trendTone={revenueChange >= 0 ? 'success' : 'danger'}
          value={formatCompactCurrency(grossRevenue)}
        />
        <AdminMetric
          caption="order volume trend"
          progress={Math.min(100, Math.max(18, Math.abs(orderChange)))}
          progressColor="#4f46e5"
          progressTrackColor="#dde0ff"
          title="Orders processed"
          trend={formatPercent(Math.abs(orderChange), 1)}
          trendTone={orderChange >= 0 ? 'success' : 'danger'}
          value={formatNumber(orders.length)}
        />
        <AdminMetric
          caption="customers with 2+ orders"
          progress={repeatCustomerRate}
          progressColor="#059669"
          progressTrackColor="#d1fae5"
          title="Repeat customer rate"
          trend={formatPercent(repeatCustomerRate, 0)}
          trendTone="success"
          value={formatNumber(customers.length)}
        />
        <AdminMetric
          caption="active products vs full catalog"
          progress={activeProductRate}
          progressColor="#f59e0b"
          progressTrackColor="#fef3c7"
          title="Sellable catalog"
          trend={formatPercent(activeProductRate, 0)}
          trendTone="success"
          value={formatNumber(activeProducts.length)}
        />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.45fr_0.75fr]">
        <AdminPanel className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Monthly order revenue mix</p>
              <h2 className="mt-2 text-[1.75rem] font-extrabold tracking-tight text-slate-950">Revenue by order state</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
                <span className="text-4xl font-extrabold tracking-tight text-slate-950">{formatCompactCurrency(grossRevenue)}</span>
                <span className={revenueChange >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                  {revenueChange >= 0 ? '↗' : '↘'} {formatPercent(Math.abs(revenueChange), 1)}
                </span>
                <span className="text-slate-500">compared with the previous 30-day window</span>
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:min-w-[240px]">
              <SnapshotCard label="Average order value" value={formatCurrency(averageOrderValue)} />
              <SnapshotCard label="Total inventory units" value={formatNumber(totalInventory)} />
            </div>
          </div>

          <div className="mt-6">
            <StackedBarChart data={chartData} />
          </div>
        </AdminPanel>

        <AdminPanel className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Inventory availability</p>
          <h2 className="mt-2 text-[1.75rem] font-extrabold tracking-tight text-slate-950">Sell-through readiness</h2>

          <div className="mt-5 flex justify-center">
            <ProgressRing color="#1d6de8" size={220} strokeWidth={16} trackColor="#dbeafe" value={inStockRate}>
              <div className="text-center">
                <div className="text-5xl font-extrabold tracking-tight text-slate-950">{Math.round(inStockRate)}%</div>
                <div className="mt-1.5 text-[13px] font-medium text-slate-500">In-stock active products</div>
              </div>
            </ProgressRing>
          </div>

          <div className="mt-6 space-y-3.5 text-[13px] text-slate-600">
            <InventoryLine label="Available SKUs" value={`${activeProducts.filter((product) => product.stockQuantity > 0).length}`} />
            <InventoryLine label="Low-stock SKUs" value={`${lowStockProducts.length}`} />
            <InventoryLine label="Inactive products" value={`${products.length - activeProducts.length}`} />
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Recent orders</p>
              <h2 className="mt-1.5 text-[1.45rem] font-extrabold tracking-tight text-slate-950">Queue requiring attention</h2>
            </div>
            <Link to="/orders" className="text-[13px] font-semibold text-[#2558f5] underline decoration-slate-300 underline-offset-4">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Value</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="text-slate-600">
                    <td className="px-5 py-3.5">
                      <Link to={`/orders/${order.id}`} className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4">#{order.id}</Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-950">{order.customerName}</div>
                      <div className="mt-1 text-slate-500">{order.customerEmail}</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <StatusPill tone={orderStatusTone(order.status)}>{formatStatus(order.status)}</StatusPill>
                    </td>
                    <td className="px-5 py-3.5">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Customer intelligence</p>
              <h2 className="mt-1.5 text-[1.45rem] font-extrabold tracking-tight text-slate-950">Top customers by value</h2>
            </div>
            <Link to="/customers" className="text-[13px] font-semibold text-[#2558f5] underline decoration-slate-300 underline-offset-4">Open CRM view</Link>
          </div>

          <div className="mt-5 grid gap-3">
            {topCustomers.map((customer) => (
              <div key={customer.customerEmail} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{customer.customerName}</div>
                    <div className="mt-1 text-[13px] text-slate-500">{customer.customerEmail}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-950">{formatCurrency(customer.lifetimeValue)}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{customer.ordersCount} order(s)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}

interface SnapshotCardProps {
  label: string;
  value: string;
}

function SnapshotCard({ label, value }: SnapshotCardProps) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3.5 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2.5 text-lg font-bold text-slate-950">{value}</div>
    </div>
  );
}

interface InventoryLineProps {
  label: string;
  value: string;
}

function InventoryLine({ label, value }: InventoryLineProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <span className="text-base font-bold text-slate-950">{value}</span>
    </div>
  );
}
