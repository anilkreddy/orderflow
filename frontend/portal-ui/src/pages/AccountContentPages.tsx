import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingPanel } from '../components/LoadingPanel';
import { orderApi, toApiMessage } from '../lib/api';
import { useCustomerAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import type { Order } from '../types';
import {
  accountPrimaryButtonClass,
  previewButtonClass,
  useAccountPageContext,
} from './AccountPage';

function orderStatusClass(status: Order['status']) {
  if (status === 'CONFIRMED') {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (status === 'CANCELLED' || status === 'FAILED') {
    return 'bg-rose-50 text-rose-700';
  }
  return 'bg-amber-50 text-amber-700';
}

export function AccountOverviewPage() {
  const { profile, orders, customerName, customerEmail, showPreviewNotice } = useAccountPageContext();
  const { signOut } = useCustomerAuth();
  const recentOrders = useMemo(
    () => [...orders].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(0, 3),
    [orders],
  );

  return (
    <div className="grid gap-7">
      <AccountSection
        eyebrow="Customer Account"
        title={customerName}
        description={customerEmail}
        action={(
          <div className="flex flex-wrap gap-3">
            <Link to="/shop" className={previewButtonClass}>Continue shopping</Link>
            <button type="button" className={previewButtonClass} onClick={() => void signOut()}>Sign out</button>
          </div>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard label="Email status" value={profile?.emailVerified ? 'Verified' : 'Verification pending'} badge={profile?.emailVerified ? 'Verified' : undefined} />
          <DetailCard label="Member since" value={profile ? formatDate(profile.registeredAt) : 'Recently'} />
          <DetailCard label="Account status" value={profile?.enabled ? 'Active' : 'Restricted'} badge={profile?.enabled ? 'Good standing' : undefined} />
          <DetailCard label="Customer ID" value={profile?.id ?? 'Unavailable'} />
        </div>
      </AccountSection>

      <AccountSection
        eyebrow="Account Overview"
        title="Manage your account"
        description="Open the account area you want to review or update."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <OverviewLink title="Profile" description="Review your personal and contact information." to="/account/profile" />
          <OverviewLink title="Orders" description="View purchases, order details, and tracking." to="/account/orders" />
          <OverviewLink title="Addresses" description="Add home, work, and gift delivery locations." to="/account/addresses" />
          <OverviewLink title="Payment methods" description="Prepare cards and billing preferences for checkout." to="/account/payments" />
        </div>
      </AccountSection>

      <AccountSection
        eyebrow="Recent Activity"
        title="Latest orders"
        description="Your most recent signed-in purchases appear here."
        action={<Link to="/account/orders" className={previewButtonClass}>View all orders</Link>}
      >
        {recentOrders.length === 0 ? (
          <EmptyPanel
            title="No account orders yet"
            description="Orders placed while signed in will appear here automatically."
            action={<Link to="/shop" className={accountPrimaryButtonClass}>Start shopping</Link>}
          />
        ) : (
          <OrderList orders={recentOrders} />
        )}
      </AccountSection>

      <section className="rounded-[34px] bg-[#eaf2ff] px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0f63ff]">Quick Actions</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/track-order" className={previewButtonClass}>Track an order</Link>
          <button type="button" className={previewButtonClass} onClick={() => showPreviewNotice('Returns and refunds')}>Start a return</button>
          <Link to="/account/support" className={previewButtonClass}>Contact support</Link>
        </div>
      </section>
    </div>
  );
}

export function AccountProfilePage() {
  const { profile, customerName, customerEmail, showPreviewNotice } = useAccountPageContext();

  return (
    <div className="grid gap-7">
      <AccountSection
        eyebrow="Personal Information"
        title="Profile"
        description="Manage the identity and contact details used across your Oflio account."
        action={<button type="button" className={previewButtonClass} onClick={() => showPreviewNotice('Profile editing')}>Edit profile</button>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard label="Full name" value={customerName} />
          <DetailCard label="Email address" value={customerEmail} badge={profile?.emailVerified ? 'Verified' : 'Pending'} />
          <DetailCard label="Username" value={profile?.username ?? customerEmail} />
          <DetailCard label="Customer ID" value={profile?.id ?? 'Unavailable'} />
          <DetailCard label="Member since" value={profile ? formatDate(profile.registeredAt) : 'Unavailable'} />
          <DetailCard label="Account status" value={profile?.enabled ? 'Active' : 'Restricted'} badge={profile?.enabled ? 'Good standing' : undefined} />
        </div>
      </AccountSection>

      <section className="rounded-[34px] border border-rose-200 bg-rose-50 px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-600">Account Management</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-rose-950">Close your account</h2>
            <p className="mt-2 text-sm leading-6 text-rose-800">Account deletion will require identity verification before customer data is removed.</p>
          </div>
          <button type="button" className="shrink-0 rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100" onClick={() => showPreviewNotice('Account deletion')}>
            Delete account
          </button>
        </div>
      </section>
    </div>
  );
}

export function AccountOrdersPage() {
  const { orders } = useAccountPageContext();
  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [orders],
  );

  return (
    <AccountSection
      eyebrow="Purchase History"
      title="All orders"
      description="Review every purchase linked to your signed-in customer identity."
      action={<Link to="/track-order" className={previewButtonClass}>Track another order</Link>}
    >
      {sortedOrders.length === 0 ? (
        <EmptyPanel
          title="No account orders yet"
          description="Orders placed while signed in will appear here automatically."
          action={<Link to="/shop" className={accountPrimaryButtonClass}>Start shopping</Link>}
        />
      ) : (
        <OrderList orders={sortedOrders} />
      )}
    </AccountSection>
  );
}

export function AccountOrderDetailsPage() {
  const { orderCode } = useParams();
  const { orders } = useAccountPageContext();
  const cachedOrder = orders.find((order) => order.orderCode === orderCode) ?? null;
  const [order, setOrder] = useState<Order | null>(cachedOrder);
  const [loading, setLoading] = useState(!cachedOrder);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderCode || cachedOrder) {
      return;
    }

    const currentOrderCode = orderCode;

    async function loadOrder() {
      try {
        setOrder(await orderApi.getByCode(currentOrderCode));
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load this account order'));
      } finally {
        setLoading(false);
      }
    }

    void loadOrder();
  }, [cachedOrder, orderCode]);

  if (loading) {
    return <LoadingPanel message="Loading order details..." />;
  }

  if (!order) {
    return (
      <EmptyPanel
        title="Order not found"
        description={error ?? 'This order is not available for the signed-in customer.'}
        action={<Link to="/account/orders" className={accountPrimaryButtonClass}>Back to orders</Link>}
      />
    );
  }

  return (
    <div className="grid gap-7">
      <AccountSection
        eyebrow="Order Details"
        title={`Order ${order.orderCode}`}
        description={`Placed ${formatDate(order.createdAt)} for ${order.customerName}.`}
        action={<Link to="/account/orders" className={previewButtonClass}>Back to all orders</Link>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard label="Status" value={order.status} badge={order.status} />
          <DetailCard label="Order total" value={formatCurrency(order.totalAmount)} />
          <DetailCard label="Items" value={`${order.items.length} item(s)`} />
        </div>
      </AccountSection>

      <AccountSection
        eyebrow="Fulfillment"
        title="Order timeline"
        description="Follow the current processing status of this order."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: 'Order placed', complete: true },
            { label: 'Inventory review', complete: order.status !== 'CREATED' },
            { label: 'Order confirmed', complete: order.status === 'CONFIRMED' },
          ].map((step, index) => (
            <div key={step.label} className="rounded-[24px] border border-slate-100 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${step.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {index + 1}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">{step.label}</p>
            </div>
          ))}
        </div>
      </AccountSection>

      <AccountSection
        eyebrow="Line Items"
        title="Products in this order"
        description="Quantity and price details for every purchased item."
      >
        <div className="grid gap-4">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-[28px] border border-slate-100 bg-white px-5 py-5 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{item.productName}</p>
                  <p className="mt-1 text-sm text-slate-500">Product #{item.productId}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600">
                  <span>Qty {item.quantity}</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AccountSection>
    </div>
  );
}

