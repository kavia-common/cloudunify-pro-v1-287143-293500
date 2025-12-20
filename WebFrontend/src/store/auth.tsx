import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { LoginRequest, Role } from '../types/api';
import { apiClient } from '../lib/api/client';
import { configureAuth } from '../lib/api/http';

function debugAuthLog(...args: any[]): void {
  try {
    const lvl = (import.meta as any)?.env?.REACT_APP_LOG_LEVEL || (import.meta as any)?.env?.VITE_LOG_LEVEL;
    if (String(lvl || '').toLowerCase() === 'debug') {
      // eslint-disable-next-line no-console
      console.log('[auth]', ...args);
    }
  } catch {
    // ignore
  }
}

export type AuthUser = {
  email?: string;
  username?: string;
  sub?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  /**
   * True while the provider is hydrating tokens from storage and wiring the HTTP client.
   * Route guards should not redirect while this is true to avoid redirect loops/race conditions.
   */
  isAuthInitializing: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  roles: Role[];
  user: AuthUser | null;
  organizationId: string | null;
  remember: boolean;
  login: (payload: LoginRequest, remember?: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Storage keys are intentionally short and stable, because other parts of the app may read them.
 * Do not change without a migration.
 */
const AT_KEY = 'cup_at';
const RT_KEY = 'cup_rt';
const PERSIST_KEY = 'cup_persist';

/** Allow small clock skew between client and server (seconds). */
const CLOCK_SKEW_SECONDS = 60;

function safeJsonParse(raw: string | null): any | null {
  try {
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Handle URL-safe base64
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Validate basic JWT time claims with skew tolerance.
 * Returns false if token is clearly not usable.
 */
function isJwtUsable(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== 'object') return false;

  const nowSec = Math.floor(Date.now() / 1000);

  const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
  // Some JWT libs set iat/nbf; tolerate small skew
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : undefined;
  const iat = typeof payload.iat === 'number' ? payload.iat : undefined;

  if (exp !== undefined && nowSec > exp + CLOCK_SKEW_SECONDS) return false;
  if (nbf !== undefined && nowSec + CLOCK_SKEW_SECONDS < nbf) return false;
  if (iat !== undefined && nowSec + CLOCK_SKEW_SECONDS < iat) return false;

  return true;
}

function extractRolesFromToken(token: string | null): Role[] {
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  if (!payload) return [];
  const raw = payload.role ?? payload.roles ?? [];
  if (Array.isArray(raw)) {
    return raw.filter((r) => typeof r === 'string') as Role[];
  }
  if (typeof raw === 'string') {
    return [raw as Role];
  }
  return [];
}

function extractUserFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== 'object') return null;
  const candidate: AuthUser = {
    email: payload.email || payload.user_email,
    username: payload.preferred_username || payload.username || payload.name,
    sub: payload.sub
  };
  if (candidate.email || candidate.username || candidate.sub) {
    return candidate;
  }
  return null;
}

function extractOrganizationIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== 'object') return null;

  const raw =
    payload.organization_id ??
    payload.org_id ??
    payload.organizationId ??
    payload.organization ??
    payload.tenant_id ??
    payload.tenantId ??
    null;

  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

type StoredAuth = {
  accessToken: string | null;
  refreshToken: string | null;
  remember: boolean;
};

function readStoredAuth(): StoredAuth {
  // Prefer persisted preference, defaulting to false
  let remember = false;
  try {
    remember = localStorage.getItem(PERSIST_KEY) === 'true';
  } catch {
    remember = false;
  }

  // If remember=true, read from localStorage; otherwise use sessionStorage.
  // This ensures non-remember sessions survive in-tab navigation, and avoids redirect loops.
  const storage: Storage | null = (() => {
    try {
      return remember ? localStorage : sessionStorage;
    } catch {
      return null;
    }
  })();

  const at = storage?.getItem(AT_KEY) ?? null;
  const rt = storage?.getItem(RT_KEY) ?? null;

  // If tokens are not usable, return empty.
  if (at && !isJwtUsable(at)) {
    return { accessToken: null, refreshToken: null, remember };
  }
  return { accessToken: at, refreshToken: rt, remember };
}

