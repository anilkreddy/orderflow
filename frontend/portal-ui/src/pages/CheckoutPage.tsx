import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { SectionHeading } from '../components/SectionHeading';
import { orderApi, productApi, toApiMessage } from '../lib/api';
import { useCart } from '../lib/cart';
import { formatCurrency } from '../lib/format';
import type { Product } from '../types';

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Full name must be at least 2 characters'),
  customerEmail: z.string().email('Enter a valid email address'),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
    },
  });

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productApi.list();
        setProducts(data);
        setSubmitError(null);
      } catch (loadError) {
        setSubmitError(toApiMessage(loadError, 'Unable to load checkout details'));
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  const cartLines = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) {
          return null;
        }
        return { item, product, total: product.price * item.quantity };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [items, products]);

  const orderTotal = cartLines.reduce((sum, line) => sum + line.total, 0);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const order = await orderApi.create({
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        items: cartLines.map((line) => ({ productId: line.product.id, quantity: line.item.quantity })),
      });
      clearCart();
      navigate(`/orders/${order.id}`);
    } catch (error) {
      setSubmitError(toApiMessage(error, 'Unable to place your order'));
    }
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Preparing checkout..." />
      </div>
    );
  }

  if (cartLines.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <EmptyState
          title="Your cart is empty"
          description="Add products to the cart before moving to checkout."
          action={<Link to="/shop" className="inline-flex items-center rounded-full bg-[#0f63ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]">Go to shop</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <SectionHeading
        eyebrow="Secure Checkout"
        title="Confirm your order"
        description="This guest checkout creates a live order, reserves inventory in the backend, and returns a real order number."
      />

      <form className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]" onSubmit={onSubmit}>
        <div className="space-y-5">
          <div className="market-panel rounded-[34px] px-6 py-6">
            <div className="text-lg font-semibold text-slate-950">Customer details</div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Full name
                <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  <input className="w-full bg-transparent outline-none" placeholder="Maya Patel" {...register('customerName')} />
                </span>
                {errors.customerName ? <span className="text-sm text-rose-700">{errors.customerName.message}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email address
                <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  <input className="w-full bg-transparent outline-none" placeholder="maya@example.com" {...register('customerEmail')} />
                </span>
                {errors.customerEmail ? <span className="text-sm text-rose-700">{errors.customerEmail.message}</span> : null}
              </label>
            </div>
          </div>

          <div className="market-panel rounded-[34px] px-6 py-6 text-sm leading-7 text-slate-600">
            <div className="text-lg font-semibold text-slate-950">What this checkout stores today</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                'Customer name and email',
                'Selected products and quantities',
                'Total amount and order status',
              ].map((item) => (
                <div key={item} className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5">Shipping address, billing, and payment capture can be layered in when the order domain expands.</div>
          </div>

          {submitError ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div> : null}
        </div>

        <aside className="market-panel h-fit rounded-[34px] px-6 py-6 xl:sticky xl:top-36">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Order Summary</p>
          <div className="mt-5 space-y-3 border-b border-slate-200 pb-5">
            {cartLines.map((line) => (
              <div key={line.product.id} className="rounded-[24px] bg-white px-4 py-4 text-sm shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <div className="font-semibold text-slate-950">{line.product.name}</div>
                <div className="mt-1 text-slate-500">Qty {line.item.quantity}</div>
                <div className="mt-2 font-semibold text-slate-950">{formatCurrency(line.total)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="font-semibold text-slate-900">Order total</span>
            <span className="text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(orderTotal)}</span>
          </div>
          <div className="mt-6 grid gap-3">
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300">
              {isSubmitting ? 'Placing order...' : 'Place order'}
            </button>
            <Link to="/cart" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              Back to cart
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
