import { FormEvent, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../lib/auth';
import { departments } from '../lib/catalog';
import { CART_ITEM_ADDED_EVENT, type CartItemAddedEventDetail, useCart } from '../lib/cart';

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

  if (pathname.startsWith('/account')) {
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [cartAnimating, setCartAnimating] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const cartLinkRef = useRef<HTMLAnchorElement>(null);
  const cartPulseTimeoutRef = useRef<number | null>(null);

  const utilityLinks = [
    { to: '/shop', label: 'Shop all' },
    { to: '/track-order', label: hasRequiredScope ? 'Your orders' : 'Track order' },
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
    setAccountMenuOpen(false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    function pulseCart() {
      setCartAnimating(true);
      if (cartPulseTimeoutRef.current) {
        window.clearTimeout(cartPulseTimeoutRef.current);
      }
      cartPulseTimeoutRef.current = window.setTimeout(() => setCartAnimating(false), 420);
    }

    function handleCartItemAdded(event: Event) {
      const cartRect = cartLinkRef.current?.getBoundingClientRect();
      if (!cartRect) {
        return;
      }

      const { productName, sourceX, sourceY } = (event as CustomEvent<CartItemAddedEventDetail>).detail;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        pulseCart();
        return;
      }

      const marker = document.createElement('div');
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = productName.trim().charAt(0).toUpperCase() || '+';
      Object.assign(marker.style, {
        alignItems: 'center',
        background: '#0f63ff',
        border: '3px solid white',
        borderRadius: '9999px',
        boxShadow: '0 14px 34px rgba(15, 99, 255, 0.35)',
        color: 'white',
        display: 'flex',
        fontFamily: 'inherit',
        fontSize: '13px',
        fontWeight: '800',
        height: '38px',
        justifyContent: 'center',
        left: `${sourceX}px`,
        pointerEvents: 'none',
        position: 'fixed',
        top: `${sourceY}px`,
        width: '38px',
        zIndex: '100',
      });
      document.body.appendChild(marker);

      const targetX = cartRect.left + cartRect.width / 2;
      const targetY = cartRect.top + cartRect.height / 2;
      const deltaX = targetX - sourceX;
      const deltaY = targetY - sourceY;
      const animation = marker.animate([
        {
          offset: 0,
          opacity: 0,
          transform: 'translate(-50%, -50%) translate(0, 0) scale(0.55)',
        },
        {
          offset: 0.18,
          opacity: 1,
          transform: 'translate(-50%, -50%) translate(0, -12px) scale(1)',
        },
        {
          offset: 0.55,
          opacity: 1,
          transform: `translate(-50%, -50%) translate(${deltaX * 0.55}px, ${deltaY * 0.55 - 50}px) scale(0.8)`,
        },
        {
          offset: 1,
          opacity: 0.35,
          transform: `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px) scale(0.2)`,
        },
      ], {
        duration: 720,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      });

      void animation.finished
        .then(() => {
          marker.remove();
          pulseCart();
        })
        .catch(() => marker.remove());
    }

    window.addEventListener(CART_ITEM_ADDED_EVENT, handleCartItemAdded);
    return () => {
      window.removeEventListener(CART_ITEM_ADDED_EVENT, handleCartItemAdded);
      if (cartPulseTimeoutRef.current) {
        window.clearTimeout(cartPulseTimeoutRef.current);
      }
    };
  }, []);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set('q', search.trim());
    }

    navigate({ pathname: '/shop', search: params.toString() ? `?${params.toString()}` : '' });
  }

  function handleAccountClick() {
    if (!isAuthenticated || !hasRequiredScope) {
      void signIn(Boolean(authorizationMessage));
      return;
    }

    setAccountMenuOpen((open) => !open);
  }

  function handleAccountNavigation() {
    if (!isAuthenticated || !hasRequiredScope) {
      void signIn(Boolean(authorizationMessage));
      return;
    }

    navigate('/account');
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
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                  onClick={handleAccountClick}
                  disabled={!ready}
                  aria-expanded={isAuthenticated && hasRequiredScope ? accountMenuOpen : undefined}
                  aria-haspopup={isAuthenticated && hasRequiredScope ? 'menu' : undefined}
                >
                  {ready ? 'Account' : 'Identity...'}
                  {ready && isAuthenticated && hasRequiredScope ? (
                    <span className="max-w-28 truncate text-xs font-medium text-slate-300">
                      {session?.givenName ?? 'Customer'}
                    </span>
                  ) : null}
                </button>

                {accountMenuOpen && isAuthenticated && hasRequiredScope ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 text-slate-900 shadow-[0_24px_70px_rgba(8,22,44,0.28)]"
                  >
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">{session?.displayName ?? 'Customer account'}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{session?.email}</p>
                    </div>
                    <div className="grid gap-1 py-2">
                      {[
                        { to: '/account/profile', label: 'Profile' },
                        { to: '/account/addresses', label: 'Addresses' },
                        { to: '/account/orders', label: 'Orders' },
                        { to: '/account/payments', label: 'Payment methods' },
                        { to: '/account/security', label: 'Security' },
                        { to: '/account/preferences', label: 'Preferences' },
                      ].map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          role="menuitem"
                          className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-2xl border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      onClick={() => void signOut()}
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
              <NavLink
                to="/cart"
                ref={cartLinkRef}
                aria-label={`Cart with ${itemCount} item${itemCount === 1 ? '' : 's'}`}
                title="Cart"
                className={({ isActive }) => [
                  'relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#ffcd38] bg-[#ffcd38] text-[#08162c] shadow-[0_8px_22px_rgba(255,205,56,0.22)] transition duration-200 hover:bg-[#ffd962]',
                  cartAnimating ? 'scale-110 ring-4 ring-[#ffcd38]/30' : 'scale-100',
                  isActive
                    ? 'ring-2 ring-white/70'
                    : '',
                ].join(' ')}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-[#08162c]"
                >
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                  <path d="M3 4h2l2.25 10.25a2 2 0 0 0 1.95 1.57h8.95a2 2 0 0 0 1.94-1.51L22 7H6" />
                </svg>
                {itemCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0b1730] bg-[#0f63ff] px-1 text-[10px] font-bold leading-none text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                ) : null}
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
              <button
                type="button"
                className="rounded-full px-4 py-2 text-left transition hover:bg-slate-50 hover:text-slate-950"
                onClick={handleAccountNavigation}
                disabled={!ready}
              >
                Account
              </button>
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
              <button type="button" className="text-left" onClick={handleAccountNavigation}>
                Account
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
