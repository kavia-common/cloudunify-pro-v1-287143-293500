import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
};

/**
 * TODO(auth): Restore auth-aware navbar actions (sign in/sign out, user display)
 * once authentication is re-enabled.
 */

// PUBLIC_INTERFACE
export default function Navbar({ theme, onToggleTheme }: Props): JSX.Element {
  /** Accessible top navigation bar with product title and theme toggle. Auth UI is temporarily disabled. */
  return (
    <header className="navbar" role="banner">
      <div className="navbar-left">
        <Link to="/" className="brand" aria-label="CloudUnify Pro home">
          <span className="brand-accent">Cloud</span>Unify Pro
        </Link>
      </div>

      <nav className="navbar-actions" aria-label="Top navigation">
        <button
          type="button"
          className="btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <span className="description" aria-label="Authentication disabled notice">
          TODO(auth): Sign-in disabled
        </span>
      </nav>
    </header>
  );
}
