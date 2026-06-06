import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDateTime, formatNumber, formatStatus, orderStatusTone } from '../lib/format';
import type { Order } from '../types';

export function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) {
        setError('Missing order id');
        return;
      }

      try {
        setOrder(await orderApi.get(Number(id)));
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load order details'));
      }
    }

    void load();
  }, [id]);

  const totalUnits = useMemo(() => order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0, [order]);

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!order) {
    return <div className="backoffice-surface px-5 py-5 text-sm text-slate-600">Loading order detail...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Order detail"
        title={`Review order #${order.id}`}
        description="Inspect customer context, line-level value, and fulfillment state from one operational detail page. This is intentionally structured as a support and operations view rather than a shopper receipt."
        action={<Link to="/orders" className="backoffice-button-secondary">Back to orders</Link>}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricSummary label="Status" value={formatStatus(order.status)} note="Current backend lifecycle state" badge={<StatusPill tone={orderStatusTone(order.status)}>{formatStatus(order.status)}</StatusPill>} />
        <MetricSummary label="Order total" value={formatCurrency(order.totalAmount)} note="Captured basket value" />
        <MetricSummary label="Units ordered" value={formatNumber(totalUnits)} note={`${order.items.length} line items`} />
        <MetricSummary label="Placed at" value={formatDateTime(order.createdAt)} note="Creation timestamp" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Line items</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Purchased products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Product id</th>
                  <th>Unit price</th>
                  <th>Quantity</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-semibold text-slate-950">{item.productName}</div>
                    </td>
                    <td>{formatNumber(item.productId)}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatNumber(item.quantity)}</td>
                    <td className="font-semibold text-slate-950">{formatCurrency(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Customer</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Buyer context</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              <div className="backoffice-surface-muted px-4 py-4">
                <div className="font-semibold text-slate-950">{order.customerName}</div>
                <div className="mt-1 text-[12px] text-slate-500">{order.customerEmail}</div>
              </div>
              <div className="backoffice-surface-muted px-4 py-4 text-sm leading-6 text-slate-600">
                Customer management is still order-derived in the current system, so this view prioritizes operational visibility instead of editable CRM fields.
              </div>
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Operational notes</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Workflow constraints</h2>
            </div>
            <div className="grid gap-3 px-5 py-5 text-sm leading-6 text-slate-600">
              <div className="backoffice-surface-muted px-4 py-4">Order state mutation is not exposed by the backend yet, so this screen is read-only for operators.</div>
              <div className="backoffice-surface-muted px-4 py-4">Reservation and order confirmation were handled upstream during order creation.</div>
              <div className="backoffice-surface-muted px-4 py-4">Notification delivery is logged by `notification-service` after `order.created` is consumed.</div>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

interface MetricSummaryProps {
  badge?: React.ReactNode;
  label: string;
  note: string;
  value: string;
}

function MetricSummary({ badge, label, note, value }: MetricSummaryProps) {
  return (
    <div className="metric-tile">
      <div className="metric-kicker">{label}</div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="font-display text-2xl font-semibold text-slate-950">{value}</div>
        {badge}
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
