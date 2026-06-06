import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { StatCard } from '../components/StatCard';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { inputClass, primaryButtonClass } from '../lib/ui';
import type { Order } from '../types';

export function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | Order['status']>('ALL');

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await orderApi.list();
        setOrders(data);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load orders'));
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    return sortedOrders.filter((order) => {
      const matchesStatus = status === 'ALL' || order.status === status;
      const target = `${order.id} ${order.customerName} ${order.customerEmail}`.toLowerCase();
      const matchesSearch = target.includes(search.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [search, sortedOrders, status]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      confirmed: orders.filter((order) => order.status === 'CONFIRMED').length,
      created: orders.filter((order) => order.status === 'CREATED').length,
      failed: orders.filter((order) => order.status === 'FAILED').length,
    };
  }, [orders]);

  if (loading) {
    return <LoadingPanel message="Loading order queue..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Order Queue"
        title="Fulfillment Workbench"
        description="Triage incoming orders, inspect customer details, and follow the state transition from reservation through confirmation."
        action={
          <Link to="/orders/new" className={primaryButtonClass}>
            New manual order
          </Link>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="All Orders" value={stats.total} hint="Orders recorded in the service" accent="slate" />
        <StatCard label="Confirmed" value={stats.confirmed} hint="Ready for downstream confirmation" accent="teal" />
        <StatCard label="Created" value={stats.created} hint="Still awaiting later workflow expansion" accent="amber" />
        <StatCard label="Failed" value={stats.failed} hint="Orders requiring intervention" accent="rose" />
      </div>

      <Panel className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Search by customer or order number
            <span className="field-shell rounded-2xl">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Search queue" />
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Status
            <span className="field-shell rounded-2xl">
              <select value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | Order['status'])} className={inputClass}>
                <option value="ALL">All statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CREATED">Created</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </span>
          </label>
        </div>
      </Panel>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders match the current filters"
          description="Adjust the queue filters or create a new order to continue testing the reservation and event workflow."
          action={<Link to="/orders/new" className={primaryButtonClass}>Create order</Link>}
        />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="ops-table min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">Order</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Items</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="rounded-2xl bg-slate-50">
                    <td className="rounded-l-2xl px-3 py-4 text-sm font-semibold text-slate-900">
                      <Link to={`/orders/${order.id}`} className="hover:text-teal-700">#{order.id}</Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">
                      <div className="font-medium text-slate-900">{order.customerName}</div>
                      <div className="mt-1 text-xs text-slate-500">{order.customerEmail}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">{order.items.length} line item(s)</td>
                    <td className="px-3 py-4"><StatusPill status={order.status} /></td>
                    <td className="px-3 py-4 text-sm text-slate-600">{formatDate(order.createdAt)}</td>
                    <td className="rounded-r-2xl px-3 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
