import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { EmptyState } from '../components/EmptyState';
import { LoadingPanel } from '../components/LoadingPanel';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { orderApi, productApi, toApiMessage } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { dangerButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui';
import type { Product } from '../types';

const orderSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerEmail: z.string().email('Enter a valid email address'),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive('Select a product'),
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
      }),
    )
    .min(1, 'Add at least one line item'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export function OrderCreatePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      items: [{ productId: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productApi.list();
        setProducts(data.filter((product) => product.active));
        setFormError(null);
      } catch (error) {
        setFormError(toApiMessage(error, 'Unable to load products for ordering'));
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  const totals = useMemo(() => {
    const lineItems = watchedItems.map((item) => {
      const product = products.find((candidate) => candidate.id === Number(item.productId));
      const amount = product ? product.price * Number(item.quantity || 0) : 0;
      return { product, amount };
    });
    const grandTotal = lineItems.reduce((sum, line) => sum + line.amount, 0);
    return { lineItems, grandTotal };
  }, [products, watchedItems]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const order = await orderApi.create(values);
      navigate(`/orders/${order.orderCode}`);
    } catch (error) {
      setFormError(toApiMessage(error, 'Unable to create order'));
    }
  });

  if (loading) {
    return <LoadingPanel message="Loading available catalog items..." />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No active products available"
        description="Create and activate at least one product before you enter a manual order in the portal workspace."
        action={<Link to="/catalog/new" className={primaryButtonClass}>Add catalog item</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manual Order Entry"
        title="Capture A New Fulfillment Request"
        description="Use this workspace for agent-assisted order intake. The order service will reserve stock against each selected SKU before confirming the order."
        action={<Link to="/orders" className={secondaryButtonClass}>Back to queue</Link>}
      />

      <form className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]" onSubmit={onSubmit}>
        <div className="grid gap-5">
          <Panel className="grid gap-5">
            {formError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Customer name
                <span className="field-shell rounded-2xl">
                  <input className={inputClass} placeholder="Maya Patel" {...register('customerName')} />
                </span>
                {errors.customerName ? <span className="text-sm text-rose-700">{errors.customerName.message}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Customer email
                <span className="field-shell rounded-2xl">
                  <input className={inputClass} placeholder="maya@example.com" {...register('customerEmail')} />
                </span>
                {errors.customerEmail ? <span className="text-sm text-rose-700">{errors.customerEmail.message}</span> : null}
              </label>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Order Lines</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-slate-950">Reserve inventory against the request</h2>
              </div>
              <button type="button" className={secondaryButtonClass} onClick={() => append({ productId: 0, quantity: 1 })}>
                Add line item
              </button>
            </div>

            <div className="grid gap-4">
              {fields.map((field, index) => {
                const selectedProduct = products.find((candidate) => candidate.id === Number(watchedItems[index]?.productId));

                return (
                  <div key={field.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 xl:grid-cols-[1.5fr_180px_auto] xl:items-start">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Product
                        <span className="field-shell rounded-2xl">
                          <select className={inputClass} {...register(`items.${index}.productId`)}>
                            <option value={0}>Select a product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.stockQuantity} in stock)
                              </option>
                            ))}
                          </select>
                        </span>
                        {errors.items?.[index]?.productId ? <span className="text-sm text-rose-700">{errors.items[index]?.productId?.message}</span> : null}
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Quantity
                        <span className="field-shell rounded-2xl">
                          <input className={inputClass} type="number" step="1" {...register(`items.${index}.quantity`)} />
                        </span>
                        {errors.items?.[index]?.quantity ? <span className="text-sm text-rose-700">{errors.items[index]?.quantity?.message}</span> : null}
                      </label>

                      <button type="button" className={dangerButtonClass} disabled={fields.length === 1} onClick={() => remove(index)}>
                        Remove
                      </button>
                    </div>

                    {selectedProduct ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          Unit price <div className="mt-1 font-semibold text-slate-900">{formatCurrency(selectedProduct.price)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          Available stock <div className="mt-1 font-semibold text-slate-900">{selectedProduct.stockQuantity}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          Line total <div className="mt-1 font-semibold text-slate-900">{formatCurrency(selectedProduct.price * Number(watchedItems[index]?.quantity || 0))}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5">
          <Panel className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Submission Summary</p>
            <div className="rounded-[22px] bg-slate-950 px-5 py-5 text-white">
              <p className="text-sm text-slate-300">Projected order total</p>
              <p className="mt-3 font-display text-4xl font-semibold">{formatCurrency(totals.grandTotal)}</p>
            </div>
            <div className="space-y-3">
              {totals.lineItems.map((line, index) => (
                <div key={`${line.product?.id ?? 'empty'}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-900">{line.product?.name ?? 'Select a product'}</div>
                  <div className="mt-1 text-slate-600">
                    Qty {watchedItems[index]?.quantity || 0} • {formatCurrency(line.amount)}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 pt-2">
              <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit order'}
              </button>
              <Link to="/orders" className={secondaryButtonClass}>Cancel</Link>
            </div>
          </Panel>

          <Panel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Workflow Notes</p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
              <li>Each line item calls the catalog service reserve endpoint synchronously.</li>
              <li>The order is saved only after all reservations succeed.</li>
              <li>The confirmation event is published to Kafka after persistence.</li>
            </ul>
          </Panel>
        </div>
      </form>
    </div>
  );
}
