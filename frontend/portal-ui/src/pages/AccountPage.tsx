import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { customerApi, orderApi, toApiMessage } from '../lib/api';
import { useCustomerAuth } from '../lib/auth';
import type { CustomerProfile, Order } from '../types';

const accountNavigation = [
  { to: '/account', label: 'Overview', description: 'Account summary', end: true },
  { to: '/account/profile', label: 'Profile', description: 'Personal information' },
  { to: '/account/orders', label: 'Orders', description: 'Purchases and tracking' },
  { to: '/account/addresses', label: 'Addresses', description: 'Shipping locations' },
  { to: '/account/payments', label: 'Payments', description: 'Cards and billing' },
  { to: '/account/security', label: 'Security', description: 'Password and sessions' },
  { to: '/account/preferences', label: 'Preferences', description: 'Messages and privacy' },
  { to: '/account/support', label: 'Support', description: 'Help and contact' },
];

export const previewButtonClass =
  'inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50';

export const accountPrimaryButtonClass =
  'inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]';

export interface AccountOutletContext {
  profile: CustomerProfile | null;
  orders: Order[];
  customerName: string;
  customerEmail: string;
  showPreviewNotice: (feature: string) => void;
}

export function useAccountPageContext() {
  return useOutletContext<AccountOutletContext>();
}

export function AccountPage() {
  const { ready, isAuthenticated, hasRequiredScope, session, signIn } = useCustomerAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  function showPreviewNotice(feature: string) {
    setNotice(`${feature} is ready as a UI preview. Backend persistence can be connected next.`);
    window.setTimeout(() => setNotice(null), 4500);
  }

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
          description="Customer account access lets you review your profile, orders, addresses, payment options, and preferences."
          action={(
            <button type="button" className={accountPrimaryButtonClass} onClick={() => void signIn()}>
              Sign in
            </button>
          )}
        />
      </div>
    );
  }

  const customerName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : session?.displayName ?? 'Customer';
  const customerEmail = profile?.email ?? session?.email ?? '';
  const outletContext: AccountOutletContext = {
    profile,
    orders,
    customerName,
    customerEmail,
    showPreviewNotice,
  };

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 md:px-6 md:py-10">
      {notice ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-[22px] bg-slate-950 px-5 py-4 text-sm font-medium text-white shadow-[0_24px_70px_rgba(8,22,44,0.32)]">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid items-start gap-7 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit xl:sticky xl:top-36">
          <div className="market-panel rounded-[30px] p-3">
            <div className="px-4 pb-3 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Account Menu</p>
            </div>
            <nav className="grid gap-1">
              {accountNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => [
                    'rounded-[20px] px-4 py-3 transition',
                    isActive
                      ? 'bg-white shadow-[0_10px_24px_rgba(15,23,42,0.07)]'
                      : 'hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]',
                  ].join(' ')}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`block text-sm font-semibold ${isActive ? 'text-[#0f63ff]' : 'text-slate-900'}`}>{item.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-4 rounded-[28px] bg-[#eaf2ff] px-5 py-5">
            <p className="text-sm font-semibold text-[#0b3f9f]">Need help?</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track an order or contact customer support from your account.</p>
            <Link to="/account/support" className="mt-4 inline-flex text-sm font-semibold text-[#0f63ff]">Get support</Link>
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
