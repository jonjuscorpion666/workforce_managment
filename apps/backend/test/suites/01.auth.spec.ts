/**
 * Suite 01 — Authentication
 *
 * Covers:
 *  - Login: valid credentials for every role
 *  - Login: bad password, unknown email
 *  - JWT structure (accessToken present, user.roles populated)
 *  - GET /auth/profile — authenticated vs unauthenticated
 *  - POST /auth/logout
 *  - Token refresh
 */

import { api, CREDENTIALS, loginAs } from '../helpers/client';

const ALL_ROLES = Object.keys(CREDENTIALS);

describe('Auth — Login', () => {
  test.each(ALL_ROLES)('login succeeds for role %s', async (role) => {
    const creds = CREDENTIALS[role];
    const res = await api.anon().post('/auth/login', creds);

    expect(res.status).toBe(200);
    expect(res.data.accessToken).toBeDefined();
    expect(typeof res.data.accessToken).toBe('string');
    expect(res.data.refreshToken).toBeDefined();
    expect(res.data.user).toBeDefined();
    expect(res.data.user.email).toBe(creds.email);
    expect(Array.isArray(res.data.user.roles)).toBe(true);
  });

  test('rejects wrong password with 401', async () => {
    const res = await api.anon().post('/auth/login', {
      email: CREDENTIALS.NURSE.email,
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
  });

  test('rejects unknown email with 401', async () => {
    const res = await api.anon().post('/auth/login', {
      email: 'nobody@nowhere.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
  });

  test('rejects missing body fields', async () => {
    const res = await api.anon().post('/auth/login', { email: CREDENTIALS.NURSE.email });
    expect([400, 401]).toContain(res.status);
  });
});

describe('Auth — Profile', () => {
  test('GET /auth/profile returns full profile when authenticated', async () => {
    const client = await api.forRole('CNO');
    const res = await client.get('/auth/profile');

    expect(res.status).toBe(200);
    expect(res.data.id).toBeDefined();
    expect(res.data.email).toBe(CREDENTIALS.CNO.email);
    expect(res.data.firstName).toBeDefined();
  });

  test('GET /auth/profile returns 401 without token', async () => {
    const res = await api.anon().get('/auth/profile');
    expect(res.status).toBe(401);
  });

  test('GET /auth/profile returns 401 with invalid token', async () => {
    const res = await api.withBadToken().get('/auth/profile');
    expect(res.status).toBe(401);
  });
});

describe('Auth — Token Refresh', () => {
  test('refreshes access token with valid refresh token', async () => {
    const loginRes = await api.anon().post('/auth/login', CREDENTIALS.MANAGER);
    expect(loginRes.status).toBe(200);
    const refreshToken = loginRes.data.refreshToken;

    const res = await api.anon().post('/auth/refresh', { refreshToken });
    expect(res.status).toBe(200);
    expect(res.data.accessToken).toBeDefined();
  });

  test('rejects invalid refresh token with 401', async () => {
    const res = await api.anon().post('/auth/refresh', { refreshToken: 'bad.token.here' });
    expect(res.status).toBe(401);
  });
});

describe('Auth — Logout', () => {
  test('logout returns 204 for authenticated user', async () => {
    const client = await api.forRole('NURSE');
    const res = await client.post('/auth/logout');
    expect(res.status).toBe(204);
  });

  test('logout returns 401 without token', async () => {
    const res = await api.anon().post('/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('Auth — Token pre-warm (caches tokens for all suites)', () => {
  // This describe block runs before every other suite (runInBand, sequential).
  // Pre-warming the token cache here means later suites pay no login cost.
  test.each(ALL_ROLES)('pre-warm token for %s', async (role) => {
    const token = await loginAs(role);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });
});
