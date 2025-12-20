import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

// PUBLIC_INTERFACE
export default function Login(): JSX.Element {
  /**
   * Login page with email/password.
   * - Optional "Remember me" persists tokens via the existing auth store:
   *   - sessionStorage by default
   *   - localStorage if remember me checked
   * - On successful login, navigates to dashboard or originally requested page.
   * - Shows a success message when redirected from successful signup.
   */
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const fromPath = location?.state?.from?.pathname ?? '/app';

  const signupSuccess = Boolean(location?.state?.signupSuccess);
  const rememberSuggested = Boolean(location?.state?.rememberSuggested);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(rememberSuggested);

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const isValid = useMemo(() => Boolean(email.trim() && password), [email, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setError('');
    setLoading(true);
    try {
      await login({ email: email.trim(), password }, remember);
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      const status = err?.status as number | undefined;

      if (status === 401) {
        setError('Invalid email or password.');
      } else if (status === 422) {
        // FastAPI validation errors are often 422
        setError(err?.message || 'Please check your input and try again.');
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
    <main id="main" role="main" tabIndex={-1} style={wrapperStyle} aria-label="Login page">
      <section style={cardStyle} role="region" aria-labelledby="login-title">
        <h1 className="title" id="login-title" style={headerStyle}>
          Sign in
        </h1>

        {signupSuccess && !isAuthenticated && (
          <div
            role="status"
            aria-live="polite"
            style={{
              border: '1px solid var(--border-color)',
              background: 'rgba(0, 128, 0, 0.06)',
              padding: 12,
              borderRadius: 10,
              marginBottom: 12
            }}
          >
            Account created successfully. Please sign in.
          </div>
        )}

        {isAuthenticated ? (
          <p className="description" style={{ textAlign: 'center' }}>
            You are already signed in. Go to your <Link to="/dashboard">Dashboard</Link>.
          </p>
        ) : (
          <>
            <form onSubmit={onSubmit} aria-label="Login form" className="form" noValidate>
              <div>
                <label htmlFor="email">
                  <span>Email</span>
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="password">
                  <span>Password</span>
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="remember" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    id="remember"
                    type="checkbox"
                    name="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    aria-describedby="remember-help"
                  />
                  <span>Remember me</span>
                </label>
                <small id="remember-help" className="description">
                  Store tokens in localStorage for persistent sessions (device-level).
                </small>
              </div>

              {error && (
                <div role="alert" aria-live="assertive" style={{ color: 'crimson' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={!isValid || loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="description" style={{ textAlign: 'center', marginTop: 12 }}>
              Don’t have an account? <Link to="/signup">Create one</Link>.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

