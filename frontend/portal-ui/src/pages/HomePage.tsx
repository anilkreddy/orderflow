import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingPanel } from '../components/LoadingPanel';
import { ProductCard } from '../components/ProductCard';
import { SectionHeading } from '../components/SectionHeading';
import { departments, getDepartmentForProduct } from '../lib/catalog';
import { productApi, toApiMessage } from '../lib/api';
import { formatCurrency } from '../lib/format';
import type { Product } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productApi.list();
        setProducts(data.filter((product) => product.active));
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load storefront products'));
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  const assortmentStats = useMemo(() => {
    const totalInventory = products.reduce((sum, product) => sum + product.stockQuantity, 0);
    const averagePrice = products.length > 0 ? products.reduce((sum, product) => sum + product.price, 0) / products.length : 0;
    return { totalInventory, averagePrice };
  }, [products]);

  const popularPicks = useMemo(() => products.slice(0, 8), [products]);
  const valuePicks = useMemo(() => [...products].sort((left, right) => left.price - right.price).slice(0, 4), [products]);
  const fastDispatchPicks = useMemo(
    () => [...products].sort((left, right) => right.stockQuantity - left.stockQuantity).slice(0, 4),
    [products],
  );
  const departmentHighlights = useMemo(() => {
    return departments
      .map((department) => ({
        department,
        count: products.filter((product) => getDepartmentForProduct(product).key === department.key).length,
      }))
      .filter((entry) => entry.count > 0)
      .slice(0, 6);
  }, [products]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Loading storefront..." />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <section className="mx-auto max-w-[1480px] px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="market-hero rounded-[40px] px-6 py-8 text-white md:px-9 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-200">Customer Marketplace</p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-white md:text-6xl xl:text-7xl">
              Big-value shopping on a real OrderFlow checkout.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
              Browse live products, add them to your basket, and submit orders through the same gateway-backed services that power the rest of the platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="inline-flex items-center rounded-full bg-[#ffcd38] px-6 py-3 text-sm font-semibold text-[#08162c] transition hover:bg-[#ffd962]">
                Start shopping
              </Link>
              <Link to="/track-order" className="inline-flex items-center rounded-full border border-white/20 bg-white/8 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/14">
                Track an order
              </Link>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-200">Active products</div>
                <div className="mt-3 text-3xl font-extrabold text-white">{products.length}</div>
              </div>
              <div className="rounded-[24px] bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-200">Inventory live</div>
                <div className="mt-3 text-3xl font-extrabold text-white">{assortmentStats.totalInventory}</div>
              </div>
              <div className="rounded-[24px] bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-200">Average price</div>
                <div className="mt-3 text-3xl font-extrabold text-white">{formatCurrency(assortmentStats.averagePrice)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="market-promo rounded-[34px] px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Today’s focus</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Shop active inventory with practical filters and fast basket flow.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The portal is now shaped like a retail marketplace, not an internal dashboard. Customers land in shopping, not operations.
              </p>
              <button
                type="button"
                className="mt-6 inline-flex items-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]"
                onClick={() => navigate('/shop')}
              >
                Explore the catalog
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="market-promo rounded-[30px] px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Checkout</p>
                <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">Guest-friendly and direct</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Customers can place live orders without switching into an internal flow.</p>
              </div>
              <div className="market-promo rounded-[30px] px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Order lookup</p>
                <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">Self-service tracking</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use checkout email and order id to pull order details directly from the order service.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 md:px-6">
        <div className="market-strip grid gap-3 rounded-[32px] px-5 py-5 text-sm text-slate-700 md:grid-cols-4 md:px-7">
          {[
            'Live catalog only shows active products',
            'Checkout reserves stock in the backend',
            'Orders route through the API gateway',
            'Backoffice controls stay isolated from shoppers',
          ].map((item) => (
            <div key={item} className="rounded-full bg-white/70 px-4 py-3 text-center font-medium shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Departments</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Shop by retail-style assortment</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-[#0f63ff] underline decoration-slate-300 underline-offset-4">
            Browse every product
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {departmentHighlights.map(({ department, count }) => (
            <button
              key={department.key}
              type="button"
              className="market-panel rounded-[26px] px-4 py-4 text-left transition hover:-translate-y-1"
              onClick={() => navigate(`/shop?category=${encodeURIComponent(department.key)}`)}
            >
              <div className="text-sm font-semibold text-slate-950">{department.label}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{department.blurb}</div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">{count} item(s)</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-6 md:px-6">
        <SectionHeading
          eyebrow="Popular Right Now"
          title="Marketplace picks customers would notice first"
          description="This shelf uses the live catalog and prioritizes items the portal can actually sell right now."
          action={<Link to="/shop" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">View all</Link>}
        />

        {error ? <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="market-scroll mt-8 flex gap-5 overflow-x-auto pb-2">
          {popularPicks.map((product) => (
            <div key={product.id} className="w-[290px] shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1480px] gap-6 px-4 py-10 md:px-6 xl:grid-cols-2">
        <div className="market-panel rounded-[34px] px-6 py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Value picks</p>
              <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Budget-friendly finds</h3>
            </div>
            <Link to="/shop" className="text-sm font-semibold text-[#0f63ff] underline decoration-slate-300 underline-offset-4">
              Shop more
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {valuePicks.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`} className="rounded-[26px] bg-white px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-1">
                <div className="text-sm font-semibold text-slate-950">{product.name}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{product.description}</div>
                <div className="mt-4 text-2xl font-extrabold text-slate-950">{formatCurrency(product.price)}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="market-panel rounded-[34px] px-6 py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Fast dispatch</p>
              <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Ready-to-move inventory</h3>
            </div>
            <Link to="/track-order" className="text-sm font-semibold text-[#0f63ff] underline decoration-slate-300 underline-offset-4">
              Track orders
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {fastDispatchPicks.map((product) => (
              <button
                key={product.id}
                type="button"
                className="rounded-[26px] bg-white px-4 py-4 text-left shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-1"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                <div className="text-sm font-semibold text-slate-950">{product.name}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{getDepartmentForProduct(product).label}</div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-2xl font-extrabold text-slate-950">{formatCurrency(product.price)}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    {product.stockQuantity} ready
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
