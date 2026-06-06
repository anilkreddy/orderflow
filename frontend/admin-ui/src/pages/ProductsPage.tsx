import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { categoryApi, productApi, toApiMessage } from '../lib/api';
import { getActiveProducts, getLowStockProducts, getTotalInventory } from '../lib/dashboard';
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format';
import type { Category, Product } from '../types';

const productTabs = [
  { label: 'All products', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Low stock', value: 'LOW_STOCK' },
] as const;

type ProductFilter = (typeof productTabs)[number]['value'];

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('ALL');
  const [categoryCode, setCategoryCode] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  async function loadProducts() {
    try {
      const [productData, categoryData] = await Promise.all([productApi.list(), categoryApi.list()]);
      setProducts(productData.sort((left, right) => right.id - left.id));
      setCategories(categoryData.filter((category) => category.active));
      setError(null);
    } catch (loadError) {
      setError(toApiMessage(loadError, 'Unable to load products'));
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const activeProducts = useMemo(() => getActiveProducts(products), [products]);
  const lowStockProducts = useMemo(() => getLowStockProducts(products), [products]);
  const totalInventory = useMemo(() => getTotalInventory(products), [products]);
  const categorySummary = useMemo(() => {
    const counts = new Map<string, { count: number; name: string }>();

    for (const product of products) {
      const entry = counts.get(product.categoryCode) ?? { name: product.categoryName, count: 0 };
      entry.count += 1;
      counts.set(product.categoryCode, entry);
    }

    return [...counts.entries()]
      .map(([code, value]) => ({ code, ...value }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesTab =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && product.active) ||
        (filter === 'INACTIVE' && !product.active) ||
        (filter === 'LOW_STOCK' && product.stockQuantity <= 10);
      const matchesCategory = categoryCode.length === 0 || product.categoryCode === categoryCode;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.categoryName.toLowerCase().includes(normalizedQuery) ||
        product.categoryCode.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        String(product.id).includes(normalizedQuery);

      return matchesTab && matchesCategory && matchesQuery;
    });
  }, [categoryCode, filter, products, query]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredProducts.some((product) => product.id === id)));
  }, [filteredProducts]);

  async function handleDelete(product: Product) {
    const shouldDelete = window.confirm(`Delete product \"${product.name}\"? This will remove it from the catalog.`);
    if (!shouldDelete) {
      return;
    }

    setPendingDeleteId(product.id);
    try {
      await productApi.remove(product.id);
      await loadProducts();
      setSelectedIds((current) => current.filter((id) => id !== product.id));
    } catch (deleteError) {
      setError(toApiMessage(deleteError, 'Unable to delete product'));
    } finally {
      setPendingDeleteId(null);
    }
  }

  function toggleProductSelection(productId: number) {
    setSelectedIds((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]));
  }

  function toggleAll() {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredProducts.map((product) => product.id));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Catalog"
        title="Control assortment, availability, and inventory exposure"
        description="This workspace is structured like a real product index: quick status views, fast filters, selection-aware tables, and side context for category and stock decisions."
        action={<Link to="/products/new" className="backoffice-button-primary">Add product</Link>}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricSummary label="Products" value={formatNumber(products.length)} note="All catalog records" />
        <MetricSummary label="Active listings" value={formatNumber(activeProducts.length)} note="Visible to shoppers" />
        <MetricSummary label="Low-stock items" value={formatNumber(lowStockProducts.length)} note="At or below 10 units" />
        <MetricSummary label="Inventory units" value={formatNumber(totalInventory)} note="Active catalog only" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {productTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilter(tab.value)}
                    className={`resource-tab ${filter === tab.value ? 'is-active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, category, description, or id"
                  className="backoffice-search min-w-[280px]"
                />
                <select value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)} className="backoffice-select min-w-[200px]">
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-sm text-slate-500">
            <div>{selectedIds.length > 0 ? `${formatNumber(selectedIds.length)} selected` : `${formatNumber(filteredProducts.length)} products in view`}</div>
            <div className="flex gap-4">
              <span>{formatNumber(activeProducts.length)} active</span>
              <span>{formatNumber(lowStockProducts.length)} low stock</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length} onChange={toggleAll} />
                  </th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleProductSelection(product.id)} />
                    </td>
                    <td>
                      <div className="font-semibold text-slate-950">{product.name}</div>
                      <div className="mt-1 max-w-[520px] text-[12px] leading-5 text-slate-500">{product.description}</div>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">SKU #{product.id}</div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-950">{product.categoryName}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{product.categoryCode}</div>
                    </td>
                    <td className="font-semibold text-slate-950">{formatCurrency(product.price)}</td>
                    <td>
                      <StatusPill tone={product.stockQuantity <= 10 ? 'warning' : 'success'}>{product.stockQuantity} units</StatusPill>
                    </td>
                    <td>
                      <StatusPill tone={product.active ? 'success' : 'muted'}>{product.active ? 'Active' : 'Inactive'}</StatusPill>
                    </td>
                    <td>{formatDateTime(product.updatedAt)}</td>
                    <td>
                      <div className="flex justify-end gap-3">
                        <Link to={`/products/${product.id}/edit`} className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4">Edit</Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(product)}
                          disabled={pendingDeleteId === product.id}
                          className="text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingDeleteId === product.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Category mix</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Largest catalog groups</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              {categorySummary.map((item) => (
                <div key={item.code} className="backoffice-surface-muted px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{item.name}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{item.code}</div>
                    </div>
                    <StatusPill tone="info">{formatNumber(item.count)}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Watch list</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Stock pressure</h2>
            </div>
            <div className="grid gap-3 px-5 py-5">
              {lowStockProducts.slice(0, 6).map((product) => (
                <div key={product.id} className="backoffice-surface-muted px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{product.name}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{product.categoryName}</div>
                    </div>
                    <StatusPill tone="warning">{product.stockQuantity} left</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

interface MetricSummaryProps {
  label: string;
  note: string;
  value: string;
}

function MetricSummary({ label, note, value }: MetricSummaryProps) {
  return (
    <div className="metric-tile">
      <div className="metric-kicker">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
