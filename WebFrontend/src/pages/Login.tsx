import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

// PUBLIC_INTERFACE
export default function Login(): JSX.Element {
  /**
   * Login page with email/password and optional "Remember me" to persist tokens.
   * On successful login, navigates to dashboard or the originally requested page.
   */
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const fromPath = location?.state?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password }, remember);
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <section>
      <h1 className="title">Sign in</h1>
      {isAuthenticated ? (
        <p className="description">
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
          {error && <div role="alert" style={{ color: 'crimson' }}>{error}</div>}
          <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
      )}
    </section>
  );
}
