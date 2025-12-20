import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useTheme } from '../store/ui';
import FetchDebugBanner from './FetchDebugBanner';

// PUBLIC_INTERFACE
export default function Layout(): JSX.Element {
  /** Application layout with top navigation, sidebar, and main content area. */
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <div className="app-body" role="presentation">
        <Sidebar />
        <main id="main" className="app-content" role="main" tabIndex={-1}>
          <FetchDebugBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
