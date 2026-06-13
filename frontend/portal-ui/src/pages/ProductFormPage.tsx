import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { LoadingPanel } from '../components/LoadingPanel';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { productApi, toApiMessage } from '../lib/api';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui';

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  categoryCode: z.string().min(2, 'Category code must be at least 2 characters'),
  description: z.string().min(8, 'Description must be at least 8 characters'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  stockQuantity: z.coerce.number().int('Stock quantity must be a whole number').min(0, 'Stock quantity cannot be negative'),
  active: z.boolean(),
});

type ProductFormInput = z.input<typeof productSchema>;
type ProductFormValues = z.output<typeof productSchema>;

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      categoryCode: '',
      description: '',
      price: 0,
      stockQuantity: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (!id) {
      return;
    }

    const productId = id;

    async function loadProduct() {
      try {
        const product = await productApi.get(productId);
        reset({
          name: product.name,
          categoryCode: product.categoryCode,
          description: product.description,
          price: product.price,
          stockQuantity: product.stockQuantity,
          active: product.active,
        });
        setFormError(null);
      } catch (error) {
        setFormError(toApiMessage(error, 'Unable to load product details'));
      } finally {
        setLoading(false);
      }
    }

    void loadProduct();
  }, [id, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (id) {
        await productApi.update(id, values);
      } else {
        await productApi.create(values);
      }
      navigate('/catalog');
    } catch (error) {
      setFormError(toApiMessage(error, 'Unable to save product'));
    }
  });

  if (loading) {
    return <LoadingPanel message="Loading product details..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isEdit ? 'Edit SKU' : 'Add SKU'}
        title={isEdit ? 'Update Catalog Record' : 'Create A New Catalog Item'}
        description="Keep pricing, availability, and activation state accurate so order reservations reflect what operations can actually fulfill."
        action={<Link to="/catalog" className={secondaryButtonClass}>Back to inventory</Link>}
      />

      <Panel className="max-w-4xl">
        <form className="grid gap-5" onSubmit={onSubmit}>
          {formError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Product name
              <span className="field-shell rounded-2xl">
                <input className={inputClass} placeholder="Warehouse Drone" {...register('name')} />
              </span>
              {errors.name ? <span className="text-sm text-rose-700">{errors.name.message}</span> : null}
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Category
              <span className="field-shell rounded-2xl">
                <input className={inputClass} placeholder="electronics" {...register('categoryCode')} />
              </span>
              {errors.categoryCode ? <span className="text-sm text-rose-700">{errors.categoryCode.message}</span> : null}
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Unit price
              <span className="field-shell rounded-2xl">
                <input className={inputClass} type="number" step="0.01" placeholder="149.99" {...register('price')} />
              </span>
              {errors.price ? <span className="text-sm text-rose-700">{errors.price.message}</span> : null}
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Product description
            <span className="field-shell rounded-2xl">
              <textarea className={`${inputClass} min-h-32 resize-y`} placeholder="Describe the item, primary use case, and sales context." {...register('description')} />
            </span>
            {errors.description ? <span className="text-sm text-rose-700">{errors.description.message}</span> : null}
          </label>

          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Stock quantity
              <span className="field-shell rounded-2xl">
                <input className={inputClass} type="number" step="1" placeholder="42" {...register('stockQuantity')} />
              </span>
              {errors.stockQuantity ? <span className="text-sm text-rose-700">{errors.stockQuantity.message}</span> : null}
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-teal-700" {...register('active')} />
              Product is active for order intake
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update product' : 'Create product'}
            </button>
            <Link to="/catalog" className={secondaryButtonClass}>Cancel</Link>
          </div>
        </form>
      </Panel>
    </div>
  );
}
