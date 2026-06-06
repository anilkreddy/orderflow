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
  const [heroIndex, setHeroIndex] = useState(0);

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
  const heroBanners = useMemo(
    () => [
      {
        eyebrow: 'Fresh deals',
        title: 'Live inventory, daily essentials, and high-intent category offers.',
        description:
          'Browse active inventory, compare practical everyday picks, and move straight into a real Oflio Commerce checkout flow.',
        primaryLabel: 'Shop all products',
        primaryAction: () => navigate('/shop'),
        secondaryLabel: 'Track an order',
        secondaryAction: () => navigate('/track-order'),
        statLabel: 'Active products',
        statValue: `${products.length}`,
        accentLabel: 'Ready inventory',
        accentValue: `${assortmentStats.totalInventory} units`,
        imageUrl: 'https://images.pexels.com/photos/34577/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1800',
        imageCredit: 'Image via Pexels',
      },
      {
        eyebrow: 'Department spotlight',
        title: 'Shop electronics, home upgrades, pantry staples, and everyday value.',
        description:
          'The storefront is structured like a retail marketplace, with department-led discovery and quick access to the products customers can actually buy right now.',
        primaryLabel: 'Browse departments',
        primaryAction: () => navigate('/shop'),
        secondaryLabel: 'Home & Kitchen',
        secondaryAction: () => navigate('/shop?category=home-kitchen'),
        statLabel: 'Featured departments',
        statValue: `${departmentHighlights.length}`,
        accentLabel: 'Average price',
        accentValue: formatCurrency(assortmentStats.averagePrice),
        imageUrl: 'https://images.pexels.com/photos/6956803/pexels-photo-6956803.jpeg?auto=compress&cs=tinysrgb&w=1800',
        imageCredit: 'Image via Pexels',
      },
      {
        eyebrow: 'Checkout confidence',
        title: 'Guest-friendly checkout with direct order tracking after purchase.',
        description:
          'Customers can place an order without stepping into an internal workflow, then check status from the same storefront using their order id and email.',
        primaryLabel: 'Start checkout flow',
        primaryAction: () => navigate('/cart'),
        secondaryLabel: 'Open order lookup',
        secondaryAction: () => navigate('/track-order'),
        statLabel: 'Self-service flow',
        statValue: 'Guest checkout',
        accentLabel: 'Order visibility',
        accentValue: 'Live status lookup',
        imageUrl: 'https://images.pexels.com/photos/7620626/pexels-photo-7620626.jpeg?auto=compress&cs=tinysrgb&w=1800',
        imageCredit: 'Image via Pexels',
      },
      {
        eyebrow: 'Grocery run',
        title: 'Weekly staples, pantry restocks, and fast-moving supermarket picks.',
        description:
          'Use a storefront that feels familiar to shoppers: full-width merchandising, clear category paths, and real backend inventory behind every purchase.',
        primaryLabel: 'Shop grocery & gourmet',
        primaryAction: () => navigate('/shop?category=grocery-gourmet'),
        secondaryLabel: 'Browse pet & home',
        secondaryAction: () => navigate('/shop?category=pet-supplies'),
        statLabel: 'Live departments',
        statValue: `${departmentHighlights.length}`,
        accentLabel: 'Marketplace flow',
        accentValue: 'Retail-first browsing',
        imageUrl: 'https://images.pexels.com/photos/4199256/pexels-photo-4199256.jpeg?auto=compress&cs=tinysrgb&w=1800',
        imageCredit: 'Image via Pexels',
      },
    ],
    [assortmentStats.averagePrice, assortmentStats.totalInventory, departmentHighlights.length, navigate, products.length],
  );
  const activeHero = heroBanners[heroIndex];

  useEffect(() => {
    if (heroBanners.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroBanners.length);
    }, 5600);

    return () => window.clearInterval(intervalId);
  }, [heroBanners.length]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Loading storefront..." />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <section className="relative overflow-hidden bg-[#08162c]">
        <div className="absolute inset-0 bg-slate-900">
          <img
            key={activeHero.imageUrl}
            src={activeHero.imageUrl}
            alt={activeHero.title}
            className="h-full w-full object-cover opacity-100 transition-opacity duration-700"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,22,44,0.9)_0%,rgba(8,22,44,0.72)_36%,rgba(8,22,44,0.28)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,44,0.12)_0%,rgba(8,22,44,0.32)_100%)]" />

        <div className="relative mx-auto flex min-h-[72vh] max-w-[1480px] items-end px-4 py-10 md:px-6 md:py-12">
          <button
            type="button"
            aria-label="Previous banner"
            className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white backdrop-blur-sm transition hover:bg-white/18 lg:inline-flex"
            onClick={() => setHeroIndex((current) => (current - 1 + heroBanners.length) % heroBanners.length)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next banner"
            className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white backdrop-blur-sm transition hover:bg-white/18 lg:inline-flex"
            onClick={() => setHeroIndex((current) => (current + 1) % heroBanners.length)}
          >
            ›
          </button>

          <div className="w-full">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-100 backdrop-blur-sm">
                  {activeHero.eyebrow}
                </span>
                <span className="rounded-full bg-[#ffcd38] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#08162c]">
                  {activeHero.imageCredit}
                </span>
              </div>

              <h1 className="mt-6 max-w-4xl font-display text-4xl font-extrabold tracking-tight text-white md:text-6xl xl:text-7xl">
                {activeHero.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100 md:text-lg">
                {activeHero.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-[#ffcd38] px-6 py-3 text-sm font-semibold text-[#08162c] transition hover:bg-[#ffd962]"
                  onClick={activeHero.primaryAction}
                >
                  {activeHero.primaryLabel}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-white/18 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/16"
                  onClick={activeHero.secondaryAction}
                >
                  {activeHero.secondaryLabel}
                </button>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid gap-3 md:grid-cols-3 xl:max-w-4xl xl:flex-1">
                <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-100">{activeHero.statLabel}</div>
                  <div className="mt-3 text-3xl font-extrabold text-white">{activeHero.statValue}</div>
                </div>
                <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-100">{activeHero.accentLabel}</div>
                  <div className="mt-3 text-3xl font-extrabold text-white">{activeHero.accentValue}</div>
                </div>
                <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-100">Live departments</div>
                  <div className="mt-3 text-3xl font-extrabold text-white">{departmentHighlights.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start xl:self-auto">
                {heroBanners.map((banner, index) => (
                  <button
                    key={banner.eyebrow}
                    type="button"
                    aria-label={`Show banner ${index + 1}`}
                    className={[
                      'h-2.5 rounded-full border border-white/10 bg-white/32 transition-all duration-300',
                      index === heroIndex ? 'w-10 bg-white' : 'w-2.5 hover:bg-white/70',
                    ].join(' ')}
                    onClick={() => setHeroIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="market-promo rounded-[34px] px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Today’s focus</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Shop active inventory with practical filters and fast basket flow.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              The portal behaves like a customer storefront first: discovery, checkout, and order lookup stay front and center while admin operations stay separate.
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
