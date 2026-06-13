import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { orderApi, toApiMessage } from '../lib/api';
import { useCustomerAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import type { Order } from '../types';

const lookupSchema = z.object({
  orderCode: z.string().optional(),
  customerEmail: z.string().email('Enter the email used at checkout'),
});

type LookupValues = z.infer<typeof lookupSchema>;

const statusDetails: Record<Order['status'], { label: string; description: string; className: string }> = {
  CREATED: {
    label: 'Order placed',
    description: 'We received your order and are checking inventory.',
    className: 'bg-amber-50 text-amber-700',
  },
  CONFIRMED: {
    label: 'Confirmed',
    description: 'Inventory is reserved and your order is confirmed.',
    className: 'bg-emerald-50 text-emerald-700',
  },
  FAILED: {
    label: 'Needs attention',
    description: 'The order could not be completed. Contact support for help.',
    className: 'bg-rose-50 text-rose-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'This order is no longer being processed.',
    className: 'bg-slate-100 text-slate-600',
  },
};

export function OrderLookupPage() {
  const { ready, isAuthenticated, hasRequiredScope, session, signIn } = useCustomerAuth();
  const [results, setResults] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const hasCustomerAccount = ready && isAuthenticated && hasRequiredScope;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      orderCode: '',
      customerEmail: '',
    },
  });

  useEffect(() => {
    if (!hasCustomerAccount) {
      return;
    }

    async function loadOwnedOrders() {
      setLoadingMine(true);
      try {
        const orders = await orderApi.listMine();
        setResults(orders);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load your orders right now'));
        setResults([]);
      } finally {
        setLoadingMine(false);
      }
    }

    void loadOwnedOrders();
  }, [hasCustomerAccount]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setHasSearched(true);
    try {
      const orders = await orderApi.lookup(
        values.customerEmail.trim(),
        values.orderCode?.trim().toUpperCase() || undefined,
      );
      setResults(orders);
      setError(null);
    } catch (loadError) {
      setError(toApiMessage(loadError, 'Unable to find orders with those details'));
      setResults([]);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 md:px-6 md:py-10">
      <section className="overflow-hidden rounded-[38px] bg-[#0b1730] text-white shadow-[0_30px_80px_rgba(8,22,44,0.18)]">
        <div className="grid gap-9 px-6 py-9 md:px-9 md:py-11 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8eb8ff]">Order Tracking</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold tracking-tight md:text-6xl">
              Find your order and follow its progress.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              {hasCustomerAccount
                ? `Signed in as ${session?.email ?? 'a customer'}. Your account orders are loaded automatically.`
                : 'Enter the email used at checkout. Add your order code for the fastest, most precise result.'}
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">Tracking Journey</p>
            <div className="mt-5 grid gap-3">
              <JourneyStep number="1" title="Order received" description="Your checkout details reach our order service." />
              <JourneyStep number="2" title="Inventory review" description="Products and quantities are validated." />
              <JourneyStep number="3" title="Order confirmed" description="Reserved inventory is attached to your order." />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <section className="market-panel rounded-[34px] px-5 py-6 md:px-7 md:py-7">
          <div className="border-b border-slate-200 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              {hasCustomerAccount ? 'Your Orders' : 'Track A Purchase'}
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-slate-950">
              {hasCustomerAccount ? 'Orders linked to your account' : 'Enter your order details'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {hasCustomerAccount
                ? 'Open an order to review its current status, products, and total.'
                : 'You can find the order code in your confirmation screen or email. Leave it blank to find all orders for the checkout email.'}
            </p>
          </div>

          {hasCustomerAccount ? (
            <div className="mt-5 flex flex-col gap-4 rounded-[26px] bg-[#eaf2ff] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#0b3f9f]">Secure account lookup</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Only orders attached to your signed-in identity are shown.</p>
              </div>
              <Link to="/account/orders" className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]">
                Open order history
              </Link>
            </div>
          ) : (
            <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Order code
                  <span className="field-shell rounded-[22px] bg-white px-4 py-3.5 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                    <input
                      className="w-full bg-transparent font-medium uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal"
                      placeholder="OFL-20260607-AB12CD34"
                      autoComplete="off"
                      {...register('orderCode')}
                    />
                  </span>
                  <span className="text-xs font-normal text-slate-500">Optional when searching with your checkout email.</span>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Checkout email
                  <span className="field-shell rounded-[22px] bg-white px-4 py-3.5 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                    <input
                      type="email"
                      className="w-full bg-transparent outline-none"
                      placeholder="maya@example.com"
                      autoComplete="email"
                      {...register('customerEmail')}
                    />
                  </span>
                  {errors.customerEmail ? (
                    <span className="text-xs font-normal text-rose-700">{errors.customerEmail.message}</span>
                  ) : (
                    <span className="text-xs font-normal text-slate-500">Use the exact email entered during checkout.</span>
                  )}
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? 'Searching for your order...' : 'Track my order'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => void signIn()}
                >
                  Sign in for order history
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="grid gap-5 xl:sticky xl:top-36">
          <div className="market-panel rounded-[30px] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Where To Look</p>
            <div className="mt-4 grid gap-3">
              <HelpItem title="Confirmation page" description="The order code appears immediately after checkout." />
              <HelpItem title="Order email" description="Search your inbox using “OFL-” or “Oflio order”." />
              <HelpItem title="Customer account" description="Signed-in purchases are saved under Account → Orders." />
            </div>
          </div>

          <div className="rounded-[30px] bg-[#fff1c7] px-5 py-5">
            <p className="text-sm font-semibold text-[#6e4b00]">Still need help?</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">Customer support can help with missing confirmations, cancellations, or failed orders.</p>
            <Link to="/account/support" className="mt-4 inline-flex text-sm font-semibold text-[#0f63ff]">Contact support</Link>
          </div>
        </aside>
      </div>

      <section className="mt-7 market-panel rounded-[34px] px-5 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              {hasCustomerAccount ? 'Account Activity' : 'Tracking Results'}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-slate-950">
              {hasCustomerAccount ? 'Your recent orders' : 'Orders matching your search'}
            </h2>
          </div>
          {results.length > 0 ? <p className="text-sm font-medium text-slate-500">{results.length} order{results.length === 1 ? '' : 's'} found</p> : null}
        </div>

        {error ? (
          <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
        ) : null}

        {loadingMine ? (
          <div className="mt-5 rounded-[26px] bg-white px-6 py-9 text-center text-sm text-slate-600">
            Loading orders linked to your account...
          </div>
        ) : results.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {results.map((order) => (
              <OrderResultCard key={order.orderCode} order={order} accountOrder={hasCustomerAccount} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf2ff] font-display text-lg font-bold text-[#0f63ff]">O</div>
            <p className="mt-4 text-lg font-semibold text-slate-950">
              {hasCustomerAccount ? 'No account orders yet' : hasSearched ? 'No matching orders found' : 'Your tracking results will appear here'}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              {hasCustomerAccount
                ? 'Orders placed while signed in will be linked to your account automatically.'
                : hasSearched
                  ? 'Check the order code and make sure the email exactly matches the one used during checkout.'
                  : 'Enter your checkout email and optional order code to begin.'}
            </p>
            {hasCustomerAccount ? (
              <Link to="/shop" className="mt-5 inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]">
                Start shopping
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function JourneyStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 rounded-[22px] bg-white/8 px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffcd38] text-sm font-bold text-[#08162c]">{number}</div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">{description}</p>
      </div>
    </div>
  );
}

function HelpItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function OrderResultCard({ order, accountOrder }: { order: Order; accountOrder: boolean }) {
  const status = statusDetails[order.status];
  const detailsPath = accountOrder
    ? `/account/orders/${order.orderCode}`
    : `/orders/${order.orderCode}?email=${encodeURIComponent(order.customerEmail)}`;

  return (
    <article className="rounded-[28px] border border-slate-100 bg-white px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl font-semibold text-slate-950">Order {order.orderCode}</p>
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${status.className}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{status.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <OrderDetail label="Placed" value={formatDate(order.createdAt)} />
            <OrderDetail label="Items" value={`${order.items.length} item${order.items.length === 1 ? '' : 's'}`} />
            <OrderDetail label="Total" value={formatCurrency(order.totalAmount)} />
          </div>
        </div>

        <Link
          to={detailsPath}
          className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]"
        >
          View order details
        </Link>
      </div>
    </article>
  );
}

function OrderDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
