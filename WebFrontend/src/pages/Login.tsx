import React, { useState } from 'react';
import { useAuth } from '../store/auth';

// PUBLIC_INTERFACE
export default function Login(): JSX.Element {
  /** Login page placeholder with basic fields. */
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <section>
      <h1 className="title">Sign in</h1>
      {isAuthenticated ? (
        <p className="description">You are already signed in.</p>
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
          <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
      )}
    </section>
  );
}
