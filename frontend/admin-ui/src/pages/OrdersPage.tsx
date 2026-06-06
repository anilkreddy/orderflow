import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDateTime, formatNumber, formatPercent, formatStatus, orderStatusTone } from '../lib/format';
import type { Order, OrderStatus } from '../types';

const statusOptions: Array<{ label: string; value: OrderStatus | 'ALL' }> = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Created', value: 'CREATED' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const orderData = await orderApi.list();
        setOrders(orderData.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()));
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load orders'));
      }
    }

    void load();
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = status === 'ALL' || order.status === status;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        order.customerName.toLowerCase().includes(normalizedQuery) ||
        order.customerEmail.toLowerCase().includes(normalizedQuery) ||
        String(order.id).includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [orders, query, status]);

  const confirmedRate = useMemo(() => {
    if (orders.length === 0) {
      return 0;
    }

    return (orders.filter((order) => order.status === 'CONFIRMED').length / orders.length) * 100;
  }, [orders]);

  const failedCount = useMemo(() => orders.filter((order) => order.status === 'FAILED').length, [orders]);
  const averageBasket = useMemo(() => {
    if (orders.length === 0) {
      return 0;
    }

    return orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length;
  }, [orders]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Orders"
        title="Review queue health and order flow performance"
        description="Use this queue to inspect live orders, filter by status, and jump into the individual order detail view when support or operational review is needed."
      />

      {error ? <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Total orders" value={formatNumber(orders.length)} />
        <MiniStat label="Confirmed rate" value={formatPercent(confirmedRate, 0)} />
        <MiniStat label="Average basket" value={formatCurrency(averageBasket)} />
        <MiniStat label="Failed orders" value={formatNumber(failedCount)} />
      </div>

      <AdminPanel className="p-0 overflow-hidden">
        <div className="grid gap-4 border-b border-slate-200 px-6 py-5 xl:grid-cols-[1fr_220px_220px] xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Queue filters</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Find the order you need fast</h2>
          </div>
          <label className="text-sm font-medium text-slate-600">
            Search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order id, name, or email"
              className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as OrderStatus | 'ALL')}
              className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="text-slate-600">
                  <td className="px-6 py-4 font-semibold text-slate-950">#{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-950">{order.customerName}</div>
                    <div className="mt-1 text-slate-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-6 py-4">{order.items.length}</td>
                  <td className="px-6 py-4">
                    <StatusPill tone={orderStatusTone(order.status)}>{formatStatus(order.status)}</StatusPill>
                  </td>
                  <td className="px-6 py-4">{formatDateTime(order.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/orders/${order.id}`} className="font-semibold text-[#2558f5] underline decoration-slate-300 underline-offset-4">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
}

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="dashboard-card rounded-[22px] px-5 py-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}
