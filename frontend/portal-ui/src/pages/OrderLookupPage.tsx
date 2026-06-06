import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SectionHeading } from '../components/SectionHeading';
import { orderApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { Order } from '../types';

const lookupSchema = z.object({
  customerEmail: z.string().email('Enter the email used at checkout'),
  orderId: z.string().optional(),
});

type LookupValues = z.infer<typeof lookupSchema>;

export function OrderLookupPage() {
  const [results, setResults] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      customerEmail: '',
      orderId: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const orders = await orderApi.list();
      const filtered = orders.filter((order) => {
        const sameEmail = order.customerEmail.toLowerCase() === values.customerEmail.toLowerCase();
        const sameId = !values.orderId?.trim() || String(order.id) === values.orderId.trim();
        return sameEmail && sameId;
      });
      setResults(filtered);
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
        title="Track purchases without calling support"
        description="Use the checkout email and optionally an order number to retrieve customer-facing order details from the live order service."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-5">
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
                Order number (optional)
                <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  <input className="w-full bg-transparent outline-none" placeholder="1024" {...register('orderId')} />
                </span>
              </label>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300">
                {submitting ? 'Looking up orders...' : 'Find my orders'}
              </button>
            </form>
          </div>

          <div className="market-panel rounded-[34px] px-6 py-6 text-sm leading-7 text-slate-600">
            <div className="text-lg font-semibold text-slate-950">What you need</div>
            <div className="mt-4 grid gap-3">
              {[
                'Use the same email entered during checkout.',
                'Add an order number for a direct match if you already have it.',
                'Results come from the live order-service dataset, not a mock support screen.',
              ].map((item) => (
                <div key={item} className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="market-panel rounded-[34px] px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Results</p>
          {error ? <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {results.length === 0 ? (
            <p className="mt-6 text-sm leading-7 text-slate-600">Orders matching the lookup will appear here.</p>
          ) : (
            <div className="mt-5 grid gap-4">
              {results.map((order) => (
                <div key={order.id} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Order #{order.id}</p>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(order.totalAmount)}</p>
                      <p className="mt-2 text-sm text-slate-600">Placed on {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                        {order.status}
                      </span>
                      <Link to={`/orders/${order.id}`} className="text-sm font-semibold text-[#0f63ff] underline decoration-slate-300 underline-offset-4">
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
