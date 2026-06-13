import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { ProductCard } from '../components/ProductCard';
import { SectionHeading } from '../components/SectionHeading';
import { categoryApi, searchApi, toApiMessage } from '../lib/api';
import { departments, getLeadBadge } from '../lib/catalog';
import { notifyCartItemAdded, useCart } from '../lib/cart';
import { formatCurrency } from '../lib/format';
import type { Category, Product, ProductSearchResponse } from '../types';

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'inventory', label: 'Best stocked' },
  { value: 'newest', label: 'Newest arrivals' },
] as const;

type SortValue = (typeof sortOptions)[number]['value'];

const emptySearchResponse: ProductSearchResponse = {
  items: [],
  total: 0,
  page: 0,
  size: 24,
  hasNext: false,
  facets: {
    categories: [],
    priceBands: [],
    availability: {
      inStockCount: 0,
      outOfStockCount: 0,
      activeCount: 0,
      inactiveCount: 0,
    },
  },
};

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResponse, setSearchResponse] = useState<ProductSearchResponse>(emptySearchResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>('featured');
  const [draftSearch, setDraftSearch] = useState(searchParams.get('q') ?? '');

  const query = searchParams.get('q') ?? '';
  const activeFocus = searchParams.get('focus') ?? 'all';
  const activeCategoryCode = useMemo(() => resolveCategoryCode(searchParams, categories), [categories, searchParams]);

  useEffect(() => {
    setDraftSearch(query);
  }, [query]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await categoryApi.list();
        setCategories(data.filter((category) => category.active));
      } catch {
        setCategories([]);
      }
    }

    void loadCategories();
  }, []);

  useEffect(() => {
    async function loadSearchResults() {
      setLoading(true);
      try {
        const data = await searchApi.search({
          q: query || undefined,
          categoryCode: activeCategoryCode ?? undefined,
          active: true,
          inStock: activeFocus === 'in-stock' ? true : undefined,
          minStock: activeFocus === 'fast-dispatch' ? 20 : undefined,
          minPrice: activeFocus === 'premium' ? 150 : undefined,
          maxPrice: activeFocus === 'value' ? 50 : undefined,
          sort,
          page: 0,
          size: 24,
        });
        setSearchResponse(data);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load storefront search results'));
        setSearchResponse(emptySearchResponse);
      } finally {
        setLoading(false);
      }
    }

    void loadSearchResults();
  }, [activeCategoryCode, activeFocus, query, sort]);

  const selectedCategory = useMemo(() => {
    if (!activeCategoryCode) {
      return null;
    }

    return categories.find((category) => category.code === activeCategoryCode)
      ?? fallbackCategory(activeCategoryCode);
  }, [activeCategoryCode, categories]);

  const heroProduct = searchResponse.items[0] ?? null;
  const remainingProducts = heroProduct ? searchResponse.items.slice(1) : [];

  const listingStats = useMemo(() => {
    const items = searchResponse.items;
    const inStockCount = items.filter((product) => product.stockQuantity > 0).length;
    const averagePrice = items.length > 0 ? items.reduce((sum, product) => sum + product.price, 0) / items.length : 0;
    const premiumCount = items.filter((product) => product.price >= 150).length;

    return {
      inStockCount,
      averagePrice,
      premiumCount,
    };
  }, [searchResponse.items]);

  function updateCategory(categoryCode: string | null) {
    const next = new URLSearchParams(searchParams);
    next.delete('department');
    if (categoryCode) {
      next.set('category', categoryCode);
    } else {
      next.delete('category');
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
    next.delete('department');
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

  const browseBlurb = selectedCategory ? getCategoryBlurb(selectedCategory.code, selectedCategory.name) : 'Search, filter, and compare products in a marketplace-style grid backed by the OpenSearch catalog.';

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <div className="market-panel rounded-[36px] px-6 py-6 md:px-8 md:py-8">
        <SectionHeading
          eyebrow="Shop"
          title={selectedCategory ? `${selectedCategory.name} for everyday baskets and bigger purchases` : 'Browse the active catalog'}
          description={selectedCategory ? `${browseBlurb} Search results now flow through the dedicated search-service and OpenSearch index.` : browseBlurb}
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
              !activeCategoryCode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ].join(' ')}
            onClick={() => updateCategory(null)}
          >
            All categories
          </button>
          {categories.map((category) => (
            <button
              key={category.code}
              type="button"
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeCategoryCode === category.code ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
              onClick={() => updateCategory(category.code)}
            >
              {category.name}
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
          <ShopMetric label="Matching results" value={`${searchResponse.total}`} detail={`Showing ${searchResponse.items.length} product(s) in the current view`} />
          <ShopMetric label="In stock now" value={`${listingStats.inStockCount}`} detail="Ready for basket and checkout" />
          <ShopMetric label="Average price" value={formatCurrency(listingStats.averagePrice)} detail={`${listingStats.premiumCount} premium options in this page`} />
        </div>
      </div>

      {error ? <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="market-panel h-fit rounded-[32px] px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Shopping snapshot</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
            <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
              <div className="font-semibold text-slate-950">{searchResponse.total} matching product(s)</div>
              <div className="mt-1">Search is now served from OpenSearch through the gateway-backed search-service.</div>
            </div>
            <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
              <div className="font-semibold text-slate-950">Category</div>
              <div className="mt-1">{selectedCategory?.name ?? 'All categories'}</div>
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
          {searchResponse.total === 0 ? (
            <EmptyState
              title="No products match the current view"
              description="Try a broader search or switch categories to see more of the active catalog."
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
                        <span>{heroProduct.stockQuantity > 0 ? `${heroProduct.stockQuantity} units ready to reserve` : 'Currently unavailable'}</span>
                        <span>{formatCurrency(heroProduct.price)}</span>
                        <span>{heroProduct.active ? 'Available in the live checkout flow' : 'Inactive catalog item'}</span>
                      </div>
                    </div>

                    <div className="rounded-[30px] bg-slate-50 px-5 py-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Best-match buy box</div>
                      <div className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">{formatCurrency(heroProduct.price)}</div>
                      <div className="mt-2 text-sm leading-7 text-slate-600">
                        Search surfaced this product based on your current query, filters, and sort mode.
                      </div>
                      <div className="mt-5 grid gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300"
                          disabled={heroProduct.stockQuantity === 0}
                          onClick={(event) => {
                            addItem(heroProduct.id, 1);
                            notifyCartItemAdded(event.currentTarget, heroProduct.name);
                          }}
                        >
                          Add to cart
                        </button>
                        <Link to={`/products/${heroProduct.id}`} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                          View details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {remainingProducts.length === 0 ? null : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {remainingProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
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
    <div className="rounded-[26px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm text-slate-600">{detail}</div>
    </div>
  );
}

function resolveCategoryCode(searchParams: URLSearchParams, categories: Category[]) {
  const explicitCategory = searchParams.get('category');
  if (explicitCategory) {
    return explicitCategory.trim().toLowerCase();
  }

  const legacyDepartment = searchParams.get('department');
  if (!legacyDepartment) {
    return null;
  }

  const normalizedDepartment = legacyDepartment.trim().toLowerCase();
  const categoryMatch = categories.find((category) => category.name.toLowerCase() === normalizedDepartment || category.code === normalizedDepartment);
  if (categoryMatch) {
    return categoryMatch.code;
  }

  const departmentMatch = departments.find((department) => department.label.toLowerCase() === normalizedDepartment || department.key === normalizedDepartment);
  return departmentMatch?.key ?? null;
}

function fallbackCategory(categoryCode: string) {
  const department = departments.find((entry) => entry.key === categoryCode);
  if (!department) {
    return null;
  }

  return {
    code: department.key,
    name: department.label,
    active: true,
    createdAt: '',
    updatedAt: '',
  } satisfies Category;
}

function getCategoryBlurb(categoryCode: string, categoryName: string) {
  const department = departments.find((entry) => entry.key === categoryCode || entry.label === categoryName);
  return department?.blurb ?? `${categoryName} shoppers can compare availability, price, and checkout readiness from the live catalog.`;
}
