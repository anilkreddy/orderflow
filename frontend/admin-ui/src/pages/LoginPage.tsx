import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface LoginState {
  from?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminEmail, signIn } = useAuth();
  const [email, setEmail] = useState(adminEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const targetRoute = (location.state as LoginState | null)?.from ?? '/dashboard';

  useEffect(() => {
    document.title = 'Sign In | Oflio Commerce Admin';
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      signIn({ email, password });
      navigate(targetRoute, { replace: true });
    } catch {
      setError('The provided email or password is invalid.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-shell min-h-screen px-4 py-8 text-white">
      <div className="mx-auto grid max-w-[1380px] gap-5 xl:grid-cols-[0.95fr_420px]">
        <section className="rounded-[28px] border border-white/10 bg-white/6 px-8 py-9 backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Restricted commerce workspace</div>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Operate Oflio like a real ecommerce backoffice.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Catalog, order, customer, and search operations live here. The shopper storefront stays separate. This sign-in is the current backoffice boundary until gateway-backed authentication is introduced.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ['Catalog control', 'Manage categories, visibility, and inventory-aware products.'],
              ['Order review', 'Inspect queue health, exceptions, and customer purchase detail.'],
              ['Search ops', 'Tune runtime synonyms and validate ranking behavior.'],
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
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-950">Use the configured admin credentials</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Credentials are provided via `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD`. Replace the defaults before sharing the environment.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="backoffice-input mt-2" required />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="backoffice-input mt-2" required />
            </label>

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <button type="submit" disabled={pending} className="backoffice-button-primary w-full">
              {pending ? 'Signing in...' : 'Access backoffice'}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            The customer storefront remains available at{' '}
            <a href="http://localhost:5173" className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4">
              http://localhost:5173
            </a>
            .
          </div>
        </section>
      </div>
    </div>
  );
}
