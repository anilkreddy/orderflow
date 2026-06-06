import { AdminPanel } from '../components/AdminPanel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../lib/auth';

const adminRoles = [
  {
    role: 'Backoffice Admin',
    scope: 'Full catalog write access, customer visibility, order review, access-control oversight',
  },
  {
    role: 'Catalog Manager',
    scope: 'Product creation, pricing changes, stock management, activation controls',
  },
  {
    role: 'Order Supervisor',
    scope: 'Order review, failure triage, customer exception handling, escalation routing',
  },
  {
    role: 'Support Analyst',
    scope: 'Customer lookup, order inspection, read-only catalog visibility',
  },
];

const policyItems = [
  'The current sign-in is a client-side credential gate only and must be replaced by backend-issued JWT or an identity provider before production use.',
  'Destructive actions such as delete and write operations are not server-side role gated yet, so the UI role model is directional rather than authoritative.',
  'Audit trails, session expiry, and role-based route protection should attach to gateway-backed auth rather than remain inside the React client.',
];

export function AccessControlPage() {
  const { adminEmail, session } = useAuth();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Access"
        title="Make the current trust boundary explicit"
        description="This workspace documents the current credential boundary, the intended role model, and the operational gaps that still need server-side identity and authorization."
      />

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Current session</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Credential boundary</h2>
          </div>
          <div className="grid gap-4 px-5 py-5">
            <div className="backoffice-surface-muted px-4 py-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500">Configured admin identity</div>
              <div className="mt-2 font-semibold text-slate-950">{adminEmail}</div>
            </div>
            <div className="backoffice-surface-muted px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950">Session status</div>
                  <div className="mt-1 text-[12px] text-slate-500">{session?.email ?? 'No active session'}</div>
                </div>
                <StatusPill tone={session ? 'success' : 'muted'}>{session ? 'Authenticated' : 'Signed out'}</StatusPill>
              </div>
            </div>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel className="p-0 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Role model</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Intended backoffice responsibilities</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="resource-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRoles.map((item) => (
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