export function AccountAddressesPage() {
  const { showPreviewNotice } = useAccountPageContext();
  return (
    <AccountSection
      eyebrow="Delivery Details"
      title="Addresses"
      description="Save home, work, and gift addresses for faster checkout."
      action={<button type="button" className={accountPrimaryButtonClass} onClick={() => showPreviewNotice('Add address')}>Add address</button>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <EmptyOptionCard
          title="No saved addresses"
          description="Add a primary shipping address to prefill future checkouts."
          action="Add home address"
          onClick={() => showPreviewNotice('Address management')}
        />
        <InfoCard title="Flexible checkout" description="Saved addresses remain optional. You can use a different delivery location on every order." />
      </div>
    </AccountSection>
  );
}

export function AccountPaymentsPage() {
  const { showPreviewNotice } = useAccountPageContext();
  return (
    <AccountSection
      eyebrow="Billing"
      title="Payment methods"
      description="Manage saved cards, billing preferences, and wallet connections."
      action={<button type="button" className={accountPrimaryButtonClass} onClick={() => showPreviewNotice('Add payment method')}>Add payment method</button>}
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <EmptyOptionCard
          title="No payment methods saved"
          description="Cards will be tokenized by the payment provider. Oflio will never store raw card numbers."
          action="Add a card"
          onClick={() => showPreviewNotice('Payment method management')}
        />
        <div className="rounded-[28px] bg-[#0b1730] px-6 py-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">Secure payments</p>
          <p className="mt-4 font-display text-2xl font-semibold">Protected checkout</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">Payment credentials will be encrypted, tokenized, and managed by a PCI-compliant provider.</p>
        </div>
      </div>
    </AccountSection>
  );
}

export function AccountSecurityPage() {
  const { profile, showPreviewNotice } = useAccountPageContext();
  return (
    <AccountSection
      eyebrow="Account Protection"
      title="Security"
      description="Control password access, multi-factor authentication, and active sessions."
    >
      <div className="grid gap-4">
        <SecurityRow
          title="Password"
          description={profile ? `Last changed ${formatDate(profile.passwordChangedAt)}` : 'Password managed by the identity provider'}
          status="Configured"
          action="Change password"
          onClick={() => showPreviewNotice('Password management')}
        />
        <SecurityRow title="Two-factor authentication" description="Add an authenticator app or security key." status="Not enabled" action="Set up 2FA" onClick={() => showPreviewNotice('Two-factor authentication')} />
        <SecurityRow title="Active sessions" description="Review browsers and devices currently signed in." status="1 current session" action="Manage sessions" onClick={() => showPreviewNotice('Session management')} />
      </div>
    </AccountSection>
  );
}

export function AccountPreferencesPage() {
  const { showPreviewNotice } = useAccountPageContext();
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    offers: false,
    productNews: true,
    sms: false,
  });

  return (
    <AccountSection
      eyebrow="Communication"
      title="Preferences"
      description="Choose which updates you receive and how Oflio communicates with you."
    >
      <div className="grid gap-3">
        <PreferenceToggle title="Order and delivery updates" description="Receipts, fulfillment progress, shipping, and cancellations." checked={preferences.orderUpdates} onChange={() => setPreferences((current) => ({ ...current, orderUpdates: !current.orderUpdates }))} />
        <PreferenceToggle title="Offers and promotions" description="Discounts, seasonal campaigns, and recommendations." checked={preferences.offers} onChange={() => setPreferences((current) => ({ ...current, offers: !current.offers }))} />
        <PreferenceToggle title="Product news" description="New categories, restocks, and marketplace announcements." checked={preferences.productNews} onChange={() => setPreferences((current) => ({ ...current, productNews: !current.productNews }))} />
        <PreferenceToggle title="SMS notifications" description="Text-message updates for time-sensitive order activity." checked={preferences.sms} onChange={() => setPreferences((current) => ({ ...current, sms: !current.sms }))} />
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" className={accountPrimaryButtonClass} onClick={() => showPreviewNotice('Communication preferences')}>Save preferences</button>
      </div>
    </AccountSection>
  );
}

