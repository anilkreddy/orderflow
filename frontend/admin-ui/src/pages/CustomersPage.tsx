import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, toApiMessage } from '../lib/api';
import { buildCustomerSummaries } from '../lib/customers';
import { customerTier, formatCurrency, formatDateTime, formatStatus, orderStatusTone, formatPercent, formatNumber } from '../lib/format';
import type { CustomerSummary, Order } from '../types';

export function CustomersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
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
    if (!normalizedQuery) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.customerName.toLowerCase().includes(normalizedQuery) ||
        customer.customerEmail.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [customers, query]);

  const repeatRate = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    return (customers.filter((customer) => customer.ordersCount > 1).length / customers.length) * 100;
  }, [customers]);

  const topTierCount = useMemo(() => customers.filter((customer) => customerTier(customer) === 'Priority').length, [customers]);
  const averageCustomerValue = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    return customers.reduce((sum, customer) => sum + customer.lifetimeValue, 0) / customers.length;
  }, [customers]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Customers"
        title="Customer lifetime value and purchase concentration"
        description="Customer records are currently derived from orders, but the view is shaped like a real CRM dashboard so it can evolve cleanly once a dedicated customer service exists."
      />

      {error ? <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MiniStat label="Customer accounts" value={formatNumber(customers.length)} />
        <MiniStat label="Repeat purchase rate" value={formatPercent(repeatRate, 0)} />
        <MiniStat label="Average customer value" value={formatCurrency(averageCustomerValue)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <AdminPanel className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Customer directory</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Search and review active buyers</h2>
            </div>
            <label className="w-full max-w-md text-sm font-medium text-slate-600">
              Search customers
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or email"
                className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4">Orders</th>
                  <th className="px-6 py-4">Lifetime value</th>
                  <th className="px-6 py-4">Last order</th>
                  <th className="px-6 py-4" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredCustomers.map((customer) => {
                  const tier = customerTier(customer);
                  const tierTone = tier === 'Priority' ? 'success' : tier === 'Growth' ? 'warning' : 'muted';

                  return (
                    <tr key={customer.customerEmail} className="text-slate-600">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-950">{customer.customerName}</div>
                        <div className="mt-1 text-slate-500">{customer.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill tone={tierTone}>{tier}</StatusPill>
                      </td>
                      <td className="px-6 py-4">{customer.ordersCount}</td>
                      <td className="px-6 py-4 font-semibold text-slate-950">{formatCurrency(customer.lifetimeValue)}</td>
                      <td className="px-6 py-4">
                        <div>{formatDateTime(customer.lastOrderAt)}</div>
                        <div className="mt-2">
                          <StatusPill tone={orderStatusTone(customer.lastOrderStatus)}>{formatStatus(customer.lastOrderStatus)}</StatusPill>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/orders/${customer.latestOrderId}`} className="font-semibold text-[#2558f5] underline decoration-slate-300 underline-offset-4">
                          View latest order
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">CRM highlights</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Concentration summary</h2>
          <div className="mt-6 grid gap-4">
            <HighlightCard label="Priority customers" value={formatNumber(topTierCount)} note="High-value or high-frequency buyers" />
            <HighlightCard label="Repeat customers" value={formatPercent(repeatRate, 0)} note="Customers with multiple orders" />
            <HighlightCard label="Visible customers" value={formatNumber(filteredCustomers.length)} note="Matches in the current search view" />
          </div>

          <div className="mt-6 rounded-[22px] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
            Once a customer service exists, this screen can absorb saved addresses, customer notes, support history, and segmentation without changing the overall dashboard structure.
          </div>
        </AdminPanel>
      </div>
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

interface HighlightCardProps {
  label: string;
  note: string;
  value: string;
}

function HighlightCard({ label, note, value }: HighlightCardProps) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{note}</div>
    </div>
  );
}
