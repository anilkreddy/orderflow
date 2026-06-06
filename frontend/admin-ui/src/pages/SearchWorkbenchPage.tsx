import { useEffect, useMemo, useState } from 'react';
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
  { value: 'price-low', label: 'Price low to high' },
  { value: 'price-high', label: 'Price high to low' },
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
        const [categoryData, tuningData, synonymData] = await Promise.all([categoryApi.list(), searchApi.tuning(), searchApi.synonyms()]);
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

  const synonymTerms = useMemo(() => tuning?.synonyms ?? [], [tuning]);

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
      setPreviewNonce((current) => current + 1);
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
        setNotice('Synonym group updated.');
      } else {
        await searchApi.createSynonym({ terms });
        setNotice('Synonym group added.');
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
        eyebrow="Search operations"
        title="Manage ranking inputs and preview shopper-facing search behavior"
        description="This workspace combines live query validation, index controls, facet coverage, and editable synonym groups so merchandising and search teams can operate without editing config files."
        action={
          <button type="button" onClick={() => void handleReindex()} disabled={reindexing} className="backoffice-button-primary">
            {reindexing ? 'Reindexing...' : 'Rebuild index'}
          </button>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Preview query</div>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Live result validation</h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={loadingPreview ? 'warning' : 'success'}>{loadingPreview ? 'Refreshing' : 'Live'}</StatusPill>
                <StatusPill tone="info">{formatNumber(searchResponse.total)} matches</StatusPill>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-200 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-slate-700 xl:col-span-2">
              Query
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Validate product names, synonyms, and category phrases"
                className="backoffice-search mt-2"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Category
              <select value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)} className="backoffice-select mt-2">
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.code} value={category.code}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value as SortValue)} className="backoffice-select mt-2">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Active filter
              <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)} className="backoffice-select mt-2">
                <option value="ALL">All states</option>
                <option value="ACTIVE">Active only</option>
                <option value="INACTIVE">Inactive only</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Price band
              <select value={priceBand} onChange={(event) => setPriceBand(event.target.value)} className="backoffice-select mt-2">
                <option value="">Any price</option>
                {searchResponse.facets.priceBands.map((band) => (
                  <option key={band.code} value={band.code}>{band.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              In-stock only
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-950">Runtime synonyms</div>
              <div className="mt-1">{formatNumber(synonyms.length)} groups loaded</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Score</th>
                  <th>Popularity</th>
                </tr>
              </thead>
              <tbody>
                {searchResponse.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-semibold text-slate-950">{item.name}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{item.description}</div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-950">{item.categoryName}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{item.categoryCode}</div>
                    </td>
                    <td className="font-semibold text-slate-950">{formatCurrency(item.price)}</td>
                    <td>
                      <StatusPill tone={item.inStock ? 'success' : 'warning'}>{item.stockQuantity} units</StatusPill>
                    </td>
                    <td>{item.score.toFixed(2)}</td>
                    <td>{item.popularityScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Index control</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Runtime health</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              <SummaryLine label="Bootstrap" value={bootstrapping ? 'Loading' : 'Ready'} />
              <SummaryLine label="Indexed products" value={formatNumber(reindexResult?.indexedCount ?? searchResponse.total)} />
              <SummaryLine label="Last rebuild" value={reindexResult ? formatDateTime(reindexResult.completedAt) : 'Not run this session'} />
              <SummaryLine label="Synonym groups" value={formatNumber(synonyms.length)} />
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Facet coverage</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Category and price distribution</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              {searchResponse.facets.categories.slice(0, 5).map((facet) => (
                <div key={facet.categoryCode} className="backoffice-surface-muted px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{facet.categoryName}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{facet.categoryCode}</div>
                    </div>
                    <StatusPill tone="info">{formatNumber(facet.count)}</StatusPill>
                  </div>
                </div>
              ))}
              {searchResponse.facets.priceBands.map((band) => (
                <div key={band.code} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{band.label}</span>
                  <span className="font-semibold text-slate-950">{formatNumber(band.count)}</span>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Relevance profile</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Current boost weights</h2>
            </div>
            <div className="grid gap-3 px-5 py-5 text-sm text-slate-600">
              {tuning ? (
                <>
                  <SummaryLine label="Exact name" value={tuning.boosts.exactName.toFixed(1)} />
                  <SummaryLine label="Phrase prefix" value={tuning.boosts.phrasePrefix.toFixed(1)} />
                  <SummaryLine label="Category boost" value={tuning.boosts.category.toFixed(1)} />
                  <SummaryLine label="Description boost" value={tuning.boosts.description.toFixed(1)} />
                  <SummaryLine label="Popularity factor" value={tuning.popularityFactor.toFixed(1)} />
                </>
              ) : (
                <div>Loading tuning profile...</div>
              )}
              <div className="backoffice-surface-muted px-4 py-4 text-[12px] leading-6 text-slate-500">
                {synonymTerms.length > 0 ? synonymTerms.join(', ') : 'No seed synonym terms are currently loaded.'}
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>

      <AdminPanel className="p-0 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Synonym library</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Editable runtime synonym groups</h2>
            </div>
            <div className="text-sm text-slate-500">Changes are applied to live query expansion without editing backend config files.</div>
          </div>
        </div>

        <div className="grid gap-5 border-b border-slate-200 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="text-sm font-semibold text-slate-950">Existing groups</div>
            <div className="mt-4 overflow-x-auto">
              <table className="resource-table">
                <thead>
                  <tr>
                    <th>Primary term</th>
                    <th>Terms</th>
                    <th>Updated</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {synonyms.map((group) => (
                    <tr key={group.id}>
                      <td className="font-semibold text-slate-950">{group.primaryTerm}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {group.terms.map((term) => (
                            <span key={term} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{term}</span>
                          ))}
                        </div>
                      </td>
                      <td>{formatDateTime(group.updatedAt)}</td>
                      <td>
                        <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => startEditingSynonym(group)} className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4">Edit</button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSynonym(group)}
                            disabled={deletingSynonymId === group.id}
                            className="text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingSynonymId === group.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-950">{editingSynonymId ? 'Edit synonym group' : 'Create synonym group'}</div>
              <div className="mt-1 text-sm text-slate-500">Provide at least two comma-separated terms. The first term becomes the primary label in backoffice.</div>
            </div>
            <label className="text-sm font-medium text-slate-700">
              Terms
              <textarea value={synonymDraft} onChange={(event) => setSynonymDraft(event.target.value)} rows={7} className="backoffice-textarea mt-2" placeholder="phone, mobile, smartphone" />
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => void handleSynonymSubmit()} disabled={savingSynonym} className="backoffice-button-primary flex-1">
                {savingSynonym ? 'Saving...' : editingSynonymId ? 'Update group' : 'Add group'}
              </button>
              {editingSynonymId ? (
                <button type="button" onClick={resetSynonymComposer} className="backoffice-button-secondary">Cancel</button>
              ) : null}
            </div>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}
