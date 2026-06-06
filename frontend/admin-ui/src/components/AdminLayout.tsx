import { useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';

interface NavigationItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  note: string;
  section: 'Commerce' | 'Operations' | 'System';
  to: string;
}

const navigation: NavigationItem[] = [
  { to: '/dashboard', label: 'Overview', note: 'Trading, demand, and workload', icon: DashboardIcon, section: 'Commerce' },
  { to: '/orders', label: 'Orders', note: 'Queue, exceptions, and reviews', icon: OrderIcon, section: 'Commerce' },
  { to: '/customers', label: 'Customers', note: 'Buyer profiles and value', icon: CustomersIcon, section: 'Commerce' },
  { to: '/products', label: 'Products', note: 'Catalog, price, and stock', icon: ProductIcon, section: 'Commerce' },
  { to: '/search', label: 'Search', note: 'Ranking, facets, and synonyms', icon: SearchIcon, section: 'Operations' },
  { to: '/integrations', label: 'Integrations', note: 'Runtime surfaces and services', icon: LinkIcon, section: 'Operations' },
  { to: '/access-control', label: 'Access', note: 'Credentials, roles, and policy', icon: ShieldIcon, section: 'System' },
];

const sections: Array<NavigationItem['section']> = ['Commerce', 'Operations', 'System'];

function resolvePageTitle(pathname: string) {
  if (pathname === '/dashboard' || pathname === '/') {
    return 'Overview';
  }

  if (pathname.startsWith('/orders/')) {
    return 'Order Review';
  }

  if (pathname === '/orders') {
    return 'Orders';
  }

  if (pathname === '/customers') {
    return 'Customers';
  }

  if (pathname === '/products/new') {
    return 'Create Product';
  }

  if (pathname.startsWith('/products/') && pathname.endsWith('/edit')) {
    return 'Edit Product';
  }

  if (pathname === '/products') {
    return 'Products';
  }

  if (pathname === '/search') {
    return 'Search Operations';
  }

  if (pathname === '/integrations') {
    return 'Integrations';
  }

  if (pathname === '/access-control') {
    return 'Access Control';
  }

  return 'Admin';
}

export function AdminLayout() {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    const source = session?.displayName ?? 'Backoffice User';
    return source
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [session?.displayName]);

  const currentView = useMemo(() => {
    return navigation.find((item) => location.pathname.startsWith(item.to)) ?? navigation[0];
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${resolvePageTitle(location.pathname)} | Oflio Commerce Admin`;
  }, [location.pathname]);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="grid min-h-screen xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="backoffice-sidebar hidden h-screen flex-col px-5 py-5 text-slate-100 xl:flex xl:sticky xl:top-0">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-950">OF</div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Store console</div>
              <div className="truncate font-display text-xl font-semibold text-white">Oflio Commerce</div>
            </div>
          </div>

          <div className="mt-8 flex-1 space-y-7 overflow-y-auto pr-1">
            {sections.map((section) => (
              <div key={section}>
                <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{section}</div>
                <nav className="mt-2.5 grid gap-1">
                  {navigation
                    .filter((item) => item.section === section)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            [
                              'group relative flex items-start gap-3 rounded-2xl px-3 py-3 transition',
                              isActive
                                ? 'bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)] before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-full before:bg-slate-950'
                                : 'text-slate-300 hover:bg-white/6 hover:text-white',
                            ].join(' ')
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={[
                                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition',
                                  isActive
                                    ? 'border-slate-200 bg-slate-950 text-white shadow-sm'
                                    : 'border-current/10 bg-current/5 text-current',
                                ].join(' ')}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={[
                                    'block text-[13px] font-semibold',
                                    isActive ? 'text-slate-950' : 'text-slate-100 group-hover:text-white',
                                  ].join(' ')}
                                >
                                  {item.label}
                                </span>
                                <span
                                  className={[
                                    'mt-1 block text-[11px]',
                                    isActive ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-300',
                                  ].join(' ')}
                                >
                                  {item.note}
                                </span>
                              </span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <header className="backoffice-topbar sticky top-0 z-30 border-b border-slate-200/80">
            <div className="px-4 py-4 sm:px-6 xl:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white xl:hidden">OF</div>
                  <label className="relative block w-full max-w-[760px]">
                    <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="backoffice-search pl-10 pr-24"
                      placeholder="Search orders, products, customers, or jump to a workspace"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 lg:inline-flex">
                      ⌘ K
                    </span>
                  </label>
                </div>

                <div className="flex items-start gap-2 self-end xl:self-auto">
                  <button type="button" className="backoffice-button-secondary">Store health</button>
                  <button type="button" className="backoffice-button-secondary">Tasks</button>
                  <div
                    ref={profileMenuRef}
                    className="relative"
                    onMouseEnter={() => setProfileOpen(true)}
                    onMouseLeave={() => setProfileOpen(false)}
                  >
                    <button
                      type="button"
                      aria-expanded={profileOpen}
                      aria-haspopup="menu"
                      onClick={() => setProfileOpen((current) => !current)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {initials}
                    </button>

                    {profileOpen ? (
                      <div className="absolute right-0 top-full z-40 mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-bold text-white">{initials}</div>
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-950">{session?.displayName}</div>
                              <div className="truncate text-[12px] text-slate-500">{session?.email}</div>
                              {session ? <div className="mt-1 text-[11px] text-slate-400">Signed in {formatDateTime(session.signedInAt)}</div> : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 grid">
                          <Link
                            to="/access-control"
                            className="rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            Profile & access
                          </Link>
                          <a
                            href="http://localhost:5173"
                            className="rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            Open storefront
                          </a>
                          <button
                            type="button"
                            onClick={signOut}
                            className="rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Current workspace</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-950">{currentView.label}</span>
                    <span className="text-slate-300">/</span>
                    <span>{currentView.note}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 xl:hidden">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => [
                          'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold transition',
                          isActive ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200',
                        ].join(' ')}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 py-5 sm:px-6 xl:px-8 xl:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function IconBase(props: SVGProps<SVGSVGElement>) {
  return <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" {...props} />;
}

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 12h7V4H4zm9 8h7v-5h-7zM4 20h7v-5H4zm9-9h7V4h-7z" />
    </IconBase>
  );
}

function OrderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 6h2l1.2 7.2A2 2 0 0 0 9.2 15H18a2 2 0 0 0 2-1.6L21 8H8" />
      <path d="M9 19a1 1 0 1 0 0 .01M18 19a1 1 0 1 0 0 .01" />
    </IconBase>
  );
}

function ProductIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5z" />
      <path d="M4 8v8l8 5 8-5V8" />
      <path d="M12 12v9" />
    </IconBase>
  );
}

function CustomersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M17 11a3 3 0 1 0-2.2-5" />
      <path d="M20.5 19a5.5 5.5 0 0 0-4.5-5.4" />
    </IconBase>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5.5 6v5.5c0 4.8 2.9 7.8 6.5 9.5 3.6-1.7 6.5-4.7 6.5-9.5V6z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.7" />
    </IconBase>
  );
}

function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M10 13a4 4 0 0 1 0-5.7l1.8-1.8a4 4 0 1 1 5.7 5.7L16 13" />
      <path d="M14 11a4 4 0 0 1 0 5.7l-1.8 1.8a4 4 0 1 1-5.7-5.7L8 11" />
    </IconBase>
  );
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}
