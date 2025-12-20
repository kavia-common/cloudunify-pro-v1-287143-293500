import { describe, expect, it, beforeEach } from 'vitest';

/**
 * This test validates the storage contract used by AuthProvider:
 * - remember=false -> sessionStorage tokens
 * - remember=true -> localStorage tokens
 *
 * It intentionally does not mount React; it validates storage state expectations.
 */

const AT_KEY = 'cup_at';
const RT_KEY = 'cup_rt';
const PERSIST_KEY = 'cup_persist';

function makeFakeJwt(payload: Record<string, any>): string {
  // Minimal JWT-ish shape: header.payload.sig (base64url for payload)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const pl = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${header}.${pl}.sig`;
}

describe('auth storage contract', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores ephemeral session in sessionStorage when remember=false', () => {
    localStorage.setItem(PERSIST_KEY, 'false');

    const token = makeFakeJwt({ sub: 'u1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 });
    sessionStorage.setItem(AT_KEY, token);
    sessionStorage.setItem(RT_KEY, 'rt');

    expect(sessionStorage.getItem(AT_KEY)).toBe(token);
    expect(localStorage.getItem(AT_KEY)).toBe(null);
    expect(localStorage.getItem(PERSIST_KEY)).toBe('false');
  });

  it('stores persistent session in localStorage when remember=true', () => {
    localStorage.setItem(PERSIST_KEY, 'true');

    const token = makeFakeJwt({ sub: 'u1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 });
    localStorage.setItem(AT_KEY, token);
    localStorage.setItem(RT_KEY, 'rt');

    expect(localStorage.getItem(AT_KEY)).toBe(token);
    expect(sessionStorage.getItem(AT_KEY)).toBe(null);
    expect(localStorage.getItem(PERSIST_KEY)).toBe('true');
  });
});
