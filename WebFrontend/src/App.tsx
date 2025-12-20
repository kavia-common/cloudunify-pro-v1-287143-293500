import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import Costs from './pages/Costs';
import Recommendations from './pages/Recommendations';
import Automation from './pages/Automation';
import Activity from './pages/Activity';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './store/auth';

/**
 * Route that decides the default landing based on authentication state.
 * Unauthenticated -> /login; Authenticated -> /app
 */
function AuthIndex(): JSX.Element {
  const { isAuthenticated, isAuthInitializing } = useAuth();

  if (isAuthInitializing) {
    return (
      <div style={{ padding: 24 }} role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/app' : '/login'} replace />;
}

// PUBLIC_INTERFACE
export default function App(): JSX.Element {
  /** App component defining the application routes and layout structure, with route guards. */
  return (
    <Routes>
      {/* Default landing based on auth */}
      <Route path="/" element={<AuthIndex />} />

      {/* Public routes (standalone, no shell layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected application shell with nested routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
