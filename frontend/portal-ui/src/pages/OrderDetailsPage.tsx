import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingPanel } from '../components/LoadingPanel';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { secondaryButtonClass } from '../lib/ui';
import type { Order } from '../types';

export function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const orderId = id;

    async function loadOrder() {
      try {
        const data = await orderApi.get(orderId);
        setOrder(data);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load order details'));
      } finally {
        setLoading(false);
      }
    }

    void loadOrder();
  }, [id]);

  if (loading) {
    return <LoadingPanel message="Loading order details..." />;
  }

  if (!order) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error ?? 'Order not found'}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Order Detail"
        title={`Order #${order.id}`}
        description="Trace the customer request, the reserved line items, and the downstream event handoff in one operational view."
        action={<Link to="/orders" className={secondaryButtonClass}>Back to queue</Link>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Customer</p>
            <StatusPill status={order.status} />
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold text-slate-950">{order.customerName}</h2>
            <p className="mt-2 text-sm text-slate-600">{order.customerEmail}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Created</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(order.createdAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Line Items</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{order.items.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Downstream Handoff</p>
          <h2 className="font-display text-2xl font-semibold text-slate-950">Operational notes</h2>
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              Order persisted with status <strong className="text-slate-900">{order.status}</strong>.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              The order service publishes <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">order.created</code> after persistence.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              Notification processing is currently simulated via service logs for the target customer email.
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="border-b border-slate-200 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Reserved Inventory</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-slate-950">Line item breakdown</h2>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="ops-table min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Quantity</th>
                <th className="px-3 py-2 text-left">Unit Price</th>
                <th className="px-3 py-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="rounded-2xl bg-slate-50">
                  <td className="rounded-l-2xl px-3 py-4">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">SKU #{item.productId}</div>
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-4 text-sm text-slate-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="rounded-r-2xl px-3 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(item.unitPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