function writeStoredAuth(at: string | null, rt: string | null, remember: boolean): void {
  // Always try to keep both storages consistent: local holds persisted, session holds ephemeral.
  // When remember=true, write to local and clear session.
  // When remember=false, write to session and clear local tokens.
  try {
    localStorage.setItem(PERSIST_KEY, remember ? 'true' : 'false');
  } catch {
    // ignore
  }

  const safeWrite = (st: Storage, key: string, val: string | null) => {
    try {
      if (val) st.setItem(key, val);
      else st.removeItem(key);
    } catch {
      // ignore
    }
  };

  try {
    if (remember) {
      safeWrite(localStorage, AT_KEY, at);
      safeWrite(localStorage, RT_KEY, rt);
      // Clear session copy to avoid stale mixing
      safeWrite(sessionStorage, AT_KEY, null);
      safeWrite(sessionStorage, RT_KEY, null);
    } else {
      safeWrite(sessionStorage, AT_KEY, at);
      safeWrite(sessionStorage, RT_KEY, rt);
      // Clear persisted tokens when user did not opt-in
      safeWrite(localStorage, AT_KEY, null);
      safeWrite(localStorage, RT_KEY, null);
    }
  } catch {
    // ignore storage errors (e.g., private mode / disabled storage)
  }
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  /**
   * Provides authentication state and actions to the React component tree.
   *
   * Key behaviors:
   * - Tokens are stored in sessionStorage by default (per-tab session).
   * - If user opts in via "Remember me", tokens are persisted in localStorage.
   * - Auth is hydrated early on mount and guarded by `isAuthInitializing` to avoid redirect races.
   */
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);

  // Hydrate synchronously on first render to minimize redirect races
  const initial = useMemo(() => readStoredAuth(), []);
  const [remember, setRemember] = useState<boolean>(initial.remember);
  const [accessToken, setAccessToken] = useState<string | null>(initial.accessToken);
  const [refreshToken, setRefreshToken] = useState<string | null>(initial.refreshToken);

  const [roles, setRoles] = useState<Role[]>(() => extractRolesFromToken(initial.accessToken));
  const [user, setUser] = useState<AuthUser | null>(() => extractUserFromToken(initial.accessToken));
  const [organizationId, setOrganizationId] = useState<string | null>(() =>
    extractOrganizationIdFromToken(initial.accessToken)
  );

  // Prevent double-initialize effects in StrictMode from causing flicker.
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const stored = readStoredAuth();
    debugAuthLog('hydrate', {
      remember: stored.remember,
      hasAccessToken: Boolean(stored.accessToken),
      hasRefreshToken: Boolean(stored.refreshToken)
    });

    setRemember(stored.remember);
    setAccessToken(stored.accessToken);
    setRefreshToken(stored.refreshToken);
    setRoles(extractRolesFromToken(stored.accessToken));
    setUser(extractUserFromToken(stored.accessToken));
    setOrganizationId(extractOrganizationIdFromToken(stored.accessToken));
    setIsAuthInitializing(false);
  }, []);

  const setAuthFromTokens = (at: string | null, rt: string | null, rememberFlag: boolean) => {
    const usable = at ? isJwtUsable(at) : false;
    const finalAt = usable ? at : null;

    setAccessToken(finalAt);
    setRefreshToken(rt);
    setRemember(rememberFlag);
    setRoles(extractRolesFromToken(finalAt));
    setUser(extractUserFromToken(finalAt));
    setOrganizationId(extractOrganizationIdFromToken(finalAt));

    writeStoredAuth(finalAt, rt, rememberFlag);
  };

  const login = async (payload: LoginRequest, rememberFlag: boolean = false) => {
    const res = await apiClient().auth.login(payload);

    // Ensure response shape is correct; otherwise fail fast to avoid storing junk and looping.
    const at = (res as any)?.access_token;
    const rt = (res as any)?.refresh_token;
    const tokenType = (res as any)?.token_type;

    debugAuthLog('login response', {
      hasAccessToken: typeof at === 'string',
      hasRefreshToken: typeof rt === 'string',
      tokenType
    });

    if (typeof at !== 'string' || typeof rt !== 'string') {
      throw new Error('Login response missing access_token/refresh_token');
    }

    setAuthFromTokens(at, rt, rememberFlag);

    debugAuthLog('stored tokens', {
      remember: rememberFlag,
      organizationId: extractOrganizationIdFromToken(at) ?? '(none)'
    });
  };

  const logout = () => {
    setAuthFromTokens(null, null, false);
  };

  const refresh = async (): Promise<boolean> => {
    if (!refreshToken) return false;
    try {
      const res = await apiClient().auth.refresh(refreshToken);
      const at = (res as any)?.access_token;
      const rt = (res as any)?.refresh_token;
      if (typeof at !== 'string' || typeof rt !== 'string') return false;

      setAuthFromTokens(at, rt, remember);
      return true;
    } catch {
      // Fallback to re-login requirement: reset and signal unauthorized
      logout();
      return false;
    }
  };

  // Wire auth with HTTP client.
  useEffect(() => {
    configureAuth({
      getAccessToken: () => accessToken,
      refresh,
      onUnauthorized: () => {
        // During initial hydration, avoid aggressive logout loops from transient 401s.
        if (isAuthInitializing) return;
        logout();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, refreshToken, remember, isAuthInitializing]);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: Boolean(accessToken) && isJwtUsable(accessToken),
      isAuthInitializing,
      accessToken,
      refreshToken,
      roles,
      user,
      organizationId,
      remember,
      login,
      logout
    }),
    [accessToken, refreshToken, roles, user, organizationId, remember, isAuthInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth(): AuthContextType {
  /** Access authentication state and actions. Must be used within AuthProvider. */
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
