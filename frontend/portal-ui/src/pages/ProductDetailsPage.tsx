import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingPanel } from '../components/LoadingPanel';
import { ProductCard } from '../components/ProductCard';
import { QuantitySelector } from '../components/QuantitySelector';
import { getDepartmentForProduct, getFeatureHighlights, getLeadBadge, getMerchandisingSignals, getReviewSnapshot, getShippingNote } from '../lib/catalog';
import { productApi, searchApi, toApiMessage } from '../lib/api';
import { notifyCartItemAdded, useCart } from '../lib/cart';
import { formatCurrency } from '../lib/format';
import type { Product } from '../types';

export function ProductDetailsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    if (!id) {
      return;
    }
    const productId = id;

    async function loadProduct() {
      try {
        const productData = await productApi.get(productId);
        const relatedSearch = await searchApi.search({
          categoryCode: productData.categoryCode,
          active: true,
          excludeProductId: productData.id,
          sort: 'featured',
          size: 4,
          page: 0,
        });

        setProduct(productData);
        setRelatedProducts(relatedSearch.items.filter((entry) => entry.active));
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load product details'));
      } finally {
        setLoading(false);
      }
    }

    void loadProduct();
  }, [id]);

  useEffect(() => {
    if (!product) {
      return;
    }

    document.title = `${product.name} | Oflio Commerce`;
  }, [product]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Loading product details..." />
      </div>
    );
  }

  if (!product) {
    return <div className="mx-auto max-w-[1200px] px-4 py-10 text-sm text-rose-700 md:px-6">{error ?? 'Product not found'}</div>;
  }

  const department = getDepartmentForProduct(product);
  const badge = getLeadBadge(product);
  const shippingNote = getShippingNote(product);
  const highlights = getFeatureHighlights(product);
  const review = getReviewSnapshot(product);
  const signals = getMerchandisingSignals(product);

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <div className="text-sm text-slate-500">
        <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / <Link to={`/shop?category=${encodeURIComponent(department.key)}`}>{department.label}</Link> / {product.name}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="market-hero rounded-[42px] px-7 py-8 text-white md:px-9 md:py-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/18 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-sm">
              {badge}
            </span>
            <span className="rounded-full bg-[#ffcd38] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#08162c]">
              {department.label}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-sm">
              {product.categoryCode}
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-white md:text-6xl">
            {product.name}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">{product.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-100">
            <div className="flex items-center gap-2 text-[#ffd76a]">
              <span className="text-lg">★</span>
              <span className="font-semibold text-white">{review.rating}</span>
              <span>{review.reviews} ratings</span>
            </div>
            <span>{shippingNote}</span>
            <span>{product.stockQuantity > 0 ? `${product.stockQuantity} units ready to reserve` : 'Currently unavailable'}</span>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {highlights.map((highlight) => (
              <div key={highlight} className="rounded-[24px] bg-white/10 px-4 py-4 text-sm leading-6 text-slate-100 backdrop-blur-sm">
                {highlight}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="market-panel rounded-[34px] px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">SKU #{product.id}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{shippingNote}</p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Unavailable'}
              </div>
            </div>

            <div className="mt-6 text-5xl font-extrabold tracking-tight text-slate-950">{formatCurrency(product.price)}</div>
            <div className="mt-2 text-sm text-slate-500">Active product available through the live Oflio Commerce checkout path.</div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <BuyboxPill label="Delivery" value={product.stockQuantity >= 20 ? 'Fast dispatch' : 'Standard dispatch'} />
              <BuyboxPill label="Checkout" value="Secure guest flow" />
              <BuyboxPill label="Returns" value="Easy issue review" />
            </div>
          </div>

          <div className="market-panel rounded-[34px] px-6 py-6">
            <div className="text-sm font-semibold text-slate-900">Select quantity</div>
            <div className="mt-4">
              <QuantitySelector value={quantity} max={Math.max(1, product.stockQuantity)} onChange={setQuantity} />
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                disabled={product.stockQuantity === 0}
                className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={(event) => {
                  addItem(product.id, quantity);
                  notifyCartItemAdded(event.currentTarget, product.name);
                }}
              >
                Add {quantity} to cart
              </button>
              <Link to="/cart" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Review cart
              </Link>
            </div>

            <div className="mt-6 grid gap-3 text-sm leading-6 text-slate-600">
              <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                Order submission reserves stock in real time. Adding to cart alone does not hold inventory.
              </div>
              <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                Related products now come from the search-service so category adjacency matches storefront search behavior.
              </div>
            </div>
          </div>

          <div className="market-panel rounded-[34px] px-6 py-6 text-sm leading-7 text-slate-600">
            <div className="font-semibold text-slate-950">Why shoppers choose this</div>
            <div className="mt-4 grid gap-3">
              {signals.map((signal) => (
                <div key={signal} className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
                  {signal}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-10 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="market-panel rounded-[34px] px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Need to know</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">A clearer product overview before checkout</h2>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-slate-600">
            <DetailRow label="Category" value={product.categoryName} />
            <DetailRow label="Category code" value={product.categoryCode} />
            <DetailRow label="Inventory state" value={product.stockQuantity > 0 ? `${product.stockQuantity} units available` : 'Temporarily unavailable'} />
            <DetailRow label="Reservation model" value="Inventory is reserved during order submission" />
          </div>
        </div>

        <div className="market-panel rounded-[34px] px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Category context</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">More from {department.label}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Shoppers usually compare a few adjacent items before checkout. These matches come from the OpenSearch category slice.
          </p>

          {relatedProducts.length === 0 ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
              No additional category matches are available right now.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {relatedProducts.map((entry) => (
                <ProductCard key={entry.id} product={entry} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface BuyboxPillProps {
  label: string;
  value: string;
}

function BuyboxPill({ label, value }: BuyboxPillProps) {
  return (
    <div className="rounded-[20px] bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 font-semibold text-slate-950">{value}</div>
    </div>
  );
}
