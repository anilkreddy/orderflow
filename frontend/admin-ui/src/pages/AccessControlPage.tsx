import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../lib/auth';

const adminScopes = [
  {
    role: 'admin',
    scope: 'Backoffice-wide scope enforced at the gateway for protected management actions',
  },
  {
    role: 'catalog_manager',
    scope: 'Catalog write access and merchandising operations',
  },
  {
    role: 'order_manager',
    scope: 'Order operations and exception review workflows',
  },
  {
    role: 'customer',
    scope: 'Storefront customer scope, intentionally separate from backoffice access',
  },
];

const policyItems = [
  'The identity platform now issues the browser tokens and the API gateway validates JWTs before protected admin routes can execute.',
  'Guest storefront flows remain public, but signed-in customer order history is now enforced by ownership checks in the order service.',
  'Downstream services are moving from edge-only checks toward service-level ownership and scope validation.',
];

export function AccessControlPage() {
  const { session, isAuthenticated, hasRequiredScope } = useAuth();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Access"
        title="Review the live access boundary"
        description="This workspace documents how Oflio now separates customer and admin access through token scopes, role mappings, and gateway JWT validation."
      />

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Current session</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Credential boundary</h2>
          </div>
          <div className="grid gap-4 px-5 py-5">
            <div className="backoffice-surface-muted px-4 py-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500">Current principal</div>
              <div className="mt-2 font-semibold text-slate-950">{session?.displayName ?? 'No active principal'}</div>
              <div className="mt-1 text-[12px] text-slate-500">{session?.email ?? 'No active session'}</div>
            </div>
            <div className="backoffice-surface-muted px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950">Backoffice access</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {hasRequiredScope ? 'Admin scope present' : 'Required admin scope missing'}
                  </div>
                </div>
                <StatusPill tone={isAuthenticated && hasRequiredScope ? 'success' : 'muted'}>
                  {isAuthenticated && hasRequiredScope ? 'Authorized' : isAuthenticated ? 'Authenticated only' : 'Signed out'}
                </StatusPill>
              </div>
            </div>
            <div className="backoffice-surface-muted px-4 py-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500">Live access scopes</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {session?.scopes?.map((scope) => (
                  <StatusPill key={scope} tone="muted">{scope}</StatusPill>
                ))}
                {session?.scopes?.length ? null : <span className="text-[12px] text-slate-500">No active scopes</span>}
              </div>
            </div>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Scope model</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Intended backoffice responsibilities</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="resource-table">
                <thead>
                  <tr>
                    <th>Scope</th>
                    <th>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {adminScopes.map((item) => (
                    <tr key={item.role}>
                      <td className="font-semibold text-slate-950">{item.role}</td>
                      <td>{item.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>

          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Gaps</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Controls still missing</h2>
            </div>
            <div className="grid gap-3 px-5 py-5 text-sm leading-6 text-slate-600">
              {policyItems.map((item) => (
                <div key={item} className="backoffice-surface-muted px-4 py-4">{item}</div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
