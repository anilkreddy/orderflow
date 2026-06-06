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
  'The admin UI is isolated behind configured credentials and should never be exposed with default values in shared environments.',
  'Because backend authentication does not yet exist, this credential gate is a UI-only control and must be replaced by JWT or Keycloak before production use.',
  'Catalog writes and destructive actions should eventually be role-gated and audited server-side, not just hidden in the client.',
];

export function AccessControlPage() {
  const { adminEmail, session } = useAuth();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Access control"
        title="Credentials, roles, and operational guardrails"
        description="This page keeps the current security model explicit while framing how server-side RBAC and identity integration can attach to the existing backoffice structure later."
      />

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Current session boundary</p>
          <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm text-slate-500">Configured admin email</div>
            <div className="mt-2 text-xl font-bold text-slate-950">{adminEmail}</div>
          </div>
          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">Current session</div>
                <div className="mt-1 text-sm text-slate-600">{session?.email ?? 'No active session'}</div>
              </div>
              <StatusPill tone={session ? 'success' : 'muted'}>{session ? 'Authenticated' : 'Signed out'}</StatusPill>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {policyItems.map((item) => (
              <div key={item} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Role model</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {adminRoles.map((item) => (
              <div key={item.role} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">{item.role}</div>
                <div className="mt-2 text-sm leading-7 text-slate-600">{item.scope}</div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
