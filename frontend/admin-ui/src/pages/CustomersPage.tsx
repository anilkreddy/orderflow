import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { buildCustomerSummaries } from '../lib/customers';
import { customerTier, formatCurrency, formatDateTime, formatNumber, formatPercent, formatStatus, orderStatusTone } from '../lib/format';
import type { CustomerSummary, Order } from '../types';

const customerTabs = ['ALL', 'Priority', 'Growth', 'New'] as const;
type CustomerFilter = (typeof customerTabs)[number];

export function CustomersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setOrders(await orderApi.list());
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load customers'));
      }
    }

    void load();
  }, []);

  const customers = useMemo(() => buildCustomerSummaries(orders), [orders]);
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const tier = customerTier(customer);
      const matchesFilter = filter === 'ALL' || tier === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        customer.customerName.toLowerCase().includes(normalizedQuery) ||
        customer.customerEmail.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [customers, filter, query]);

  const repeatRate = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    return (customers.filter((customer) => customer.ordersCount > 1).length / customers.length) * 100;
  }, [customers]);
  const averageCustomerValue = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    return customers.reduce((sum, customer) => sum + customer.lifetimeValue, 0) / customers.length;
  }, [customers]);
  const topTierCustomers = useMemo(() => customers.filter((customer) => customerTier(customer) === 'Priority'), [customers]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Customers"
        title="Review buyer value, recency, and support context"
        description="Customer records are still derived from the order stream, but the workspace is laid out like a real CRM index so it can absorb first-party customer data later without redesigning the operating model."
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricSummary label="Customer records" value={formatNumber(customers.length)} note="Unique buyer emails" />
        <MetricSummary label="Repeat rate" value={formatPercent(repeatRate, 0)} note="More than one order" />
        <MetricSummary label="Average LTV" value={formatCurrency(averageCustomerValue)} note="Across all visible customers" />
        <MetricSummary label="Priority accounts" value={formatNumber(topTierCustomers.length)} note="High-value or high-frequency buyers" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {customerTabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => setFilter(tab)} className={`resource-tab ${filter === tab ? 'is-active' : ''}`}>
                    {tab === 'ALL' ? 'All customers' : tab}
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or email"
                className="backoffice-search min-w-[280px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-sm text-slate-500">
            <div>{formatNumber(filteredCustomers.length)} customers in view</div>
            <div>{formatCurrency(filteredCustomers.reduce((sum, customer) => sum + customer.lifetimeValue, 0))} visible lifetime value</div>
          </div>

          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Tier</th>
                  <th>Orders</th>
                  <th>Lifetime value</th>
                  <th>Latest order</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const tier = customerTier(customer);
                  const tone = tier === 'Priority' ? 'success' : tier === 'Growth' ? 'warning' : 'muted';

                  return (
                    <tr key={customer.customerEmail}>
                      <td>
                        <div className="font-semibold text-slate-950">{customer.customerName}</div>
                        <div className="mt-1 text-[12px] text-slate-500">{customer.customerEmail}</div>
                      </td>
                      <td><StatusPill tone={tone}>{tier}</StatusPill></td>
                      <td>{formatNumber(customer.ordersCount)}</td>
                      <td className="font-semibold text-slate-950">{formatCurrency(customer.lifetimeValue)}</td>
                      <td>
                        <div className="text-[12px] text-slate-500">{formatDateTime(customer.lastOrderAt)}</div>
                        <div className="mt-1 font-medium text-slate-950">{customer.latestOrderCode}</div>
                        <div className="mt-2"><StatusPill tone={orderStatusTone(customer.lastOrderStatus)}>{formatStatus(customer.lastOrderStatus)}</StatusPill></div>
                      </td>
                      <td>
                        <Link to={`/orders/${customer.latestOrderId}`} className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4">Latest order</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Segments</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Customer tier split</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              {(['Priority', 'Growth', 'New'] as const).map((tier) => {
                const count = customers.filter((customer) => customerTier(customer) === tier).length;
                const ratio = customers.length > 0 ? (count / customers.length) * 100 : 0;
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-950">{tier}</span>
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">High-value buyers</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Priority accounts</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              {topTierCustomers.slice(0, 5).map((customer) => (
                <PriorityCustomerCard key={customer.customerEmail} customer={customer} />
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

function PriorityCustomerCard({ customer }: { customer: CustomerSummary }) {
  return (
    <div className="backoffice-surface-muted px-4 py-4">
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
