import { FormEvent, useState } from 'react';
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
    <div className="min-h-screen bg-[#f7f8fc] px-4 py-8">
      <div className="mx-auto grid max-w-[1480px] gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="dashboard-card rounded-[30px] px-8 py-9">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Restricted access</div>
          <h1 className="mt-4 max-w-2xl text-5xl font-extrabold tracking-tight text-slate-950 md:text-6xl">
            Sign in to the OrderFlow ecommerce backoffice.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            This console is designed for catalog managers, support teams, and operations reviewers. Customer-facing shopping remains isolated in the storefront.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              'Catalog and inventory management',
              'Customer and order visibility',
              'Access-control and integration oversight',
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-card rounded-[30px] px-8 py-9">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Backoffice sign in</div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">Use configured admin credentials</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Credentials are provided through `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD`. Replace the defaults before sharing the environment.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-600">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-600">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#2558f5]"
                required
              />
            </label>

            {error ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#2558f5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1947db] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Signing in...' : 'Access backoffice'}
            </button>
          </form>

          <div className="mt-8 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
            The customer storefront remains available at{' '}
            <a href="http://localhost:5173" className="font-semibold text-[#2558f5] underline decoration-slate-300 underline-offset-4">
              http://localhost:5173
            </a>
            .
          </div>
        </section>
      </div>
    </div>
  );
}
