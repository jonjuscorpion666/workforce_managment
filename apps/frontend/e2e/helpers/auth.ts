/**
 * Auth helpers for E2E tests.
 *
 * Two strategies available:
 *
 * 1. UI login  — fills the real login form. Use for login-flow tests.
 * 2. Auth injection — writes directly to localStorage to skip the login UI.
 *    Much faster; use for tests that are not about the login flow itself.
 */

import { Page, request as pwRequest } from '@playwright/test';

export const API_URL = process.env.TEST_API_URL ?? 'http://localhost:3001/api/v1';

export const CREDENTIALS = {
  ADMIN:   { email: 'admin@hospital.com',   password: 'Password123!' },
  SVP:     { email: 'svp@hospital.com',     password: 'Password123!' },
  CNP:     { email: 'cnp@hospital.com',     password: 'Password123!' },
  MANAGER: { email: 'manager@hospital.com', password: 'Password123!' },
  NURSE:   { email: 'nurse1@hospital.com',  password: 'Password123!' },
  PCT:     { email: 'pct1@hospital.com',    password: 'Password123!' },
  HR:      { email: 'hr@hospital.com',      password: 'Password123!' },
} as const;

// ── UI login helpers ──────────────────────────────────────────────────────────

/** Fill and submit the admin login form at /login. */
export async function loginAdmin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('sign-in-button').click();
}

/** Fill and submit the nurse portal login form at /portal/login. */
export async function loginNurse(page: Page, email: string, password: string) {
  await page.goto('/portal/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('sign-in-button').click();
}

// ── API token fetch ───────────────────────────────────────────────────────────

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; firstName: string; lastName: string; roles: any[] };
}

/** Fetch JWT tokens directly from the API (no browser involved). */
export async function fetchTokens(email: string, password: string): Promise<LoginResult> {
  const ctx = await pwRequest.newContext();
  const res = await ctx.post(`${API_URL}/auth/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`Login failed for ${email}: ${res.status()}`);
  const data = await res.json();
  await ctx.dispose();
  return data;
}

// ── Fast auth injection (bypasses login UI) ───────────────────────────────────

/**
 * Inject admin auth into localStorage, bypassing the login form.
 * Call after `page.goto('/')` so there is a page context to write to.
 */
export async function injectAdminAuth(page: Page, role: keyof typeof CREDENTIALS) {
  const creds = CREDENTIALS[role];
  const data  = await fetchTokens(creds.email, creds.password);

  await page.goto('/login');   // establishes the page context / origin
  await page.evaluate(({ token, refreshToken, user }) => {
    localStorage.setItem('access_token',   token);
    localStorage.setItem('refresh_token',  refreshToken);
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { user, accessToken: token, isAuthenticated: true },
      version: 0,
    }));
  }, { token: data.accessToken, refreshToken: data.refreshToken, user: data.user });
}

/**
 * Inject nurse auth into localStorage, bypassing the portal login form.
 */
export async function injectNurseAuth(page: Page, role: 'NURSE' | 'PCT' = 'NURSE') {
  const creds = CREDENTIALS[role];
  const data  = await fetchTokens(creds.email, creds.password);

  await page.goto('/portal/login');   // establishes origin
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('nurse_access_token', token);
    localStorage.setItem('nurse-auth', JSON.stringify({
      state: { nurse: user, accessToken: token, isAuthenticated: true },
      version: 0,
    }));
  }, { token: data.accessToken, user: data.user });
}
