import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  /**
   * Guard component that requires the user to be authenticated.
   * If unauthenticated, navigates to /login and preserves the "from" location.
   */
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
