import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import Costs from './pages/Costs';
import Recommendations from './pages/Recommendations';
import Automation from './pages/Automation';
import Activity from './pages/Activity';
// NOTE: Auth is temporarily disabled; keep these imports commented to avoid unused warnings.
// TODO(auth): Re-enable Login/Signup routes and imports when auth is turned back on.
// import Login from './pages/Login';
// import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * TODO(auth): Restore auth-driven landing:
 * - Unauthenticated -> /login
 * - Authenticated -> /app (or /dashboard)
 *
 * For now, we bypass auth entirely and land on /dashboard.
 */
function AuthDisabledIndex(): JSX.Element {
  return <Navigate to="/dashboard" replace />;
}

// PUBLIC_INTERFACE
export default function App(): JSX.Element {
  /** App component defining the application routes and layout structure. Auth is temporarily bypassed. */
  return (
    <Routes>
      {/* Default landing while auth is disabled */}
      <Route path="/" element={<AuthDisabledIndex />} />

      {/* TODO(auth): Re-enable these public auth routes later (components are kept in src/pages). */}
      {/* <Route path="/login" element={<Login />} /> */}
      {/* <Route path="/signup" element={<Signup />} /> */}

      {/* Application shell with nested routes. ProtectedRoute is currently a no-op passthrough. */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Use relative child paths so they mount under the layout and support SPA refresh */}
        <Route path="app" element={<Dashboard />} />
        <Route path="app/*" element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="resources" element={<Resources />} />
        <Route path="costs" element={<Costs />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="automation" element={<Automation />} />
        <Route path="activity" element={<Activity />} />
      </Route>

      {/* Legacy/alias handling */}
      <Route path="/home" element={<Navigate to="/" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
