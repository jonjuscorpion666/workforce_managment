/**
 * E2E 02 — Admin Login
 *
 * Covers:
 *  - Valid credentials for several roles → redirect to /dashboard
 *  - Wrong password → error shown, stays on /login
 *  - Unauthenticated access to /dashboard → redirect to /login
 *  - Demo account quick-fill buttons work
 */

import { test, expect } from '@playwright/test';
import { loginAdmin, CREDENTIALS } from './helpers/auth';

test.describe('Admin — Login', () => {
  test('SVP credentials redirect to /dashboard', async ({ page }) => {
    await loginAdmin(page, CREDENTIALS.SVP.email, CREDENTIALS.SVP.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('CNP credentials redirect to /dashboard', async ({ page }) => {
    await loginAdmin(page, CREDENTIALS.CNP.email, CREDENTIALS.CNP.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('MANAGER credentials redirect to /dashboard', async ({ page }) => {
    await loginAdmin(page, CREDENTIALS.MANAGER.email, CREDENTIALS.MANAGER.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('HR_ANALYST credentials redirect to /dashboard', async ({ page }) => {
    await loginAdmin(page, CREDENTIALS.HR.email, CREDENTIALS.HR.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('wrong password shows error and stays on /login', async ({ page }) => {
    await loginAdmin(page, CREDENTIALS.CNP.email, 'WrongPassword!');
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('unknown email shows error', async ({ page }) => {
    await loginAdmin(page, 'ghost@nowhere.com', 'Password123!');
    await expect(page.getByTestId('error-message')).toBeVisible();
  });

  test('demo account button pre-fills email field', async ({ page }) => {
    await page.goto('/login');
    // Click the first demo account button (System Admin)
    await page.getByRole('button', { name: /System Admin/i }).first().click();
    const email = await page.getByTestId('email-input').inputValue();
    expect(email).toBe('admin@hospital.com');
  });
});

test.describe('Admin — Auth Guard', () => {
  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('unauthenticated /surveys redirects to /login', async ({ page }) => {
    await page.goto('/surveys');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('unauthenticated /issues redirects to /login', async ({ page }) => {
    await page.goto('/issues');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});
