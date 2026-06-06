import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { QuantitySelector } from '../components/QuantitySelector';
import { SectionHeading } from '../components/SectionHeading';
import { getDepartmentForProduct, getShippingNote } from '../lib/catalog';
import { productApi, toApiMessage } from '../lib/api';
import { useCart } from '../lib/cart';
import { formatCurrency } from '../lib/format';
import type { Product } from '../types';

export function CartPage() {
  const { items, setQuantity, removeItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productApi.list();
        setProducts(data);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load cart products'));
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
        return {
          item,
          product,
          total: product.price * item.quantity,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [items, products]);

  const subtotal = cartLines.reduce((sum, line) => sum + line.total, 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Loading your cart..." />
      </div>
    );
  }

  if (cartLines.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <EmptyState
          title="Your cart is empty"
          description="Browse the live catalog and add a few products before starting checkout."
          action={<Link to="/shop" className="inline-flex items-center rounded-full bg-[#0f63ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]">Continue shopping</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <SectionHeading
        eyebrow="Shopping Cart"
        title="Review items before checkout"
        description="The basket is client-side until checkout. Inventory validation happens when the final order is created."
      />

      {error ? <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.12fr_360px]">
        <div className="grid gap-4">
          {cartLines.map((line) => {
            const department = getDepartmentForProduct(line.product);
            const shippingNote = getShippingNote(line.product);

            return (
              <div key={line.product.id} className="market-panel rounded-[32px] px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
                  <div className="market-media flex min-h-[170px] items-end rounded-[28px] px-5 py-5 text-white">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">{department.label}</div>
                      <div className="mt-3 text-2xl font-semibold">{line.product.name}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-950">{line.product.name}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{line.product.description}</div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      <span>SKU #{line.product.id}</span>
                      <span>•</span>
                      <span>{shippingNote}</span>
                    </div>
                    <div className="mt-4">
                      <QuantitySelector
                        value={line.item.quantity}
                        max={Math.max(1, line.product.stockQuantity)}
                        onChange={(value) => setQuantity(line.product.id, value)}
                      />
                    </div>
                  </div>

                  <div className="text-left lg:text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Line total</div>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(line.total)}</div>
                    <div className="mt-2 text-sm text-slate-500">{formatCurrency(line.product.price)} each</div>
                    <button
                      type="button"
                      className="mt-5 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      onClick={() => removeItem(line.product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="market-panel h-fit rounded-[32px] px-6 py-6 xl:sticky xl:top-36">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Order Summary</p>
          <div className="mt-5 space-y-4 border-b border-slate-200 pb-5 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span>{cartLines.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>Added later</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="font-semibold text-slate-900">Estimated total</span>
            <span className="text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(subtotal)}</span>
          </div>
          <div className="mt-6 grid gap-3">
            <Link to="/checkout" className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]">
              Proceed to checkout
            </Link>
            <Link to="/shop" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
