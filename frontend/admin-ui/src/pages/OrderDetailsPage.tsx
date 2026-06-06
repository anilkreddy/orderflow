import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDateTime, formatStatus, orderStatusTone } from '../lib/format';
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

  if (error) {
    return <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!order) {
    return <div className="dashboard-card rounded-[24px] px-5 py-5 text-sm text-slate-600">Loading order details...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Order detail"
        title={`Order #${order.id}`}
        description="Review customer context, order value, line items, and the current backend status from a single operational view."
        action={<Link to="/orders" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Back to orders</Link>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Status" value={formatStatus(order.status)} extra={<StatusPill tone={orderStatusTone(order.status)}>{formatStatus(order.status)}</StatusPill>} />
        <SummaryCard label="Order total" value={formatCurrency(order.totalAmount)} />
        <SummaryCard label="Line items" value={`${order.items.length}`} />
        <SummaryCard label="Placed" value={formatDateTime(order.createdAt)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Customer</p>
          <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-lg font-semibold text-slate-950">{order.customerName}</div>
            <div className="mt-1 text-sm text-slate-500">{order.customerEmail}</div>
          </div>

          <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
            Order status mutation is not exposed by the backend yet, so this page focuses on visibility and support review rather than direct workflow overrides.
          </div>
        </AdminPanel>

        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Line items</p>
          <div className="mt-5 grid gap-4">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{item.productName}</div>
                    <div className="mt-1 text-sm text-slate-500">Product #{item.productId}</div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>Qty {item.quantity}</div>
                    <div className="mt-2 font-semibold text-slate-950">{formatCurrency(item.unitPrice * item.quantity)}</div>
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

interface SummaryCardProps {
  extra?: ReactNode;
  label: string;
  value: string;
}

function SummaryCard({ extra, label, value }: SummaryCardProps) {
  return (
    <div className="dashboard-card rounded-[22px] px-5 py-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{value}</div>
      {extra ? <div className="mt-3">{extra}</div> : null}
    </div>
  );
}
