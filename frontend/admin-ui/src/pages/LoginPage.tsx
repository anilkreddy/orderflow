import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface LoginState {
  from?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, isAuthenticated, hasRequiredScope, errorMessage, signIn, clearError } = useAuth();

  const targetRoute = (location.state as LoginState | null)?.from ?? '/dashboard';

  useEffect(() => {
    document.title = 'Sign In | Oflio Commerce Admin';
  }, []);

  useEffect(() => {
    if (ready && isAuthenticated && hasRequiredScope) {
      navigate(targetRoute, { replace: true });
    }
  }, [hasRequiredScope, isAuthenticated, navigate, ready, targetRoute]);

  return (
    <div className="login-shell min-h-screen px-4 py-8 text-white">
      <div className="mx-auto grid max-w-[1380px] gap-5 xl:grid-cols-[0.95fr_420px]">
        <section className="rounded-[28px] border border-white/10 bg-white/6 px-8 py-9 backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Restricted commerce workspace</div>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Operate Oflio like a real ecommerce backoffice.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Backoffice users authenticate through the shared identity platform. Group and scope assignment in the Oflio realm determines who can enter this portal.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ['Catalog control', 'Manage products, categories, pricing, and inventory-aware visibility.'],
              ['Order review', 'Inspect queue health, customer exceptions, and fulfillment context.'],
              ['Search ops', 'Tune synonyms, facets, and search governance with gated access.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                <div className="font-semibold text-white">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="backoffice-surface px-7 py-8 text-slate-900">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Backoffice sign in</div>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-950">Authenticate with managed identity</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Admin access requires the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">admin</code> access scope in the browser token accepted by the gateway.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 space-y-4">
            <button
              type="button"
              className="backoffice-button-primary w-full"
              onClick={() => {
                clearError();
                void signIn(Boolean(errorMessage));
              }}
            >
              {ready ? 'Continue to sign in' : 'Preparing identity provider...'}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            Default local identities are seeded for development. Use <span className="font-semibold text-slate-950">admin@oflio.local</span> for backoffice access and the storefront customer account separately.
          </div>
        </section>
      </div>
    </div>
  );
}
