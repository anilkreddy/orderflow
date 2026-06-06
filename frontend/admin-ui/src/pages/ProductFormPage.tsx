import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { categoryApi, productApi, toApiMessage } from '../lib/api';
import type { Category, ProductPayload } from '../types';

const emptyForm: ProductPayload = {
  name: '',
  categoryCode: '',
  description: '',
  price: 0,
  stockQuantity: 0,
  active: true,
};

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = useMemo(() => Boolean(id), [id]);
  const [form, setForm] = useState<ProductPayload>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPageData() {
      try {
        const categoryData = await categoryApi.list();
        const activeCategories = categoryData.filter((category) => category.active);
        setCategories(activeCategories);

        if (id) {
          const product = await productApi.get(Number(id));
          setForm({
            name: product.name,
            categoryCode: product.categoryCode,
            description: product.description,
            price: product.price,
            stockQuantity: product.stockQuantity,
            active: product.active,
          });
        } else {
          setForm((current) => ({ ...current, categoryCode: current.categoryCode || activeCategories[0]?.code || '' }));
        }
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load product form data'));
      } finally {
        setLoading(false);
      }
    }

    void loadPageData();
  }, [id]);

  function handleTextChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const parsedValue = name === 'stockQuantity' ? Number.parseInt(value || '0', 10) : Number.parseFloat(value || '0');
    setForm((current) => ({ ...current, [name]: Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0 }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    if (!form.categoryCode.trim()) {
      setError('Product category is required.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      if (id) {
        await productApi.update(Number(id), form);
      } else {
        await productApi.create(form);
      }
      navigate('/products');
    } catch (submitError) {
      setError(toApiMessage(submitError, 'Unable to save product'));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="backoffice-surface px-5 py-5 text-sm text-slate-600">Loading product editor...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={isEditing ? 'Edit product' : 'Create product'}
        title={isEditing ? 'Update a live catalog record' : 'Create a new catalog record'}
        description="This editor is structured as a commerce backoffice form: product identity and copy on the left, operational settings on the right, with explicit visibility and inventory controls."
        action={<Link to="/products" className="backoffice-button-secondary">Back to products</Link>}
      />

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Core product</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Identity and merchandising copy</h2>
            </div>
            <div className="grid gap-5 px-5 py-5">
              <label className="text-sm font-medium text-slate-700">
                Product title
                <input type="text" name="name" value={form.name} onChange={handleTextChange} className="backoffice-input mt-2" required />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Description
                <textarea name="description" value={form.description} onChange={handleTextChange} rows={8} className="backoffice-textarea mt-2" />
              </label>
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Catalog placement</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Category and storefront rules</h2>
            </div>
            <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Category
                <select name="categoryCode" value={form.categoryCode} onChange={handleTextChange} className="backoffice-select mt-2" required>
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>{category.name}</option>
                  ))}
                </select>
              </label>

              <div className="text-sm font-medium text-slate-700">
                Storefront status
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <div>
                    <div className="font-semibold text-slate-950">Visible to shoppers</div>
                    <div className="mt-1 text-[12px] text-slate-500">Inactive products remain in the catalog but are hidden from the storefront.</div>
                  </div>
                </div>
              </div>
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Operational settings</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Price and inventory</h2>
            </div>
            <div className="grid gap-5 px-5 py-5">
              <label className="text-sm font-medium text-slate-700">
                Price
                <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleNumberChange} className="backoffice-input mt-2" required />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Stock quantity
                <input type="number" min="0" step="1" name="stockQuantity" value={form.stockQuantity} onChange={handleNumberChange} className="backoffice-input mt-2" required />
              </label>

              <div className="backoffice-surface-muted px-4 py-4 text-sm leading-6 text-slate-600">
                Inventory is reserved only during order creation. Adding a product to a cart does not reserve stock.
              </div>
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Publishing</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Save behavior</h2>
            </div>
            <div className="grid gap-4 px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Current visibility</span>
                <StatusPill tone={form.active ? 'success' : 'muted'}>{form.active ? 'Active' : 'Inactive'}</StatusPill>
              </div>
              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              <button type="submit" disabled={pending} className="backoffice-button-primary w-full">
                {pending ? 'Saving...' : isEditing ? 'Save changes' : 'Create product'}
              </button>
            </div>
          </AdminPanel>
        </div>
      </form>
    </div>
  );
}
