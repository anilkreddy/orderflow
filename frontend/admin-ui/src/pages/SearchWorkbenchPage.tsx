import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { categoryApi, searchApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format';
import type { Category, ProductSearchResponse, ReindexResponse, SearchSynonymGroup, SearchTuning } from '../types';

const sortOptions = [
  { value: 'featured', label: 'Featured relevance' },
  { value: 'popular', label: 'Popularity first' },
  { value: 'inventory', label: 'Inventory depth' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest updates' },
] as const;

type SortValue = (typeof sortOptions)[number]['value'];
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const emptySearchResponse: ProductSearchResponse = {
  items: [],
  total: 0,
  page: 0,
  size: 12,
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

export function SearchWorkbenchPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResponse, setSearchResponse] = useState<ProductSearchResponse>(emptySearchResponse);
  const [tuning, setTuning] = useState<SearchTuning | null>(null);
  const [synonyms, setSynonyms] = useState<SearchSynonymGroup[]>([]);
  const [query, setQuery] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [priceBand, setPriceBand] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ACTIVE');
  const [sort, setSort] = useState<SortValue>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [savingSynonym, setSavingSynonym] = useState(false);
  const [deletingSynonymId, setDeletingSynonymId] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reindexResult, setReindexResult] = useState<ReindexResponse | null>(null);
  const [editingSynonymId, setEditingSynonymId] = useState<string | null>(null);
  const [synonymDraft, setSynonymDraft] = useState('');

  useEffect(() => {
    async function loadBootstrap() {
      setBootstrapping(true);
      try {
        const [categoryData, tuningData, synonymData] = await Promise.all([
          categoryApi.list(),
          searchApi.tuning(),
          searchApi.synonyms(),
        ]);
        setCategories(categoryData);
        setTuning(tuningData);
        setSynonyms(synonymData);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load search operations data'));
      } finally {
        setBootstrapping(false);
      }
    }

    void loadBootstrap();
  }, []);

  useEffect(() => {
    async function loadSearchPreview() {
      setLoadingPreview(true);
      try {
        const data = await searchApi.search({
          q: query.trim() || undefined,
          categoryCode: categoryCode || undefined,
          active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
          inStock: inStockOnly ? true : undefined,
          priceBand: priceBand || undefined,
          sort,
          page: 0,
          size: 12,
        });
        setSearchResponse(data);
        setError(null);
      } catch (loadError) {
        setSearchResponse(emptySearchResponse);
        setError(toApiMessage(loadError, 'Unable to load search preview'));
      } finally {
        setLoadingPreview(false);
      }
    }

    void loadSearchPreview();
  }, [activeFilter, categoryCode, inStockOnly, previewNonce, priceBand, query, sort]);

  const selectedCategoryName = useMemo(() => {
    if (!categoryCode) {
      return 'All categories';
    }
    return categories.find((category) => category.code === categoryCode)?.name ?? categoryCode;
  }, [categories, categoryCode]);

  const selectedPriceBandLabel = useMemo(() => {
    if (!priceBand) {
      return 'Any price';
    }
    return searchResponse.facets.priceBands.find((band) => band.code === priceBand)?.label ?? priceBand;
  }, [priceBand, searchResponse.facets.priceBands]);

  const filterSummary = useMemo(
    () => [selectedCategoryName, selectedPriceBandLabel, activeFilter === 'ALL' ? 'All states' : activeFilter === 'ACTIVE' ? 'Active only' : 'Inactive only', inStockOnly ? 'In stock only' : 'Availability open'],
    [activeFilter, inStockOnly, selectedCategoryName, selectedPriceBandLabel],
  );

  function resetSynonymComposer() {
    setEditingSynonymId(null);
    setSynonymDraft('');
  }

  function startEditingSynonym(group: SearchSynonymGroup) {
    setEditingSynonymId(group.id);
    setSynonymDraft(group.terms.join(', '));
    setNotice(null);
  }

  async function refreshSynonymsAndTuning() {
    const [tuningData, synonymData] = await Promise.all([searchApi.tuning(), searchApi.synonyms()]);
    setTuning(tuningData);
    setSynonyms(synonymData);
  }

  async function handleReindex() {
    setReindexing(true);
    setNotice(null);
    try {
      const result = await searchApi.reindex();
      setReindexResult(result);
      setNotice(`Search index rebuilt with ${formatNumber(result.indexedCount)} products.`);
      const refreshedSearch = await searchApi.search({
        q: query.trim() || undefined,
        categoryCode: categoryCode || undefined,
        active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
        inStock: inStockOnly ? true : undefined,
        priceBand: priceBand || undefined,
        sort,
        page: 0,
        size: 12,
      });
      setSearchResponse(refreshedSearch);
      setError(null);
    } catch (reindexError) {
      setError(toApiMessage(reindexError, 'Unable to rebuild the search index'));
    } finally {
      setReindexing(false);
    }
  }

  async function handleSynonymSubmit() {
    const terms = synonymDraft
      .split(',')
      .map((term) => term.trim())
      .filter(Boolean);

    if (terms.length < 2) {
      setError('Enter at least two comma-separated synonym terms.');
      return;
    }

    setSavingSynonym(true);
    setNotice(null);
    try {
      if (editingSynonymId) {
        await searchApi.updateSynonym(editingSynonymId, { terms });
        setNotice('Synonym group updated. Search preview now uses the new expansion rules.');
      } else {
        await searchApi.createSynonym({ terms });
        setNotice('Synonym group added. Search preview now uses the new expansion rules.');
      }
      await refreshSynonymsAndTuning();
      setPreviewNonce((current) => current + 1);
      resetSynonymComposer();
      setError(null);
    } catch (saveError) {
      setError(toApiMessage(saveError, 'Unable to save synonym group'));
    } finally {
      setSavingSynonym(false);
    }
  }

  async function handleDeleteSynonym(group: SearchSynonymGroup) {
    const shouldDelete = window.confirm(`Delete synonym group \"${group.primaryTerm}\"?`);
    if (!shouldDelete) {
      return;
    }

    setDeletingSynonymId(group.id);
    setNotice(null);
    try {
      await searchApi.removeSynonym(group.id);
      await refreshSynonymsAndTuning();
      setPreviewNonce((current) => current + 1);
      if (editingSynonymId === group.id) {
        resetSynonymComposer();
      }
      setNotice('Synonym group deleted.');
      setError(null);
    } catch (deleteError) {
      setError(toApiMessage(deleteError, 'Unable to delete synonym group'));
    } finally {
      setDeletingSynonymId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Search Ops"
        title="Search operations and synonym library"
        description="Use one operational surface to preview live product ranking, inspect facet coverage, rebuild the index, and manage synonym groups that influence relevance in real time."
        action={
          <button
            type="button"
            onClick={() => void handleReindex()}
            disabled={reindexing}
            className="inline-flex items-center rounded-full bg-[#2558f5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1947db] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reindexing ? 'Rebuilding index...' : 'Rebuild index'}
          </button>
        }
      />

      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="space-y-5">
          <AdminPanel className="overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Search preview</p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Live ranking and filter validation</h2>
                  <p className="mt-2 text-sm text-slate-500">Preview the same OpenSearch response shape used by the storefront, including score, popularity, and facet counts.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={loadingPreview ? 'warning' : 'success'}>{loadingPreview ? 'Refreshing' : 'Live'}</StatusPill>
                  <StatusPill tone="info">{formatNumber(searchResponse.total)} matches</StatusPill>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-medium text-slate-600 xl:col-span-2">
                Query
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search terms to validate relevance and synonym expansion"
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Sort order
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortValue)}
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-600">
                Category
                <select
                  value={categoryCode}
                  onChange={(event) => setCategoryCode(event.target.value)}
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-600">
                Price band
                <select
                  value={priceBand}
                  onChange={(event) => setPriceBand(event.target.value)}
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                >
                  <option value="">Any price</option>
                  {searchResponse.facets.priceBands.map((band) => (
                    <option key={band.code} value={band.code}>
                      {band.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-600">
                Product state
                <select
                  value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                >
                  <option value="ACTIVE">Active only</option>
                  <option value="INACTIVE">Inactive only</option>
                  <option value="ALL">All states</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#2558f5]"
                />
                In-stock results only
              </label>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-4">
              {filterSummary.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                  {item}
                </span>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Inventory</th>
                    <th className="px-5 py-4">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {searchResponse.items.map((product) => (
                    <tr key={product.id} className="text-slate-600">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-950">{product.name}</div>
                        <div className="mt-1 max-w-xl text-slate-500">{product.description}</div>
                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">SKU #{product.id}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-950">{product.score.toFixed(2)}</div>
                        <div className="mt-1 text-xs text-slate-500">Popularity {product.popularityScore.toFixed(2)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-950">{product.categoryName}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{product.categoryCode}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <StatusPill tone={product.inStock ? 'success' : 'warning'}>{product.inStock ? 'In stock' : 'Out of stock'}</StatusPill>
                          <StatusPill tone={product.active ? 'success' : 'muted'}>{product.active ? 'Active' : 'Inactive'}</StatusPill>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">{formatNumber(product.stockQuantity)} units on hand</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-950">{formatCurrency(product.price)}</div>
                        <div className="mt-1 text-xs text-slate-500">Updated {formatDateTime(product.updatedAt)}</div>
                      </td>
                    </tr>
                  ))}
                  {!loadingPreview && searchResponse.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                        No products matched the current query and filter set.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Facet coverage</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Category, price, and availability counts</h2>
            </div>
            <div className="grid gap-0 md:grid-cols-3">
              <FacetColumn title="Categories">
                {searchResponse.facets.categories.map((facet) => (
                  <FacetRow key={facet.categoryCode} label={facet.categoryName} value={formatNumber(facet.count)} selected={facet.selected} />
                ))}
                {searchResponse.facets.categories.length === 0 ? <EmptyFacetState message="No category buckets in the current query." /> : null}
              </FacetColumn>
              <FacetColumn title="Price bands">
                {searchResponse.facets.priceBands.map((band) => (
                  <FacetRow key={band.code} label={band.label} value={formatNumber(band.count)} selected={band.selected} />
                ))}
              </FacetColumn>
              <FacetColumn title="Availability">
                <FacetRow label="In stock" value={formatNumber(searchResponse.facets.availability.inStockCount)} selected={inStockOnly} />
                <FacetRow label="Out of stock" value={formatNumber(searchResponse.facets.availability.outOfStockCount)} />
                <FacetRow label="Active" value={formatNumber(searchResponse.facets.availability.activeCount)} selected={activeFilter === 'ACTIVE'} />
                <FacetRow label="Inactive" value={formatNumber(searchResponse.facets.availability.inactiveCount)} selected={activeFilter === 'INACTIVE'} />
              </FacetColumn>
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-5">
          <AdminPanel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Index control</p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Runtime and ranking weights</h2>
              </div>
              <StatusPill tone={bootstrapping ? 'warning' : 'success'}>{bootstrapping ? 'Loading' : 'Ready'}</StatusPill>
            </div>

            {tuning ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricTile label="Synonym groups" value={formatNumber(synonyms.length)} />
                  <MetricTile label="In-stock weight" value={tuning.inStockWeight.toFixed(2)} />
                  <MetricTile label="Active weight" value={tuning.activeWeight.toFixed(2)} />
                  <MetricTile label="Popularity factor" value={tuning.popularityFactor.toFixed(2)} />
                </div>
                <div className="grid gap-2">
                  <WeightRow label="Exact name boost" value={tuning.boosts.exactName.toFixed(1)} />
                  <WeightRow label="Phrase prefix boost" value={tuning.boosts.phrasePrefix.toFixed(1)} />
                  <WeightRow label="Category boost" value={tuning.boosts.category.toFixed(1)} />
                  <WeightRow label="Keyword boost" value={tuning.boosts.keywords.toFixed(1)} />
                  <WeightRow label="Description boost" value={tuning.boosts.description.toFixed(1)} />
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-slate-500">Loading ranking weights...</div>
            )}

            <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Synonym updates apply to live search preview immediately. Full reindex is only needed when the product catalog itself needs to be rebuilt in OpenSearch.
            </div>

            {reindexResult ? (
              <div className="mt-4 rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-950">Last rebuild</div>
                <div className="mt-2">{formatNumber(reindexResult.indexedCount)} products indexed on {formatDateTime(reindexResult.completedAt)}</div>
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Synonym library</p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Manage live query expansions</h2>
                <p className="mt-2 text-sm text-slate-500">Enter comma-separated terms. Each group should represent the same shopper intent.</p>
              </div>
              <StatusPill tone="info">{formatNumber(synonyms.length)} groups</StatusPill>
            </div>

            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
              <label className="text-sm font-medium text-slate-700">
                {editingSynonymId ? 'Edit synonym group' : 'New synonym group'}
                <textarea
                  value={synonymDraft}
                  onChange={(event) => setSynonymDraft(event.target.value)}
                  rows={4}
                  placeholder="phone, smartphone, mobile"
                  className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#2558f5]"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSynonymSubmit()}
                  disabled={savingSynonym}
                  className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingSynonym ? 'Saving...' : editingSynonymId ? 'Save group' : 'Add group'}
                </button>
                {editingSynonymId ? (
                  <button
                    type="button"
                    onClick={resetSynonymComposer}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {synonyms.map((group) => (
                <div key={group.id} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{group.primaryTerm}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.terms.map((term) => (
                          <span key={term} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {term}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-slate-500">Updated {formatDateTime(group.updatedAt)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEditingSynonym(group)}
                        className="text-sm font-semibold text-[#2558f5] transition hover:text-[#1947db]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSynonym(group)}
                        disabled={deletingSynonymId === group.id}
                        className="text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingSynonymId === group.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {synonyms.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No synonym groups exist yet.
                </div>
              ) : null}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
}

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

interface WeightRowProps {
  label: string;
  value: string;
}

function WeightRow({ label, value }: WeightRowProps) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

interface FacetColumnProps {
  children: ReactNode;
  title: string;
}

function FacetColumn({ children, title }: FacetColumnProps) {
  return (
    <div className="border-t border-slate-200 md:border-t-0 md:border-r last:border-r-0">
      <div className="border-b border-slate-200 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{title}</div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

interface FacetRowProps {
  label: string;
  selected?: boolean;
  value: string;
}

function FacetRow({ label, selected = false, value }: FacetRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-sm last:border-b-0">
      <span className={selected ? 'font-semibold text-slate-950' : 'text-slate-600'}>{label}</span>
      <span className={selected ? 'font-semibold text-[#2558f5]' : 'text-slate-500'}>{value}</span>
    </div>
  );
}

interface EmptyFacetStateProps {
  message: string;
}

function EmptyFacetState({ message }: EmptyFacetStateProps) {
  return <div className="px-5 py-6 text-sm text-slate-500">{message}</div>;
}
