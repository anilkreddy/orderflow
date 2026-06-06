import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { productApi, toApiMessage } from '../lib/api';
import { getActiveProducts, getLowStockProducts, getTotalInventory } from '../lib/dashboard';
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format';
import type { Product } from '../types';

const productFilters = [
  { label: 'All products', value: 'ALL' },
  { label: 'Active only', value: 'ACTIVE' },
  { label: 'Inactive only', value: 'INACTIVE' },
  { label: 'Low stock', value: 'LOW_STOCK' },
] as const;

type ProductFilter = (typeof productFilters)[number]['value'];

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  async function loadProducts() {
    try {
      const productData = await productApi.list();
      setProducts(productData.sort((left, right) => right.id - left.id));
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

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && product.active) ||
        (filter === 'INACTIVE' && !product.active) ||
        (filter === 'LOW_STOCK' && product.stockQuantity <= 10);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.categoryCode.toLowerCase().includes(normalizedQuery) ||
        product.categoryName.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        String(product.id).includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, products, query]);

  async function handleDelete(product: Product) {
    const shouldDelete = window.confirm(`Delete product \"${product.name}\"? This will remove it from the catalog.`);
    if (!shouldDelete) {
      return;
    }

    setPendingDeleteId(product.id);
    try {
      await productApi.remove(product.id);
      await loadProducts();
    } catch (deleteError) {
      setError(toApiMessage(deleteError, 'Unable to delete product'));
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Products"
        title="Catalog, inventory, and storefront visibility"
        description="Manage products from the same backoffice surface that operations teams use for order review, with clear visibility into activation state and low-stock risk."
        action={<Link to="/products/new" className="inline-flex items-center rounded-full bg-[#2558f5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1947db]">Create product</Link>}
      />

      {error ? <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Catalog products" value={formatNumber(products.length)} />
        <MiniStat label="Sellable SKUs" value={formatNumber(activeProducts.length)} />
        <MiniStat label="Low-stock SKUs" value={formatNumber(lowStockProducts.length)} />
        <MiniStat label="Inventory units" value={formatNumber(totalInventory)} />
      </div>

      <AdminPanel className="p-0 overflow-hidden">
        <div className="grid gap-4 border-b border-slate-200 px-6 py-5 xl:grid-cols-[1fr_220px_220px] xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Catalog filters</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Search the product inventory</h2>
          </div>
          <label className="text-sm font-medium text-slate-600">
            Search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, description, or id"
              className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Filter
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as ProductFilter)}
              className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
            >
              {productFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Visibility</th>
                <th className="px-6 py-4">Updated</th>
                <th className="px-6 py-4" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="text-slate-600">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-950">{product.name}</div>
                    <div className="mt-1 max-w-xl text-slate-500">{product.description}</div>
                    <div className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">SKU #{product.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <StatusPill tone="info">{product.categoryName}</StatusPill>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{product.categoryCode}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4">
                    <StatusPill tone={product.stockQuantity <= 10 ? 'warning' : 'success'}>{product.stockQuantity} units</StatusPill>
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill tone={product.active ? 'success' : 'muted'}>{product.active ? 'Active' : 'Inactive'}</StatusPill>
                  </td>
                  <td className="px-6 py-4">{formatDateTime(product.updatedAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-4">
                      <Link to={`/products/${product.id}/edit`} className="font-semibold text-[#2558f5] underline decoration-slate-300 underline-offset-4">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(product)}
                        disabled={pendingDeleteId === product.id}
                        className="font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
}

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="dashboard-card rounded-[22px] px-5 py-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}
