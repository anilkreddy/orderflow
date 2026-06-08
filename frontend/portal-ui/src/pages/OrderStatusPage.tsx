import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { LoadingPanel } from '../components/LoadingPanel';
import { SectionHeading } from '../components/SectionHeading';
import { orderApi, toApiMessage } from '../lib/api';
import { useCustomerAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import type { Order } from '../types';

export function OrderStatusPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { ready, isAuthenticated, hasRequiredScope } = useCustomerAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !ready) {
      return;
    }

    const orderId = id;
    const guestEmail = searchParams.get('email');

    async function loadOrder() {
      try {
        const data = isAuthenticated && hasRequiredScope
          ? await orderApi.getByCode(orderId)
          : guestEmail
            ? await orderApi.lookupByCode(orderId, guestEmail)
            : null;

        if (!data) {
          setError('Guest order access requires the checkout email. Use the order lookup page to reopen this order.');
          setOrder(null);
          return;
        }

        setOrder(data);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load the order status'));
      } finally {
        setLoading(false);
      }
    }

    void loadOrder();
  }, [hasRequiredScope, id, isAuthenticated, ready, searchParams]);

  const statusNote = useMemo(() => {
    if (!order) {
      return '';
    }
    switch (order.status) {
      case 'CONFIRMED':
        return 'Your order has been accepted and inventory has already been reserved in the backend.';
      case 'FAILED':
        return 'The order could not be confirmed. Support or backoffice follow-up would be required in a fuller workflow.';
      case 'CANCELLED':
        return 'The order has been cancelled.';
      default:
        return 'The order has been created and is waiting for downstream confirmation.';
    }
  }, [order]);

  const steps = useMemo(() => {
    if (!order) {
      return [];
    }

    return [
      { label: 'Order placed', complete: true },
      { label: 'Inventory review', complete: order.status === 'CONFIRMED' || order.status === 'FAILED' },
      { label: 'Order confirmed', complete: order.status === 'CONFIRMED' },
    ];
  }, [order]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Loading order status..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error ?? 'Order not found'}</div>
        <div className="mt-5">
          <Link to="/track-order" className="inline-flex items-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]">
            Back to order lookup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <SectionHeading
        eyebrow="Order Status"
        title={`Thanks for your order ${order.orderCode}`}
        description={hasRequiredScope
          ? 'This order view is protected by customer ownership checks in the order service.'
          : 'This guest status view is limited to the order and email combination you used at checkout.'}
        action={<Link to="/shop" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Continue shopping</Link>}
      />

      {error ? <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="market-hero rounded-[36px] px-6 py-6 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">Current status</p>
            <div className="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">{order.status}</div>
            <div className="mt-4 text-lg font-semibold text-white">{formatCurrency(order.totalAmount)}</div>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">{statusNote}</p>
          </div>

          <div className="market-panel rounded-[34px] px-6 py-6">
            <div className="text-lg font-semibold text-slate-950">Order timeline</div>
            <div className="mt-5 grid gap-3">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-4 rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  <div className={[
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                    step.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                  ].join(' ')}>
                    {index + 1}
                  </div>
                  <div className="text-sm font-medium text-slate-700">{step.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="market-panel rounded-[34px] px-6 py-6">
            <div className="text-lg font-semibold text-slate-950">Order details</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Order code</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{order.orderCode}</div>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Placed</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatDate(order.createdAt)}</div>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Customer</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{order.customerName}</div>
                <div className="mt-1 text-sm text-slate-600">{order.customerEmail}</div>
              </div>
            </div>
          </div>

          <div className="market-panel rounded-[34px] px-6 py-6">
            <div className="text-lg font-semibold text-slate-950">Order items</div>
            <div className="mt-5 grid gap-4">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-2xl font-extrabold tracking-tight text-slate-950">{item.productName}</p>
                      <p className="mt-2 text-sm text-slate-600">SKU #{item.productId}</p>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <div>Qty {item.quantity}</div>
                      <div className="mt-2 font-semibold text-slate-900">{formatCurrency(item.unitPrice * item.quantity)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
