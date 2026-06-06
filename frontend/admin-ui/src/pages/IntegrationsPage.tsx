import { useEffect, useMemo, useState } from 'react';
import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { orderApi, productApi, toApiMessage } from '../lib/api';
import { formatNumber } from '../lib/format';
import type { Order, Product } from '../types';

const services = [
  ['Customer portal', 'Public storefront, cart, checkout, and order lookup through the gateway', '5173'],
  ['Admin UI', 'Restricted backoffice for customers, orders, products, search, and access control', '5174'],
  ['API Gateway', 'Single ingress path for product, order, and search APIs', '8080'],
  ['Product Service', 'Catalog CRUD, category model, inventory storage, and reservation endpoint', '8081'],
  ['Order Service', 'Order persistence, product reservation, and Kafka publication', '8082'],
  ['Notification Service', 'Kafka consumer for order.created notification logs', '8083'],
  ['Search Service', 'OpenSearch indexing, search preview, synonyms, and reindex operations', '8084'],
  ['OpenSearch', 'Product index, facets, boosts, popularity scoring, and synonym config', '9200'],
  ['Kafka', 'Asynchronous backbone for order and product events', '9092'],
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

  const operationalFacts = useMemo(
    () => [
      `${formatNumber(products.length)} products are currently addressable through the product and search APIs.`,
      `${formatNumber(orders.length)} persisted orders are feeding both customer and backoffice views.`,
      'Search-service owns autocomplete, facets, ranking logic, runtime synonyms, and full reindex behavior.',
      'Authentication remains client-enforced in admin-ui until the gateway adopts a server-side identity layer.',
    ],
    [orders.length, products.length],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Integrations"
        title="Understand the runtime surfaces behind commerce operations"
        description="This page treats the local stack like a real environment: separate surfaces, explicit port ownership, and clarity about which service owns catalog, orders, search, and notification behavior."
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Service registry</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Running surfaces</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Surface</th>
                  <th>Responsibility</th>
                  <th>Port</th>
                </tr>
              </thead>
              <tbody>
                {services.map(([name, description, port]) => (
                  <tr key={name}>
                    <td className="font-semibold text-slate-950">{name}</td>
                    <td>{description}</td>
                    <td><StatusPill tone="info">{port}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Environment facts</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Data plane notes</h2>
            </div>
            <div className="grid gap-3 px-5 py-5 text-sm leading-6 text-slate-600">
              {operationalFacts.map((fact) => (
                <div key={fact} className="backoffice-surface-muted px-4 py-4">{fact}</div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
