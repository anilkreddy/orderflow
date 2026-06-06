import { useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';

interface NavigationItem {
  badge?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  note: string;
  to: string;
}

const navigation: NavigationItem[] = [
  { to: '/dashboard', label: 'Dashboard', note: 'Revenue and performance', icon: DashboardIcon },
  { to: '/orders', label: 'Orders', note: 'Queue and fulfillment', icon: OrderIcon },
  { to: '/products', label: 'Products', note: 'Catalog and inventory', icon: ProductIcon },
  { to: '/customers', label: 'Customers', note: 'Profiles and lifetime value', icon: CustomersIcon },
  { to: '/access-control', label: 'Access Control', note: 'Credentials and roles', icon: ShieldIcon },
  { to: '/integrations', label: 'Integrations', note: 'Services and runtime', icon: LinkIcon, badge: 'LIVE' },
];

const quickActions = [
  { label: 'Alerts', icon: BellIcon, tone: 'bg-amber-400' },
  { label: 'Messages', icon: MessageIcon, tone: 'bg-emerald-500' },
  { label: 'Settings', icon: SettingsIcon, tone: 'bg-slate-300' },
];

export function AdminLayout() {
  const { session, signOut } = useAuth();
  const [search, setSearch] = useState('');

  const initials = useMemo(() => {
    const source = session?.displayName ?? 'Admin User';
    return source
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [session?.displayName]);

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="mx-auto flex max-w-[1760px]">
        <aside className="dashboard-sidebar sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-slate-200 bg-white px-6 py-6 xl:flex">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="block h-3.5 w-9 rounded-full bg-slate-900" />
              <span className="block h-3.5 w-3.5 rounded-full bg-slate-400" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">OrderFlow</div>
              <div className="mt-0.5 text-[1.7rem] font-extrabold tracking-tight text-slate-950">Backoffice</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400">Overview</div>
            <nav className="mt-4 grid gap-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-[16px] px-3.5 py-2.5 transition',
                        isActive
                          ? 'bg-[#edf3ff] text-[#2558f5] shadow-[inset_0_0_0_1px_rgba(37,88,245,0.08)]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                      ].join(' ')
                    }
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 group-hover:ring-slate-300">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        {item.label}
                        {item.badge ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{item.badge}</span> : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">{item.note}</span>
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Session</div>
            <div className="mt-3 text-[13px] text-slate-600">
              <div className="font-semibold text-slate-950">{session?.displayName}</div>
              <div className="mt-1">{session?.email}</div>
              {session ? <div className="mt-2 text-[11px] text-slate-500">Signed in {formatDateTime(session.signedInAt)}</div> : null}
            </div>
            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-slate-800"
              >
                Sign out
              </button>
              <a
                href="http://localhost:5173"
                className="inline-flex items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Open storefront
                <span className="text-slate-400">5173</span>
              </a>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5 xl:px-8 xl:py-6">
          <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form className="dashboard-search flex w-full max-w-[720px] items-center gap-3 rounded-[18px] bg-white px-4 py-3">
              <SearchIcon className="h-5 w-5 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Search orders, products, customers, or actions"
              />
              <span className="hidden rounded-xl bg-[#2558f5] px-3 py-1.5 text-[13px] font-semibold text-white lg:inline-flex">⌘ K</span>
            </form>

            <div className="flex items-center gap-3 self-end xl:self-auto">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} type="button" className="dashboard-action-button relative">
                    <Icon className="h-4.5 w-4.5 text-slate-700" />
                    <span className={`absolute right-2.5 top-2.5 h-2 w-2 rounded-full ${item.tone}`} />
                  </button>
                );
              })}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b,#2563eb)] text-sm font-bold text-white shadow-[0_14px_28px_rgba(37,88,245,0.22)]">
                {initials}
              </div>
            </div>
          </header>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition',
                      isActive ? 'bg-[#2558f5] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200',
                    ].join(' ')
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          <main className="mt-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function IconBase(props: SVGProps<SVGSVGElement>) {
  return <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24" {...props} />;
}

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 12h6V4H4zm10 8h6v-6h-6zM4 20h6v-4H4zm10-10h6V4h-6z" />
    </IconBase>
  );
}

function OrderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 6h15l-1.2 7H8.2z" />
      <path d="M6 6 5 3H3" />
      <path d="M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01" />
    </IconBase>
  );
}

function ProductIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m3 7 9-4 9 4-9 4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </IconBase>
  );
}

function CustomersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="10" r="3" />
      <path d="M20 19a4 4 0 0 0-3-3.87M4 19a4 4 0 0 1 3-3.87" />
    </IconBase>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v5c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M10 14a5 5 0 0 1 0-7l1.5-1.5a5 5 0 1 1 7 7L17 14" />
      <path d="M14 10a5 5 0 0 1 0 7L12.5 18.5a5 5 0 0 1-7-7L7 10" />
    </IconBase>
  );
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M15 17H5.5A1.5 1.5 0 0 1 4 15.5V15l1.5-1.5V10a5.5 5.5 0 0 1 11 0v3.5L18 15v.5A1.5 1.5 0 0 1 16.5 17H15" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function MessageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5 6h14v9H8l-3 3z" />
      <path d="M8 10h8M8 13h5" />
    </IconBase>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 3v2.5M12 18.5V21M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M3 12h2.5M18.5 12H21M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      <circle cx="12" cy="12" r="3.5" />
    </IconBase>
  );
}
