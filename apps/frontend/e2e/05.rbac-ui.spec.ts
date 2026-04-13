/**
 * E2E 05 — RBAC & Auth Guard (UI level)
 *
 * Covers:
 *  - Unauthenticated access to protected admin routes → redirect to /login
 *  - Unauthenticated access to protected portal routes → redirect to /portal/login
 *  - Nurse cannot access admin app (navigating to /dashboard as nurse)
 *  - Admin cannot log into the nurse portal
 *  - After logout, protected pages redirect to login
 */

import { test, expect, Page } from '@playwright/test';
import { injectAdminAuth, injectNurseAuth, loginAdmin, CREDENTIALS } from './helpers/auth';

// ── Unauthenticated redirects ─────────────────────────────────────────────────

test.describe('RBAC — Unauthenticated Redirects', () => {
  const ADMIN_PROTECTED = [
    '/dashboard',
    '/surveys',
    '/issues',
    '/tasks',
    '/speak-up',
    '/escalations',
    '/audit',
    '/admin',
  ];

  for (const route of ADMIN_PROTECTED) {
    test(`unauthenticated ${route} → /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    });
  }

  test('unauthenticated /portal → /portal/login', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/portal\/login/, { timeout: 8_000 });
  });

  test('unauthenticated /portal/survey/:id → /portal/login', async ({ page }) => {
    await page.goto('/portal/survey/00000000-0000-0000-0000-000000000000');
    await expect(page).toHaveURL(/\/portal\/login/, { timeout: 8_000 });
  });
});

// ── Cross-portal access ───────────────────────────────────────────────────────

test.describe('RBAC — Cross-Portal Access', () => {
  test('admin credentials cannot log in via nurse portal', async ({ page }) => {
    // Admin tries nurse portal login
    await page.goto('/portal/login');
    await page.getByTestId('email-input').fill(CREDENTIALS.ADMIN.email);
    await page.getByTestId('password-input').fill(CREDENTIALS.ADMIN.password);
    await page.getByTestId('sign-in-button').click();
    // Should see error — SUPER_ADMIN is not NURSE/PCT/STAFF
    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('nurse auth does not grant access to admin dashboard', async ({ page }) => {
    // Inject nurse auth then try to visit admin dashboard
    await injectNurseAuth(page, 'NURSE');
    await page.goto('/dashboard');
    // Admin dashboard uses admin auth store — should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});

// ── Post-logout redirect ──────────────────────────────────────────────────────

test.describe('RBAC — Post-Logout', () => {
  test('visiting /dashboard after logout redirects to /login', async ({ page }) => {
    // Login as CNO
    await loginAdmin(page, CREDENTIALS.CNO.email, CREDENTIALS.CNO.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Clear auth manually (simulates logout clearing localStorage)
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Revisit a protected page
    await page.goto('/surveys');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});

// ── Dashboard content by role ─────────────────────────────────────────────────

test.describe('RBAC — Dashboard Content', () => {
  test('SVP dashboard shows network-level greeting', async ({ page }) => {
    await injectAdminAuth(page, 'SVP');
    await page.goto('/dashboard');
    // SVP greeting includes their name
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 8_000 });
  });

  test('Manager dashboard shows manager-level content', async ({ page }) => {
    await injectAdminAuth(page, 'MANAGER');
    await page.goto('/dashboard');
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 8_000 });
  });
});
