import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute() {
  const { ready, isAuthenticated, hasRequiredScope } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] px-6 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-600 shadow-sm">
          Initializing Oflio Commerce Admin authentication...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasRequiredScope) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
