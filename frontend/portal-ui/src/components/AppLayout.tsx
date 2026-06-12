import { FormEvent, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../lib/auth';
import { departments } from '../lib/catalog';
import { useCart } from '../lib/cart';

function resolvePageTitle(pathname: string) {
  if (pathname === '/') {
    return 'Home';
  }

  if (pathname === '/shop' || pathname === '/catalog') {
    return 'Shop';
  }

  if (pathname.startsWith('/products/')) {
    return 'Product Details';
  }

  if (pathname === '/cart') {
    return 'Cart';
  }

  if (pathname === '/checkout') {
    return 'Checkout';
  }

  if (pathname === '/register') {
    return 'Create Account';
  }

  if (pathname === '/account') {
    return 'My Account';
  }

  if (pathname === '/track-order') {
    return 'Track Order';
  }

  if (pathname.startsWith('/orders/')) {
    return 'Order Status';
  }

  return 'Storefront';
}

export function AppLayout() {
  const { itemCount } = useCart();
  const { ready, isAuthenticated, hasRequiredScope, session, authorizationMessage, signIn, signOut, clearMessage } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');

  const utilityLinks = [
    { to: '/shop', label: 'Shop all' },
    { to: '/track-order', label: hasRequiredScope ? 'Your orders' : 'Track order' },
    ...(hasRequiredScope ? [{ to: '/account', label: 'Account' }] : [{ to: '/register', label: 'Create account' }]),
  ];

  useEffect(() => {
    if (!location.pathname.startsWith('/shop')) {
      return;
    }

    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') ?? '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.title = `${resolvePageTitle(location.pathname)} | Oflio Commerce`;
  }, [location.pathname]);

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
          <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-start">
            <NavLink to="/" className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#ffcd38] text-sm font-extrabold uppercase tracking-[0.28em] text-[#08162c]">
                OF
              </span>
              <div>
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

            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto lg:justify-end">
              {authorizationMessage ? (
                <button
                  type="button"
                  className="rounded-full border border-amber-200/60 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-950"
                  onClick={() => {
                    clearMessage();
                    void signIn(true);
                  }}
                >
                  Switch account
                </button>
              ) : null}
              {!ready ? (
                <span className="rounded-full bg-white/10 px-4 py-3 text-xs font-semibold text-slate-200">Identity...</span>
              ) : isAuthenticated && hasRequiredScope ? (
                <>
                  <NavLink
                    to="/account"
                    className="hidden rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/16 lg:inline-flex"
                  >
                    Hello, {session?.givenName ?? 'Customer'}
                  </NavLink>
                  <button
                    type="button"
                    className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/register"
                    className="inline-flex items-center justify-center gap-3 rounded-full border border-transparent bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
                  >
                    Create account
                  </NavLink>
                  <button
                    type="button"
                    className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                    onClick={() => void signIn(Boolean(authorizationMessage))}
                  >
                    Sign in
                  </button>
                </>
              )}
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
              {/* Status badges intentionally removed per request. */}
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
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">Marketplace-style shopping powered by Oflio Commerce services.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Customers can browse active products, create accounts, and track their own orders while guest checkout stays available for casual shoppers.
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
            <p className="text-sm font-semibold text-white">Account</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <NavLink to="/register">Create account</NavLink>
              <NavLink to="/account">My account</NavLink>
              <button type="button" className="text-left" onClick={() => void signIn()}>
                Sign in
              </button>
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
