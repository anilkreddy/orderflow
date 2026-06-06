import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { ProductCard } from '../components/ProductCard';
import { SectionHeading } from '../components/SectionHeading';
import { departments, getDepartmentForProduct, getLeadBadge, getMerchandisingSignals, getReviewSnapshot } from '../lib/catalog';
import { productApi, toApiMessage } from '../lib/api';
import { useCart } from '../lib/cart';
import { formatCurrency } from '../lib/format';
import type { Product } from '../types';

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'inventory', label: 'Best stocked' },
] as const;

type SortValue = (typeof sortOptions)[number]['value'];

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>('featured');
  const [draftSearch, setDraftSearch] = useState(searchParams.get('q') ?? '');

  const query = searchParams.get('q') ?? '';
  const activeDepartment = searchParams.get('department') ?? 'All departments';
  const activeFocus = searchParams.get('focus') ?? 'all';

  useEffect(() => {
    setDraftSearch(query);
  }, [query]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productApi.list();
        setProducts(data.filter((product) => product.active));
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load products'));
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  const departmentCounts = useMemo(() => {
    return departments.map((department) => ({
      label: department.label,
      count: products.filter((product) => getDepartmentForProduct(product).key === department.key).length,
    }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const normalized = `${product.name} ${product.categoryCode} ${product.categoryName} ${product.description}`.toLowerCase();
      const matchesQuery = normalized.includes(query.trim().toLowerCase());
      const matchesDepartment =
        activeDepartment === 'All departments' || getDepartmentForProduct(product).label === activeDepartment;
      const matchesFocus =
        activeFocus === 'all' ||
        (activeFocus === 'in-stock' && product.stockQuantity > 0) ||
        (activeFocus === 'value' && product.price <= 50) ||
        (activeFocus === 'premium' && product.price >= 150) ||
        (activeFocus === 'fast-dispatch' && product.stockQuantity >= 20);
      return matchesQuery && matchesDepartment && matchesFocus;
    });
  }, [activeDepartment, activeFocus, products, query]);

  const sortedProducts = useMemo(() => {
    const next = [...filteredProducts];
    switch (sort) {
      case 'price-low':
        return next.sort((left, right) => left.price - right.price);
      case 'price-high':
        return next.sort((left, right) => right.price - left.price);
      case 'inventory':
        return next.sort((left, right) => right.stockQuantity - left.stockQuantity);
      default:
        return next;
    }
  }, [filteredProducts, sort]);

  const heroProduct = sortedProducts[0] ?? null;
  const remainingProducts = heroProduct ? sortedProducts.slice(1) : [];
  const selectedDepartment = departments.find((department) => department.label === activeDepartment) ?? null;

  const listingStats = useMemo(() => {
    const inStockCount = sortedProducts.filter((product) => product.stockQuantity > 0).length;
    const averagePrice =
      sortedProducts.length > 0 ? sortedProducts.reduce((sum, product) => sum + product.price, 0) / sortedProducts.length : 0;
    const premiumCount = sortedProducts.filter((product) => product.price >= 150).length;

    return {
      inStockCount,
      averagePrice,
      premiumCount,
    };
  }, [sortedProducts]);

  function updateDepartment(department: string) {
    const next = new URLSearchParams(searchParams);
    if (department === 'All departments') {
      next.delete('department');
    } else {
      next.set('department', department);
    }
    setSearchParams(next);
  }

  function updateFocus(focus: string) {
    const next = new URLSearchParams(searchParams);
    if (focus === 'all') {
      next.delete('focus');
    } else {
      next.set('focus', focus);
    }
    setSearchParams(next);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (draftSearch.trim()) {
      next.set('q', draftSearch.trim());
    } else {
      next.delete('q');
    }
    setSearchParams(next);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
        <LoadingPanel message="Loading the shop..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <div className="market-panel rounded-[36px] px-6 py-6 md:px-8 md:py-8">
        <SectionHeading
          eyebrow="Shop"
          title={selectedDepartment ? `${selectedDepartment.label} for everyday baskets and bigger purchases` : 'Browse the active catalog'}
          description={
            selectedDepartment
              ? `${selectedDepartment.blurb} Filter, compare, and move directly into checkout from the live OrderFlow catalog.`
              : 'Search, filter, and compare products in a marketplace-style grid backed by the live product service.'
          }
        />

        <div className="mt-8 grid gap-4 xl:grid-cols-[1fr_220px] xl:items-end">
          <form className="field-shell flex items-center rounded-full bg-white px-3 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.04)]" onSubmit={handleSearchSubmit}>
            <input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              className="w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Search the live catalog"
            />
            <button type="submit" className="rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]">
              Search
            </button>
          </form>

          <label className="text-sm font-medium text-slate-700">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortValue)}
              className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0f63ff]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className={[
              'rounded-full px-4 py-2 text-sm font-medium transition',
              activeDepartment === 'All departments' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ].join(' ')}
            onClick={() => updateDepartment('All departments')}
          >
            All departments
          </button>
          {departmentCounts.map((department) => (
            <button
              key={department.label}
              type="button"
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeDepartment === department.label
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
              onClick={() => updateDepartment(department.label)}
            >
              {department.label} ({department.count})
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All picks' },
            { value: 'in-stock', label: 'In stock now' },
            { value: 'fast-dispatch', label: 'Fast dispatch' },
            { value: 'value', label: 'Value buys' },
            { value: 'premium', label: 'Premium picks' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={[
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                activeFocus === option.value || (activeFocus === 'all' && option.value === 'all')
                  ? 'border-[#0f63ff] bg-[#e9f0ff] text-[#0f63ff]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => updateFocus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <ShopMetric label="Matching results" value={`${sortedProducts.length}`} detail="Live catalog items after filters" />
          <ShopMetric label="In stock now" value={`${listingStats.inStockCount}`} detail="Ready for basket and checkout" />
          <ShopMetric label="Average price" value={formatCurrency(listingStats.averagePrice)} detail={`${listingStats.premiumCount} premium options in view`} />
        </div>
      </div>

      {error ? <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="market-panel h-fit rounded-[32px] px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Shopping snapshot</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
            <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
              <div className="font-semibold text-slate-950">{sortedProducts.length} matching product(s)</div>
              <div className="mt-1">Active filters update instantly without leaving the portal.</div>
            </div>
            <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
              <div className="font-semibold text-slate-950">Department</div>
              <div className="mt-1">{activeDepartment}</div>
            </div>
            <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
              <div className="font-semibold text-slate-950">Search query</div>
              <div className="mt-1">{query || 'None applied'}</div>
            </div>
            <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
              <div className="font-semibold text-slate-950">Browse focus</div>
              <div className="mt-1 capitalize">{activeFocus.replace('-', ' ')}</div>
            </div>
          </div>
        </aside>

        <div>
          {sortedProducts.length === 0 ? (
            <EmptyState
              title="No products match the current view"
              description="Try a broader search or switch departments to see more of the active catalog."
            />
          ) : (
            <div className="space-y-6">
              {heroProduct ? (
                <div className="market-panel rounded-[34px] px-6 py-6">
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#0f63ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
                          Best match
                        </span>
                        <span className="rounded-full bg-[#ffefbf] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7a5200]">
                          {getLeadBadge(heroProduct)}
                        </span>
                        <span className="text-sm font-medium text-slate-500">{heroProduct.categoryName}</span>
                      </div>
                      <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">{heroProduct.name}</h2>
                      <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{heroProduct.description}</p>

                      <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-600">
                        <div className="flex items-center gap-2 text-[#f59e0b]">
                          <span className="text-lg">★</span>
                          <span className="font-semibold text-slate-900">{getReviewSnapshot(heroProduct).rating}</span>
                          <span>{getReviewSnapshot(heroProduct).reviews} ratings</span>
                        </div>
                        <span>{heroProduct.stockQuantity} available</span>
                        <span>{heroProduct.categoryCode}</span>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          to={`/products/${heroProduct.id}`}
                          className="inline-flex items-center rounded-full bg-[#0f63ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]"
                        >
                          View details
                        </Link>
                        <button
                          type="button"
                          onClick={() => addItem(heroProduct.id, 1)}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Add to cart
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                      {getMerchandisingSignals(heroProduct).map((signal) => (
                        <div key={signal} className="rounded-[26px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
                          <div className="text-sm font-semibold text-slate-950">{signal}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-600">
                            {signal === 'Fast-moving inventory'
                              ? 'Good fit for shoppers who want less fulfillment uncertainty.'
                              : signal === 'Higher-consideration purchase'
                                ? 'Useful when customers are comparing quality, margin, and urgency.'
                                : 'Aligned with the current department browse context.'}
                          </div>
                        </div>
                      ))}
                      <div className="rounded-[26px] bg-[#0b1730] px-5 py-5 text-white">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Current price</div>
                        <div className="mt-3 text-4xl font-extrabold tracking-tight">{formatCurrency(heroProduct.price)}</div>
                        <div className="mt-2 text-sm text-slate-300">Guest checkout uses live stock reservation at order submission.</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Product listing</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                    {remainingProducts.length > 0 ? `${remainingProducts.length} more item(s) to browse` : 'Current matched assortment'}
                  </h3>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {(remainingProducts.length > 0 ? remainingProducts : sortedProducts).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ShopMetricProps {
  label: string;
  value: string;
  detail: string;
}

function ShopMetric({ label, value, detail }: ShopMetricProps) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{detail}</div>
    </div>
  );
}
