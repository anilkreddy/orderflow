import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SectionHeading } from '../components/SectionHeading';
import { orderApi, toApiMessage } from '../lib/api';
import { useCustomerAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import type { Order } from '../types';

const lookupSchema = z.object({
  customerEmail: z.string().email('Enter the email used at checkout'),
  orderCode: z.string().optional(),
});

type LookupValues = z.infer<typeof lookupSchema>;

export function OrderLookupPage() {
  const { ready, isAuthenticated, hasRequiredScope, signIn } = useCustomerAuth();
  const [results, setResults] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      customerEmail: '',
      orderCode: '',
    },
  });

  useEffect(() => {
    if (!ready || !isAuthenticated || !hasRequiredScope) {
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
  }, [hasRequiredScope, isAuthenticated, ready]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const orders = await orderApi.lookup(values.customerEmail, values.orderCode);
      setResults(orders);
      setError(null);
    } catch (loadError) {
      setError(toApiMessage(loadError, 'Unable to look up orders right now'));
      setResults([]);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <SectionHeading
        eyebrow="Order Lookup"
        title={hasRequiredScope ? 'Review your customer orders' : 'Track purchases without calling support'}
        description={hasRequiredScope
          ? 'Signed-in customers see only the orders attached to their identity. Guest shoppers can still search by checkout email.'
          : 'Use the checkout email and optionally an order code to retrieve customer-facing order details from the live order service.'}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-5">
          {hasRequiredScope ? (
            <div className="market-panel rounded-[34px] px-6 py-6 text-sm leading-7 text-slate-600">
              <div className="text-lg font-semibold text-slate-950">Signed-in order access</div>
              <div className="mt-4 grid gap-3">
                {[
                  'Your order list now comes from the protected /api/orders/me endpoint.',
                  'Other customers\' orders are no longer visible in this account context.',
                  'Guest purchases can still be looked up separately with the checkout email.',
                ].map((item) => (
                  <div key={item} className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="market-panel rounded-[34px] px-6 py-6">
              <form className="grid gap-5" onSubmit={onSubmit}>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Checkout email
                  <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                    <input className="w-full bg-transparent outline-none" placeholder="maya@example.com" {...register('customerEmail')} />
                  </span>
                  {errors.customerEmail ? <span className="text-sm text-rose-700">{errors.customerEmail.message}</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Order code (optional)
                  <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                    <input className="w-full bg-transparent uppercase outline-none" placeholder="OFL-20260607-AB12CD34" {...register('orderCode')} />
                  </span>
                </label>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300">
                  {submitting ? 'Looking up orders...' : 'Find my orders'}
                </button>
              </form>
            </div>
          )}

          {!hasRequiredScope ? (
            <div className="market-panel rounded-[34px] px-6 py-6 text-sm leading-7 text-slate-600">
              <div className="text-lg font-semibold text-slate-950">What you need</div>
              <div className="mt-4 grid gap-3">
                {[
                  'Use the same email entered during checkout.',
                  'Add an order code for a direct match if you already have it.',
                  'Create a customer account to keep future orders attached to your identity automatically.',
                ].map((item) => (
                  <div key={item} className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                    {item}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-5 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={() => void signIn()}
              >
                Sign in instead
              </button>
            </div>
          ) : null}
        </div>

        <div className="market-panel rounded-[34px] px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Results</p>
          {error ? <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {loadingMine ? (
            <p className="mt-6 text-sm leading-7 text-slate-600">Loading your orders...</p>
          ) : results.length === 0 ? (
            <p className="mt-6 text-sm leading-7 text-slate-600">Orders matching this customer context will appear here.</p>
          ) : (
            <div className="mt-5 grid gap-4">
              {results.map((order) => (
                <div key={order.orderCode} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Order {order.orderCode}</p>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(order.totalAmount)}</p>
                      <p className="mt-2 text-sm text-slate-600">Placed on {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                        {order.status}
                      </span>
                      <Link
                        to={hasRequiredScope ? `/orders/${order.orderCode}` : `/orders/${order.orderCode}?email=${encodeURIComponent(order.customerEmail)}`}
                        className="text-sm font-semibold text-[#0f63ff] underline decoration-slate-300 underline-offset-4"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
