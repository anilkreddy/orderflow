import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingPanel } from '../components/LoadingPanel';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { StatCard } from '../components/StatCard';
import { StatusPill } from '../components/StatusPill';
import { orderApi, productApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { primaryButtonClass, secondaryButtonClass } from '../lib/ui';
import type { Order, Product } from '../types';

export function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [orderData, productData] = await Promise.all([orderApi.list(), productApi.list()]);
        setOrders(orderData);
        setProducts(productData);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load operations overview'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const metrics = useMemo(() => {
    const confirmed = orders.filter((order) => order.status === 'CONFIRMED').length;
    const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const lowStock = products.filter((product) => product.active && product.stockQuantity <= 10).length;
    return { confirmed, revenue, lowStock };
  }, [orders, products]);

  const recentOrders = [...orders]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);

  const watchlist = [...products]
    .filter((product) => product.active)
    .sort((left, right) => left.stockQuantity - right.stockQuantity)
    .slice(0, 5);

  if (loading) {
    return <LoadingPanel message="Loading operations overview..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations Overview"
        title="Order Intake And Fulfillment"
        description="Monitor the live order queue, inventory pressure, and the operational handoff between gateway, catalog, and order workflows."
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/orders/new" className={primaryButtonClass}>
              Create order
            </Link>
            <Link to="/catalog" className={secondaryButtonClass}>
              Review catalog
            </Link>
          </div>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard label="Orders" value={orders.length} hint="Total orders recorded" accent="slate" />
        <StatCard label="Confirmed" value={metrics.confirmed} hint="Orders reserved successfully" accent="teal" />
        <StatCard label="Revenue" value={formatCurrency(metrics.revenue)} hint="Gross booked amount" accent="amber" />
        <StatCard label="Low Stock" value={metrics.lowStock} hint="Active SKUs at or below 10 units" accent="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Fulfillment Queue</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-slate-950">Recent order activity</h2>
            </div>
            <Link to="/orders" className={secondaryButtonClass}>Open queue</Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="ops-table min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">Order</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="rounded-2xl bg-slate-50">
                    <td className="rounded-l-2xl px-3 py-4 text-sm font-semibold text-slate-900">#{order.id}</td>
                    <td className="px-3 py-4 text-sm text-slate-600">
                      <div>{order.customerName}</div>
                      <div className="mt-1 text-xs text-slate-500">{order.customerEmail}</div>
                    </td>
                    <td className="px-3 py-4"><StatusPill status={order.status} /></td>
                    <td className="px-3 py-4 text-sm text-slate-600">{formatDate(order.createdAt)}</td>
                    <td className="rounded-r-2xl px-3 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <div className="border-b border-slate-200 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Inventory Watch</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-slate-950">Stock pressure</h2>
            </div>
            <div className="mt-4 space-y-3">
              {watchlist.map((product) => (
                <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">SKU #{product.id}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${product.stockQuantity <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {product.stockQuantity} units
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <span>{formatCurrency(product.price)}</span>
                    <Link to={`/catalog/${product.id}/edit`} className="font-semibold text-teal-700">Review SKU</Link>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Service Posture</p>
            <div className="mt-4 grid gap-3">
              {[
                ['Gateway', 'Routes portal traffic into the order and product domains.'],
                ['Order Service', 'Persists orders, reserves stock, and publishes order.created.'],
                ['Notification Service', 'Consumes Kafka events and simulates outbound confirmation.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    {title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
