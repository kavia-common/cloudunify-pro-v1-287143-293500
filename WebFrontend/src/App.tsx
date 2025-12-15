import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import Costs from './pages/Costs';
import Recommendations from './pages/Recommendations';
import Automation from './pages/Automation';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// PUBLIC_INTERFACE
export default function App(): JSX.Element {
  /** App component defining the application routes and layout structure. */
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
