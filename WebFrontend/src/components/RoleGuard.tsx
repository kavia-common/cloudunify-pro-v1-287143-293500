import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import type { Role } from '../types/api';

type Props = {
  allowed: Role[];
  children: React.ReactNode;
  fallbackPath?: string;
};

// PUBLIC_INTERFACE
export default function RoleGuard({ allowed, children, fallbackPath = '/' }: Props): JSX.Element {
  /**
   * Guard component that restricts access to users with one of the allowed roles.
   * Requires an authenticated user; redirects to /login if not authenticated, or
   * to the provided fallbackPath if authenticated but lacking a required role.
   */
  const { isAuthenticated, roles } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = roles.some((r) => allowed.includes(r));
  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
