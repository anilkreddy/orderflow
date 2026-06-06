import { useEffect, useMemo, useState } from 'react';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, productApi, toApiMessage } from '../lib/api';
import type { Order, Product } from '../types';

const services = [
  ['Customer portal', 'Public storefront, cart, checkout, and order lookup through the gateway', '5173'],
  ['Admin UI', 'Restricted backoffice for customers, orders, products, and access control', '5174'],
  ['API Gateway', 'Single entry point for product and order APIs', '8080'],
  ['Product Service', 'Catalog CRUD, inventory storage, and reservation endpoint', '8081'],
  ['Order Service', 'Order persistence, product reservation, and Kafka event publication', '8082'],
  ['Notification Service', 'Kafka consumer for order.created confirmation logs', '8083'],
  ['Kafka', 'Asynchronous event bus for order.created', '9092'],
];

export function IntegrationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [productData, orderData] = await Promise.all([productApi.list(), orderApi.list()]);
        setProducts(productData);
        setOrders(orderData);
        setError(null);
      } catch (loadError) {
        setError(toApiMessage(loadError, 'Unable to load integration overview'));
      }
    }

    void load();
  }, []);

  const integrationFacts = useMemo(
    () => [
      `${products.length} products are currently addressable through the gateway-backed product APIs.`,
      `${orders.length} persisted orders are available for customer and backoffice views.`,
      'Authentication remains client-enforced in admin-ui until a server-side identity layer is introduced.',
    ],
    [orders.length, products.length],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Integrations"
        title="Understand the runtime surfaces behind the dashboard"
        description="This screen keeps the frontend split honest: the customer portal and admin console share gateway-backed services but retain distinct concerns."
      />

      {error ? <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Runtime surfaces</p>
          <div className="mt-5 grid gap-4">
            {services.map(([name, description, port]) => (
              <div key={name} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{name}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{description}</div>
                  </div>
                  <StatusPill tone="muted">{port}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Operational facts</p>
          <div className="mt-5 grid gap-4">
            {integrationFacts.map((item) => (
              <div key={item} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