export function AccountSupportPage() {
  const { showPreviewNotice } = useAccountPageContext();
  return (
    <AccountSection
      eyebrow="Customer Care"
      title="Support"
      description="Find answers, track purchases, or contact the Oflio customer care team."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SupportCard title="Track an order" description="Check live status using an order code and email address." link="/track-order" linkLabel="Track order" />
        <SupportCard title="Returns and refunds" description="Review the future return workflow and refund eligibility." linkLabel="View return options" onClick={() => showPreviewNotice('Returns and refunds')} />
        <SupportCard title="Contact support" description="Get help with products, orders, payments, or account access." linkLabel="Contact us" onClick={() => showPreviewNotice('Customer support')} />
      </div>
    </AccountSection>
  );
}

interface AccountSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

function AccountSection({ eyebrow, title, description, action, children }: AccountSectionProps) {
  return (
    <section className="market-panel rounded-[34px] px-5 py-6 md:px-7 md:py-7">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div className="grid gap-4">
      {orders.map((order) => (
        <Link key={order.orderCode} to={`/account/orders/${order.orderCode}`} className="rounded-[28px] border border-slate-100 bg-white px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-slate-950">Order {order.orderCode}</p>
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${orderStatusClass(order.status)}`}>{order.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Placed {formatDate(order.createdAt)} · {order.items.length} item(s)</p>
            </div>
            <div className="flex items-center justify-between gap-5 lg:justify-end">
              <p className="font-display text-2xl font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</p>
              <span className="text-sm font-semibold text-[#0f63ff]">View details</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function OverviewLink({ title, description, to }: { title: string; description: string; to: string }) {
  return (
    <Link to={to} className="rounded-[26px] border border-slate-100 bg-white px-5 py-5 shadow-[0_12px_25px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200">
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-4 inline-flex text-sm font-semibold text-[#0f63ff]">Open {title.toLowerCase()}</span>
    </Link>
  );
}

function DetailCard({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white px-5 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
        {badge ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{badge}</span> : null}
      </div>
      <p className="mt-3 break-all text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyPanel({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-white/70 px-6 py-9 text-center">
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}

function EmptyOptionCard({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-5 py-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf2ff] text-lg font-bold text-[#0f63ff]">+</div>
      <p className="mt-4 text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <button type="button" className={`${previewButtonClass} mt-5`} onClick={onClick}>{action}</button>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Checkout behavior</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SecurityRow({ title, description, status, action, onClick }: { title: string; description: string; status: string; action: string; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-[26px] border border-slate-100 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-semibold text-slate-950">{title}</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{status}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <button type="button" className={`${previewButtonClass} shrink-0`} onClick={onClick}>{action}</button>
    </div>
  );
}

function PreferenceToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" className="flex w-full items-center justify-between gap-5 rounded-[24px] border border-slate-100 bg-white px-5 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)]" onClick={onChange} role="switch" aria-checked={checked}>
      <span>
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-[#0f63ff]' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

function SupportCard({ title, description, link, linkLabel, onClick }: { title: string; description: string; link?: string; linkLabel: string; onClick?: () => void }) {
  const content = (
    <>
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-5 inline-flex text-sm font-semibold text-[#0f63ff]">{linkLabel}</span>
    </>
  );

  if (link) {
    return <Link to={link} className="rounded-[28px] border border-slate-100 bg-white px-5 py-5 shadow-[0_12px_25px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200">{content}</Link>;
  }

  return <button type="button" className="rounded-[28px] border border-slate-100 bg-white px-5 py-5 text-left shadow-[0_12px_25px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200" onClick={onClick}>{content}</button>;
}
