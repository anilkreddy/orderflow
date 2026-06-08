import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { AdminSession } from '../types';
import { createIdentityClient } from './identity-client';

const identityClient = createIdentityClient({
  url: import.meta.env.VITE_AUTH_URL ?? 'http://localhost:8180',
  realm: import.meta.env.VITE_AUTH_REALM ?? 'oflio',
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID ?? 'oflio-admin-ui',
});

const requiredScope = import.meta.env.VITE_REQUIRED_SCOPE ?? 'admin';
const clientId = import.meta.env.VITE_AUTH_CLIENT_ID ?? 'oflio-admin-ui';

const roleToScope: Record<string, string> = {
  CUSTOMER: 'customer',
  'storefront-access': 'customer',
  BACKOFFICE_ADMIN: 'admin',
  'admin-ui-access': 'admin',
  'catalog-manager': 'catalog_manager',
  'order-manager': 'order_manager',
  'customer-manager': 'customer_manager',
  'search-manager': 'search_manager',
};

interface AuthContextValue {
  ready: boolean;
  isAuthenticated: boolean;
  hasRequiredScope: boolean;
  session: AdminSession | null;
  errorMessage: string | null;
  signIn: (forcePrompt?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readScopes(token: Record<string, unknown>, clientRoles: string[], realmRoles: string[]) {
  const directScopes = [
    ...(typeof token.scope === 'string' ? token.scope.split(' ') : []),
    ...((Array.isArray(token.scp) ? token.scp : []) as string[]),
  ].filter((scope) => typeof scope === 'string' && scope.length > 0);

  const mappedScopes = [...clientRoles, ...realmRoles]
    .map((role) => roleToScope[role])
    .filter((scope): scope is string => Boolean(scope));

  return Array.from(new Set([...directScopes, ...mappedScopes])).sort();
}

function buildSession(): AdminSession | null {
  const token = identityClient.tokenParsed as Record<string, unknown> | undefined;
  if (!token) {
    return null;
  }

  const givenName = typeof token.given_name === 'string' ? token.given_name : '';
  const familyName = typeof token.family_name === 'string' ? token.family_name : '';
  const displayName = `${givenName} ${familyName}`.trim() || (typeof token.name === 'string' ? token.name : '') || 'Oflio User';
  const email = typeof token.email === 'string' ? token.email : (typeof token.preferred_username === 'string' ? token.preferred_username : '');
  const issuedAt = typeof token.iat === 'number' ? new Date(token.iat * 1000).toISOString() : new Date().toISOString();

  const clientRoles = ((token.resource_access as Record<string, { roles?: string[] }> | undefined)?.[clientId]?.roles ?? []).map((role) => role.toString());
  const realmRoles = ((token.realm_access as { roles?: string[] } | undefined)?.roles ?? []).map((role) => role.toString());

  return {
    email,
    displayName,
    signedInAt: issuedAt,
    scopes: readScopes(token, clientRoles, realmRoles),
    clientRoles,
    realmRoles,
  };
}

function hasRequiredScope() {
  const session = buildSession();
  return session?.scopes.includes(requiredScope) ?? false;
}

export function getAdminAccessToken() {
  return identityClient.token ?? null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const isAuthenticated = await identityClient.init({
          onLoad: 'check-sso',
          pkceMethod: 'S256',
          checkLoginIframe: false,
        });

        if (!active) {
          return;
        }

        setAuthenticated(isAuthenticated);
        const nextSession = isAuthenticated ? buildSession() : null;
        setSession(nextSession);
        const scopeAllowed = isAuthenticated ? hasRequiredScope() : false;
        setAllowed(scopeAllowed);
        setErrorMessage(isAuthenticated && !scopeAllowed ? 'This account does not have access to the Oflio Commerce backoffice.' : null);
        setReady(true);
      } catch {
        if (!active) {
          return;
        }
        setErrorMessage('Unable to initialize backoffice identity right now.');
        setReady(true);
      }
    }

    identityClient.onAuthSuccess = () => {
      setAuthenticated(true);
      const nextSession = buildSession();
      setSession(nextSession);
      const scopeAllowed = hasRequiredScope();
      setAllowed(scopeAllowed);
      setErrorMessage(scopeAllowed ? null : 'This account does not have access to the Oflio Commerce backoffice.');
    };

    identityClient.onAuthLogout = () => {
      setAuthenticated(false);
      setSession(null);
      setAllowed(false);
    };

    identityClient.onTokenExpired = () => {
      void identityClient.updateToken(30).catch(() => {
        setAuthenticated(false);
        setSession(null);
        setAllowed(false);
      });
    };

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isAuthenticated: authenticated,
      hasRequiredScope: allowed,
      session,
      errorMessage,
      signIn: async (forcePrompt = false) => {
        setErrorMessage(null);
        await identityClient.login({
          redirectUri: `${window.location.origin}/dashboard`,
          prompt: forcePrompt ? 'login' : undefined,
        });
      },
      signOut: async () => {
        await identityClient.logout({ redirectUri: `${window.location.origin}/login` });
      },
      clearError: () => setErrorMessage(null),
    }),
    [allowed, authenticated, errorMessage, ready, session],
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
