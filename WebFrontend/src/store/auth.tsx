import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { LoginRequest, Role } from '../types/api';
import { apiClient } from '../lib/api/client';
import { configureAuth } from '../lib/api/http';

export type AuthUser = {
  email?: string;
  username?: string;
  sub?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  roles: Role[];
  user: AuthUser | null;
  remember: boolean;
  login: (payload: LoginRequest, remember?: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AT_KEY = 'cup_at';
const RT_KEY = 'cup_rt';
const PERSIST_KEY = 'cup_persist';

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

// PUBLIC_INTERFACE
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  /**
   * Provides authentication state and actions to the React component tree.
   * - Stores tokens in memory by default
   * - Optional persistence to localStorage if user opts-in ("Remember me")
   * - Integrates with HTTP client to attach tokens and handle refresh
   */
  const initialRemember = (() => {
    try {
      return localStorage.getItem(PERSIST_KEY) === 'true';
    } catch {
      return false;
    }
  })();

  const [accessToken, setAccessToken] = useState<string | null>(() =>
    initialRemember ? localStorage.getItem(AT_KEY) : null
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    initialRemember ? localStorage.getItem(RT_KEY) : null
  );
  const [remember, setRemember] = useState<boolean>(initialRemember);
  const [roles, setRoles] = useState<Role[]>(() => extractRolesFromToken(accessToken));
  const [user, setUser] = useState<AuthUser | null>(() => extractUserFromToken(accessToken));

  const persistOrClear = (at: string | null, rt: string | null, persist: boolean) => {
    try {
      if (persist) {
        if (at) localStorage.setItem(AT_KEY, at);
        else localStorage.removeItem(AT_KEY);
        if (rt) localStorage.setItem(RT_KEY, rt);
        else localStorage.removeItem(RT_KEY);
        localStorage.setItem(PERSIST_KEY, 'true');
      } else {
        localStorage.removeItem(AT_KEY);
        localStorage.removeItem(RT_KEY);
        localStorage.setItem(PERSIST_KEY, 'false');
      }
    } catch {
      // ignore storage errors (e.g., private mode)
    }
  };

  const login = async (payload: LoginRequest, rememberFlag: boolean = false) => {
    const res = await apiClient().auth.login(payload);
    setAccessToken(res.access_token);
    setRefreshToken(res.refresh_token);
    setRoles(extractRolesFromToken(res.access_token));
    setUser(extractUserFromToken(res.access_token));
    setRemember(rememberFlag);
    persistOrClear(res.access_token, res.refresh_token, rememberFlag);
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setRoles([]);
    setUser(null);
    persistOrClear(null, null, false);
  };

  const refresh = async (): Promise<boolean> => {
    if (!refreshToken) return false;
    try {
      const res = await apiClient().auth.refresh(refreshToken);
      setAccessToken(res.access_token);
      setRefreshToken(res.refresh_token);
      setRoles(extractRolesFromToken(res.access_token));
      setUser(extractUserFromToken(res.access_token));
      persistOrClear(res.access_token, res.refresh_token, remember);
      return true;
    } catch {
      // Fallback to re-login requirement: reset and signal unauthorized
      logout();
      return false;
    }
  };

  // Wire auth with HTTP client
  useEffect(() => {
    configureAuth({
      getAccessToken: () => accessToken,
      refresh,
      onUnauthorized: logout
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, refreshToken, remember]);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: Boolean(accessToken),
    accessToken,
    refreshToken,
    roles,
    user,
    remember,
    login,
    logout
  }), [accessToken, refreshToken, roles, user, remember]);

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
