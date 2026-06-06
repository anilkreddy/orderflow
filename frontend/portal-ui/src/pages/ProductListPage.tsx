import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { StatCard } from '../components/StatCard';
import { productApi, toApiMessage } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { dangerButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui';
import type { Product } from '../types';

export function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await productApi.list();
      setProducts(data);
      setError(null);
    } catch (loadError) {
      setError(toApiMessage(loadError, 'Unable to load products'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const metrics = useMemo(() => {
    const activeProducts = products.filter((product) => product.active).length;
    const lowStock = products.filter((product) => product.active && product.stockQuantity <= 10).length;
    const inventoryValue = products.reduce((sum, product) => sum + product.price * product.stockQuantity, 0);
    return { activeProducts, lowStock, inventoryValue };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = `${product.name} ${product.description} ${product.id}`.toLowerCase().includes(search.trim().toLowerCase());
      const matchesActive = !activeOnly || product.active;
      return matchesSearch && matchesActive;
    });
  }, [activeOnly, products, search]);

  async function handleDelete(productId: number) {
    if (!window.confirm('Delete this product?')) {
      return;
    }

    try {
      await productApi.remove(productId);
      await loadProducts();
    } catch (deleteError) {
      setError(toApiMessage(deleteError, 'Unable to delete product'));
    }
  }

  if (loading) {
    return <LoadingPanel message="Loading catalog inventory..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Inventory Control"
        description="Maintain sellable SKUs, monitor stock pressure, and keep the order reservation path healthy by managing active catalog items."
        action={<Link to="/catalog/new" className={primaryButtonClass}>Add product</Link>}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="SKUs" value={products.length} hint="Catalog records loaded" accent="slate" />
        <StatCard label="Active" value={metrics.activeProducts} hint="Eligible for reservation" accent="teal" />
        <StatCard label="Low Stock" value={metrics.lowStock} hint="Active products at or below 10 units" accent="rose" />
        <StatCard label="Inventory Value" value={formatCurrency(metrics.inventoryValue)} hint="Approximate stock value at list price" accent="amber" />
      </div>

      <Panel className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Search catalog
            <span className="field-shell rounded-2xl">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Search by SKU, product name, or description" />
            </span>
          </label>
          <label className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} className="h-4 w-4 accent-teal-700" />
            Show active products only
          </label>
        </div>
      </Panel>

      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No products match the current filters"
          description="Relax the filter set or add more catalog records so order creation can continue through the reservation flow."
          action={<Link to="/catalog/new" className={primaryButtonClass}>Create product</Link>}
        />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="ops-table min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Stock</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="rounded-2xl bg-slate-50">
                    <td className="rounded-l-2xl px-3 py-4">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">SKU #{product.id}</div>
                      <div className="mt-2 text-sm font-medium text-slate-700">{formatCurrency(product.price)}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">
                      <div className="max-w-md leading-6">{product.description}</div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${product.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${product.stockQuantity <= 5 ? 'bg-rose-100 text-rose-700' : product.stockQuantity <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                        {product.stockQuantity} units
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">{formatDate(product.updatedAt)}</td>
                    <td className="rounded-r-2xl px-3 py-4">
                      <div className="flex justify-end gap-3">
                        <Link to={`/catalog/${product.id}/edit`} className={secondaryButtonClass}>Edit</Link>
                        <button type="button" className={dangerButtonClass} onClick={() => handleDelete(product.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
