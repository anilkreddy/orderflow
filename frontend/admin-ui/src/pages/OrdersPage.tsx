import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { formatCompactCurrency, formatCurrency, formatDateTime, formatNumber, formatPercent, formatStatus, orderStatusTone } from '../lib/format';
import type { Order, OrderStatus } from '../types';

const statusTabs: Array<{ label: string; value: OrderStatus | 'ALL' }> = [
  { label: 'All orders', value: 'ALL' },
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
        String(order.id).includes(normalizedQuery) ||
        order.orderCode.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [orders, query, status]);

  const confirmedCount = useMemo(() => orders.filter((order) => order.status === 'CONFIRMED').length, [orders]);
  const failedCount = useMemo(() => orders.filter((order) => order.status === 'FAILED').length, [orders]);
  const createdCount = useMemo(() => orders.filter((order) => order.status === 'CREATED').length, [orders]);
  const confirmedRate = useMemo(() => (orders.length > 0 ? (confirmedCount / orders.length) * 100 : 0), [confirmedCount, orders.length]);
  const averageBasket = useMemo(() => {
    if (orders.length === 0) {
      return 0;
    }

    return orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length;
  }, [orders]);
  const recentExceptions = useMemo(() => orders.filter((order) => order.status === 'FAILED' || order.status === 'CANCELLED').slice(0, 5), [orders]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Orders"
        title="Monitor the queue with fulfillment-first controls"
        description="The order index is designed for support and operations teams: status views, searchable customer context, dense row data, and a clear split between healthy throughput and exceptions."
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricSummary label="Orders" value={formatNumber(orders.length)} note="All captured orders" />
        <MetricSummary label="Confirmed rate" value={formatPercent(confirmedRate, 0)} note={`${formatNumber(confirmedCount)} confirmed successfully`} />
        <MetricSummary label="Average basket" value={formatCurrency(averageBasket)} note="Average order total" />
        <MetricSummary label="Exceptions" value={formatNumber(failedCount)} note={`${formatNumber(createdCount)} still in created state`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => (
                  <button key={tab.value} type="button" onClick={() => setStatus(tab.value)} className={`resource-tab ${status === tab.value ? 'is-active' : ''}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search order code, internal id, customer name, or email"
                className="backoffice-search min-w-[280px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-sm text-slate-500">
            <div>{formatNumber(filteredOrders.length)} orders in view</div>
            <div>{formatCompactCurrency(filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0))} total visible value</div>
          </div>

          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="font-semibold text-slate-950">{order.orderCode}</div>
                      <div className="mt-1 text-[12px] text-slate-500">Internal #{order.id} · {order.items.length} line item(s)</div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-950">{order.customerName}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{order.customerEmail}</div>
                    </td>
                    <td>{formatNumber(order.items.reduce((sum, item) => sum + item.quantity, 0))}</td>
                    <td className="font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</td>
                    <td><StatusPill tone={orderStatusTone(order.status)}>{formatStatus(order.status)}</StatusPill></td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>
                      <Link to={`/orders/${order.id}`} className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Queue summary</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Operational mix</h2>
            </div>
            <div className="grid gap-4 px-5 py-5">
              {statusTabs
                .filter((tab) => tab.value !== 'ALL')
                .map((tab) => {
                  const count = orders.filter((order) => order.status === tab.value).length;
                  const ratio = orders.length > 0 ? (count / orders.length) * 100 : 0;
                  return (
                    <div key={tab.value}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-950">{tab.label}</span>
                        <span className="text-slate-500">{formatNumber(count)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(ratio, count > 0 ? 6 : 0)}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Exception watch</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Recent failures and cancellations</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              {recentExceptions.length === 0 ? (
                <div className="text-sm text-slate-500">No exceptions in the current order history.</div>
              ) : (
                recentExceptions.map((order) => (
                  <div key={order.id} className="backoffice-surface-muted px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{order.orderCode}</div>
                        <div className="mt-1 text-[12px] text-slate-500">{order.customerName}</div>
                      </div>
                      <StatusPill tone={orderStatusTone(order.status)}>{formatStatus(order.status)}</StatusPill>
                    </div>
                    <div className="mt-3 text-[12px] text-slate-500">{formatDateTime(order.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

interface MetricSummaryProps {
  label: string;
  note: string;
  value: string;
}

function MetricSummary({ label, note, value }: MetricSummaryProps) {
  return (
    <div className="metric-tile">
      <div className="metric-kicker">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
