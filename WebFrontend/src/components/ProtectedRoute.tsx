import React from 'react';

/**
 * TODO(auth): Re-enable real route protection.
 * Previously this component:
 * - waited for auth hydration
 * - redirected unauthenticated users to /login
 *
 * Auth is temporarily bypassed for development/demo purposes, so this component
 * is currently a pass-through.
 */

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  /** Guard component (temporarily disabled): always allows access while auth is disabled. */
  return <>{children}</>;
}
