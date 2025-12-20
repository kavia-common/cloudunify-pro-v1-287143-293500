import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  /**
   * Guard component that requires the user to be authenticated.
   *
   * IMPORTANT:
   * - While auth is initializing (hydrating from storage), we must not redirect yet,
   *   otherwise we can create a login↔dashboard loop.
   */
  const { isAuthenticated, isAuthInitializing } = useAuth();
  const location = useLocation();

  if (isAuthInitializing) {
    return (
      <div style={{ padding: 24 }} role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
