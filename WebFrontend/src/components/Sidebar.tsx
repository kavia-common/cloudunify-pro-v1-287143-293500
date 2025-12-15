import React from 'react';
import { NavLink } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function Sidebar(): JSX.Element {
  /** Left sidebar with main navigation links using active styling. */
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'side-link active' : 'side-link';

  return (
    <aside className="sidebar" aria-label="Primary">
      <ul className="side-nav" role="list">
        <li><NavLink to="/" end className={linkClass}>Home</NavLink></li>
        <li><NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink></li>
        <li><NavLink to="/resources" className={linkClass}>Resources</NavLink></li>
        <li><NavLink to="/costs" className={linkClass}>Costs</NavLink></li>
        <li><NavLink to="/recommendations" className={linkClass}>Recommendations</NavLink></li>
        <li><NavLink to="/automation" className={linkClass}>Automation</NavLink></li>
        <li><NavLink to="/activity" className={linkClass}>Activity</NavLink></li>
      </ul>
    </aside>
  );
}
