import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

// PUBLIC_INTERFACE
export default function Login(): JSX.Element {
  /**
   * Login page with email/password and optional "Remember me" to persist tokens.
   * On successful login, navigates to dashboard or the originally requested page.
   * The form is centered both vertically and horizontally for better UX.
   */
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const fromPath = location?.state?.from?.pathname ?? '/app';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const isValid = Boolean(email && password);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    setError('');
    setLoading(true);
    try {
      await login({ email, password }, remember);
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      const status = err?.status as number | undefined;
      if (status === 401) {
        setError('Invalid email or password.');
      } else if (status) {
        setError(err?.message || `Login failed (HTTP ${status}).`);
      } else {
        // Network/CORS/runtime error: fetch() often throws without a status.
        setError(err?.message || 'Unable to reach the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const wrapperStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: 'var(--bg-secondary)'
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    background: 'var(--bg-primary)',
    padding: 24,
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
  };

  const headerStyle: React.CSSProperties = {
    margin: '0 0 12px 0',
    textAlign: 'center'
  };

  return (
    <main id="main" role="main" tabIndex={-1} style={wrapperStyle} aria-label="Sign-in page">
      <section style={cardStyle} role="region" aria-labelledby="login-title">
        <h1 className="title" id="login-title" style={headerStyle}>Sign in</h1>
        {isAuthenticated ? (
          <p className="description" style={{ textAlign: 'center' }}>
            You are already signed in. Go to your <Link to="/dashboard">Dashboard</Link>.
          </p>
        ) : (
          <form onSubmit={onSubmit} aria-label="Login form" className="form">
            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Remember me</span>
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                aria-describedby="remember-help"
              />
            </label>
            <small id="remember-help" className="description">
              Store tokens in localStorage for persistent sessions (device-level).
            </small>
            {error && (
              <div role="alert" aria-live="assertive" style={{ color: 'crimson' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={!isValid || loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
