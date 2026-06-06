import { FormEvent, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { departments } from '../lib/catalog';
import { useCart } from '../lib/cart';

const utilityLinks = [
  { to: '/shop', label: 'Shop all' },
  { to: '/track-order', label: 'Track order' },
];

export function AppLayout() {
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!location.pathname.startsWith('/shop')) {
      return;
    }

    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') ?? '');
  }, [location.pathname, location.search]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set('q', search.trim());
    }

    navigate({ pathname: '/shop', search: params.toString() ? `?${params.toString()}` : '' });
  }

  return (
    <div className="market-shell min-h-screen text-slate-900">
      <div className="bg-[#08162c] px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dbeafe] md:px-6">
        Free shipping over $150 • guest checkout • live inventory from Oflio
      </div>

      <header className="sticky top-0 z-30 shadow-[0_18px_40px_rgba(8,22,44,0.16)]">
        <div className="bg-[#0b1730] text-white">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center">
            <NavLink to="/" className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#ffcd38] text-sm font-extrabold uppercase tracking-[0.28em] text-[#08162c]">
                OF
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-300">Portal UI</p>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Oflio</h1>
              </div>
            </NavLink>

            <form className="market-search mx-auto flex w-full max-w-4xl items-center overflow-hidden rounded-full bg-white" onSubmit={handleSearchSubmit}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent px-5 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Search products, gift ideas, and everyday essentials"
              />
              <button
                type="submit"
                className="mr-2 inline-flex items-center justify-center rounded-full bg-[#ffcd38] px-6 py-3 text-sm font-semibold text-[#08162c] transition hover:bg-[#ffd962]"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-3 self-end lg:self-auto">
              <NavLink
                to="/cart"
                className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#08162c] transition hover:bg-slate-100"
              >
                Cart
                <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#0f63ff] px-2 py-1 text-xs font-bold text-white">
                  {itemCount}
                </span>
              </NavLink>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-white/94 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {utilityLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-4 py-2 transition',
                      isActive ? 'bg-slate-100 font-semibold text-slate-950' : 'hover:bg-slate-50 hover:text-slate-950',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {departments.slice(0, 4).map((department) => (
                <button
                  key={department.key}
                  type="button"
                  className="rounded-full px-4 py-2 text-left transition hover:bg-slate-50 hover:text-slate-950"
                  onClick={() => navigate(`/shop?category=${encodeURIComponent(department.key)}`)}
                >
                  {department.label}
                </button>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              <span>Everyday savings</span>
              <span>Fast reorder flow</span>
              <span>Track live orders</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-16 bg-[#091327] text-slate-200">
        <div className="mx-auto grid max-w-[1480px] gap-10 px-4 py-14 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Oflio</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">Marketplace-style shopping on top of the OrderFlow services.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Customers can browse active products, build a basket, and submit live orders while backoffice management stays isolated in admin-ui.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Shop</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <NavLink to="/shop">Shop all</NavLink>
              <NavLink to="/cart">Cart</NavLink>
              <NavLink to="/track-order">Track order</NavLink>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Departments</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              {departments.slice(0, 4).map((department) => (
                <button
                  key={department.key}
                  type="button"
                  className="text-left"
                  onClick={() => navigate(`/shop?category=${encodeURIComponent(department.key)}`)}
                >
                  {department.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Customer care</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <NavLink to="/track-order">Track your order</NavLink>
              <NavLink to="/shop">Shop by department</NavLink>
              <span>Secure guest checkout</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
