import { Link } from 'react-router-dom';
import { getDepartmentForProduct, getLeadBadge, getReviewSnapshot, getShippingNote } from '../lib/catalog';
import { formatCurrency } from '../lib/format';
import { notifyCartItemAdded, useCart } from '../lib/cart';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const department = getDepartmentForProduct(product);
  const badge = getLeadBadge(product);
  const shippingNote = getShippingNote(product);
  const review = getReviewSnapshot(product);

  return (
    <article className="market-card group flex h-full min-w-[260px] flex-col overflow-hidden rounded-[28px] bg-white transition hover:-translate-y-1">
      <div className="market-media relative min-h-[220px] overflow-hidden px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm">
            {badge}
          </span>
          <span className="rounded-full bg-[#ffcd38] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#08162c]">
            {department.label}
          </span>
        </div>
        <div className="mt-14 max-w-[80%]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">Live catalog item</p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight text-white">{product.name}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-1 text-[#f59e0b]">
            <span className="text-base">★</span>
            <span className="font-semibold text-slate-900">{review.rating}</span>
          </div>
          <span>{review.reviews} ratings</span>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-slate-600">{product.description}</p>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          <span>SKU #{product.id}</span>
          <span>•</span>
          <span>{product.categoryName}</span>
          <span>•</span>
          <span>{shippingNote}</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Price</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(product.price)}</div>
            <div className="mt-2 text-sm text-slate-500">
              {product.stockQuantity > 0 ? `${product.stockQuantity} available` : 'Currently unavailable'}
            </div>
          </div>
          <Link
            to={`/products/${product.id}`}
            className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Details
          </Link>
        </div>

        <button
          type="button"
          disabled={product.stockQuantity === 0}
          className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={(event) => {
            addItem(product.id, 1);
            notifyCartItemAdded(event.currentTarget, product.name);
          }}
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
