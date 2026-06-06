import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import type { AdminCredentials, AdminSession } from '../types';

const SESSION_STORAGE_KEY = 'orderflow_admin_session';
const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@orderflow.local';
const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'OrderFlow!Admin123';

interface AuthContextValue {
  adminEmail: string;
  isAuthenticated: boolean;
  session: AdminSession | null;
  signIn: (credentials: AdminCredentials) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AdminSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AdminSession | null>(() => readStoredSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      adminEmail: DEFAULT_ADMIN_EMAIL,
      isAuthenticated: session !== null,
      session,
      signIn: (credentials) => {
        const email = credentials.email.trim().toLowerCase();
        if (email !== DEFAULT_ADMIN_EMAIL.toLowerCase() || credentials.password !== DEFAULT_ADMIN_PASSWORD) {
          throw new Error('Invalid credentials');
        }

        const nextSession: AdminSession = {
          email: DEFAULT_ADMIN_EMAIL,
          displayName: 'OrderFlow Backoffice Admin',
          signedInAt: new Date().toISOString(),
        };

        setSession(nextSession);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
        }
      },
      signOut: () => {
        setSession(null);
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
