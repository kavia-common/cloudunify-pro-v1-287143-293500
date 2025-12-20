import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiBase, joinUrl } from '../lib/env';
import { postJson } from '../lib/api/http';

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

/**
 * Tries to convert backend validation errors into a human-readable string.
 * Supports FastAPI's HTTPValidationError ({ detail: [{loc,msg,type}...] }).
 */
function formatBackendErrorMessage(err: any): string {
  const status = err?.status as number | undefined;
  const raw = String(err?.message || '').trim();

  // requestJson() currently throws Error like: "422 Unprocessable Entity: <detail>"
  // We'll try to extract a cleaner message where possible.
  if (status === 422 && raw) {
    return raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
  }
  return raw || 'Registration failed. Please try again.';
}

function validateEmail(email: string): boolean {
  // Light client-side validation; server remains source of truth.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// PUBLIC_INTERFACE
export default function Signup(): JSX.Element {
  /**
   * Sign up (registration) page.
   * Fields: username, email, password, remember me.
   *
   * Behavior:
   * - Client-side validation with accessible inline errors.
   * - Calls POST /api/v1/auth/register.
   * - On success: redirects to /login with a success message (state).
   *
   * Note: Token persistence is handled on Login via existing auth store:
   * - sessionStorage by default
   * - localStorage if remember me checked
   */
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fromPath = location?.state?.from?.pathname ?? '/app';

  const isValid = useMemo(() => {
    const u = username.trim();
    const e = email.trim();
    const p = password;
    return u.length >= 2 && validateEmail(e) && p.length >= 8;
  }, [username, email, password]);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const u = username.trim();
    const e = email.trim();
    const p = password;

    if (!u) errs.username = 'Username is required.';
    else if (u.length < 2) errs.username = 'Username must be at least 2 characters.';

    if (!e) errs.email = 'Email is required.';
    else if (!validateEmail(e)) errs.email = 'Enter a valid email address.';

    if (!p) errs.password = 'Password is required.';
    else if (p.length < 8) errs.password = 'Password must be at least 8 characters.';

    return errs;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setFormError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const payload: RegisterPayload = {
        username: username.trim(),
        email: email.trim(),
        password
      };

      // Respect existing env helper; it may already include /api/v1
      // Requirement says POST /api/v1/auth/register, so we join "/auth/register".
      const url = joinUrl(getApiBase(), '/auth/register');

      // Backend may return 201 with empty body; our postJson expects JSON by default.
      // However requestJson() can handle non-json; in that case it returns text.
      await postJson<any>(url, payload);

      navigate('/login', {
        replace: true,
        state: {
          signupSuccess: true,
          rememberSuggested: remember,
          // preserve any originally requested page so Login can still route there
          from: { pathname: fromPath }
        }
      });
    } catch (err: any) {
      const status = err?.status as number | undefined;
      if (status === 401) {
        // Register normally shouldn't return 401; if it does, treat as auth issue.
        setFormError('You are not authorized to register. Please contact an administrator.');
      } else if (status === 422) {
        setFormError(formatBackendErrorMessage(err));
      } else {
        setFormError(err?.message || 'Unable to reach the server. Please try again.');
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
    maxWidth: 460,
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

  const inputStyle: React.CSSProperties = {
    width: '100%'
  };

  return (
    <main id="main" role="main" tabIndex={-1} style={wrapperStyle} aria-label="Sign-up page">
      <section style={cardStyle} role="region" aria-labelledby="signup-title">
        <h1 className="title" id="signup-title" style={headerStyle}>
          Create your account
        </h1>

        <p className="description" style={{ textAlign: 'center', marginTop: 0 }}>
          Already have an account? <Link to="/login">Sign in</Link>.
        </p>

        <form onSubmit={onSubmit} aria-label="Sign up form" className="form" noValidate>
          <div>
            <label htmlFor="username">
              <span>Username</span>
            </label>
            <input
              id="username"
              style={inputStyle}
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
              required
            />
            {fieldErrors.username && (
              <div id="username-error" role="alert" aria-live="polite" style={{ color: 'crimson' }}>
                {fieldErrors.username}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="email">
              <span>Email</span>
            </label>
            <input
              id="email"
              style={inputStyle}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              required
            />
            {fieldErrors.email && (
              <div id="email-error" role="alert" aria-live="polite" style={{ color: 'crimson' }}>
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="password">
              <span>Password</span>
            </label>
            <input
              id="password"
              style={inputStyle}
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : 'password-help'}
              required
            />
            <small id="password-help" className="description">
              Use at least 8 characters.
            </small>
            {fieldErrors.password && (
              <div id="password-error" role="alert" aria-live="polite" style={{ color: 'crimson' }}>
                {fieldErrors.password}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="remember" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                id="remember"
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(ev) => setRemember(ev.target.checked)}
                aria-describedby="remember-help"
              />
              <span>Remember me on this device</span>
            </label>
            <small id="remember-help" className="description">
              If checked, we’ll keep you signed in on this device after you log in.
            </small>
          </div>

          {formError && (
            <div role="alert" aria-live="assertive" style={{ color: 'crimson' }}>
              {formError}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={!isValid || loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
      </section>
    </main>
  );
}

