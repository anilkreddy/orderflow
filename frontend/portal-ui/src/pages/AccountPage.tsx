import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { SectionHeading } from '../components/SectionHeading';
import { customerApi, orderApi, toApiMessage } from '../lib/api';
import { useCustomerAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import type { CustomerProfile, Order } from '../types';

export function AccountPage() {
  const { ready, isAuthenticated, hasRequiredScope, session, signIn } = useCustomerAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isAuthenticated || !hasRequiredScope) {
      setLoading(false);
      return;
    }

    async function loadAccount() {
      try {
        const [profileData, orderData] = await Promise.all([
          customerApi.getCurrent(),
          orderApi.listMine(),
        ]);
        setProfile(profileData);
        setOrders(orderData);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load your account right now'));
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, [hasRequiredScope, isAuthenticated, ready]);

  if (!ready || loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Loading your account..." />
      </div>
    );
  }

  if (!isAuthenticated || !hasRequiredScope) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <EmptyState
          title="Sign in to view your account"
          description="Customer account access lets you review your profile and fetch only the orders that belong to your signed-in identity."
          action={(
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-[#0f63ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]"
              onClick={() => void signIn()}
            >
              Sign in
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <SectionHeading
        eyebrow="My Account"
        title={`Welcome back, ${session?.givenName ?? profile?.firstName ?? 'Customer'}`}
        description="This account area is backed by the customer-service profile and the protected customer order history endpoints."
      />

      {error ? <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-5">
          <div className="market-panel rounded-[34px] px-6 py-6">
            <div className="text-lg font-semibold text-slate-950">Account profile</div>
            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Customer</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{profile ? `${profile.firstName} ${profile.lastName}` : session?.displayName}</div>
                <div className="mt-1">{profile?.email ?? session?.email}</div>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Username</div>
                <div className="mt-2 font-semibold text-slate-950">{profile?.username ?? 'Unavailable'}</div>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Registered</div>
                <div className="mt-2 font-semibold text-slate-950">{profile ? formatDate(profile.registeredAt) : 'Unavailable'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="market-panel rounded-[34px] px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Owned Orders</p>
              <div className="mt-2 text-lg font-semibold text-slate-950">Only orders attached to your customer identity appear here.</div>
            </div>
            <Link to="/shop" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              Continue shopping
            </Link>
          </div>

          {orders.length === 0 ? (
            <p className="mt-6 text-sm leading-7 text-slate-600">No orders are linked to this account yet. Place an order while signed in and it will appear here automatically.</p>
          ) : (
            <div className="mt-5 grid gap-4">
              {orders.map((order) => (
                <Link key={order.orderCode} to={`/orders/${order.orderCode}`} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Order {order.orderCode}</p>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(order.totalAmount)}</p>
                      <p className="mt-2 text-sm text-slate-600">Placed on {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                        {order.status}
                      </div>
                      <div className="mt-3 font-semibold text-slate-900">{order.items.length} item(s)</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
