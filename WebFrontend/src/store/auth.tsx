import React, { createContext, useContext, useMemo, useState } from 'react';
import type { LoginRequest } from '../types/api';
import { apiClient } from '../lib/api/client';

type AuthContextType = {
  isAuthenticated: boolean;
  token: string | null;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'cup_token';

// PUBLIC_INTERFACE
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  /**
   * Provides authentication state and actions to the React component tree.
   * Note: In a later step, integrate refresh tokens and RBAC from backend.
   */
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const login = async (payload: LoginRequest) => {
    // Placeholder auth flow using API client; robust error handling to be added later.
    const res = await apiClient().auth.login(payload);
    setToken(res.access_token);
    localStorage.setItem(TOKEN_KEY, res.access_token);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: Boolean(token),
    token,
    login,
    logout
  }), [token]);

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
