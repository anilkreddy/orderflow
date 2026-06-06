import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
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
          setForm((current) => ({
            ...current,
            categoryCode: current.categoryCode || activeCategories[0]?.code || '',
          }));
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

    setForm((current) => ({
      ...current,
      [name]: Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0,
    }));
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
    return <div className="dashboard-card rounded-[24px] px-5 py-5 text-sm text-slate-600">Loading product...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={isEditing ? 'Edit product' : 'Create product'}
        title={isEditing ? 'Update a live catalog item' : 'Add a new catalog item'}
        description="Use this form to control how products appear in the storefront and how they participate in inventory-aware checkout."
        action={<Link to="/products" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Back to products</Link>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel className="p-6">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Product name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleTextChange}
                  className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-600">
                Category
                <select
                  name="categoryCode"
                  value={form.categoryCode}
                  onChange={handleTextChange}
                  className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={handleNumberChange}
                  className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-600">
                Stock quantity
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="stockQuantity"
                  value={form.stockQuantity}
                  onChange={handleNumberChange}
                  className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                  required
                />
              </label>
            </div>

            <label className="text-sm font-medium text-slate-600">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleTextChange}
                rows={6}
                className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-[1fr]">
              <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-[#2558f5] focus:ring-[#2558f5]"
                />
                Make this product visible in the customer storefront
              </label>
            </div>

            {error ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-[#2558f5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1947db] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Saving...' : isEditing ? 'Save changes' : 'Create product'}
            </button>
          </form>
        </AdminPanel>

        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Catalog guidance</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Make storefront behavior predictable</h2>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-slate-600">
            {[
              'Only active products appear in the customer portal and can be added to the basket.',
              'Inventory is not reserved when a shopper adds an item to cart; reservation happens during order creation.',
              'Use a stable category taxonomy so storefront navigation and admin analytics stay consistent.',
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                {item}
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
