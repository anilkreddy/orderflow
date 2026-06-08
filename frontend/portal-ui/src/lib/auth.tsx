import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { createIdentityClient } from './identity-client';

const identityClient = createIdentityClient({
  url: import.meta.env.VITE_AUTH_URL ?? 'http://localhost:8180',
  realm: import.meta.env.VITE_AUTH_REALM ?? 'oflio',
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID ?? 'oflio-portal-ui',
});

const requiredScope = import.meta.env.VITE_REQUIRED_SCOPE ?? 'customer';
const clientId = import.meta.env.VITE_AUTH_CLIENT_ID ?? 'oflio-portal-ui';

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

export interface CustomerSession {
  email: string;
  displayName: string;
  givenName: string;
  scopes: string[];
  clientRoles: string[];
  realmRoles: string[];
}

interface AuthContextValue {
  ready: boolean;
  isAuthenticated: boolean;
  hasRequiredScope: boolean;
  session: CustomerSession | null;
  authorizationMessage: string | null;
  signIn: (forcePrompt?: boolean, loginHint?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearMessage: () => void;
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

function buildSession(): CustomerSession | null {
  const token = identityClient.tokenParsed as Record<string, unknown> | undefined;
  if (!token) {
    return null;
  }

  const givenName = typeof token.given_name === 'string' ? token.given_name : '';
  const familyName = typeof token.family_name === 'string' ? token.family_name : '';
  const displayName = `${givenName} ${familyName}`.trim() || (typeof token.name === 'string' ? token.name : '') || 'Customer';
  const email = typeof token.email === 'string' ? token.email : (typeof token.preferred_username === 'string' ? token.preferred_username : '');
  const clientRoles = ((token.resource_access as Record<string, { roles?: string[] }> | undefined)?.[clientId]?.roles ?? []).map((role) => role.toString());
  const realmRoles = ((token.realm_access as { roles?: string[] } | undefined)?.roles ?? []).map((role) => role.toString());

  return {
    email,
    displayName,
    givenName: givenName || displayName.split(' ')[0] || 'Customer',
    scopes: readScopes(token, clientRoles, realmRoles),
    clientRoles,
    realmRoles,
  };
}

function hasRequiredScope() {
  const session = buildSession();
  return session?.scopes.includes(requiredScope) ?? false;
}

export function getCustomerAccessToken() {
  return identityClient.token ?? null;
}

export function CustomerAuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [authorizationMessage, setAuthorizationMessage] = useState<string | null>(null);

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
        setAuthorized(scopeAllowed);
        setAuthorizationMessage(isAuthenticated && !scopeAllowed ? 'This account is not allowed to access the Oflio storefront.' : null);
        setReady(true);
      } catch {
        if (!active) {
          return;
        }
        setAuthorizationMessage('Unable to initialize storefront identity right now.');
        setReady(true);
      }
    }

    identityClient.onAuthSuccess = () => {
      setAuthenticated(true);
      const nextSession = buildSession();
      setSession(nextSession);
      const scopeAllowed = hasRequiredScope();
      setAuthorized(scopeAllowed);
      setAuthorizationMessage(scopeAllowed ? null : 'This account is not allowed to access the Oflio storefront.');
    };

    identityClient.onAuthLogout = () => {
      setAuthenticated(false);
      setAuthorized(false);
      setSession(null);
    };

    identityClient.onTokenExpired = () => {
      void identityClient.updateToken(30).catch(() => {
        setAuthenticated(false);
        setAuthorized(false);
        setSession(null);
      });
    };

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    isAuthenticated: authenticated,
    hasRequiredScope: authorized,
    session,
    authorizationMessage,
    signIn: async (forcePrompt = false, loginHint?: string) => {
      setAuthorizationMessage(null);
      await identityClient.login({
        redirectUri: window.location.href,
        prompt: forcePrompt ? 'login' : undefined,
        loginHint,
      });
    },
    signOut: async () => {
      await identityClient.logout({ redirectUri: window.location.origin });
    },
    clearMessage: () => setAuthorizationMessage(null),
  }), [authenticated, authorizationMessage, authorized, ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  }
  return context;
}
