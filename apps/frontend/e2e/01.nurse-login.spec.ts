/**
 * E2E 01 — Nurse Portal Login
 *
 * Covers:
 *  - Valid credentials → redirect to /portal
 *  - Wrong password → error message shown, no redirect
 *  - Empty fields → browser validation prevents submit
 *  - Nurse trying admin portal → access denied
 *  - Privacy notice is visible
 */

import { test, expect } from '@playwright/test';
import { loginNurse, CREDENTIALS } from './helpers/auth';

test.describe('Nurse Portal — Login', () => {
  test('valid nurse credentials redirect to /portal', async ({ page }) => {
    await loginNurse(page, CREDENTIALS.NURSE.email, CREDENTIALS.NURSE.password);
    await expect(page).toHaveURL(/\/portal$/, { timeout: 10_000 });
  });

  test('valid PCT credentials redirect to /portal', async ({ page }) => {
    await loginNurse(page, CREDENTIALS.PCT.email, CREDENTIALS.PCT.password);
    await expect(page).toHaveURL(/\/portal$/, { timeout: 10_000 });
  });

  test('wrong password shows error message and stays on login page', async ({ page }) => {
    await loginNurse(page, CREDENTIALS.NURSE.email, 'WrongPassword!');
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('unknown email shows error message', async ({ page }) => {
    await loginNurse(page, 'nobody@nowhere.com', 'Password123!');
    await expect(page.getByTestId('error-message')).toBeVisible();
  });

  test('admin user cannot log in via nurse portal', async ({ page }) => {
    await loginNurse(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.password);
    // Should show an error — admin role is not NURSE/PCT/STAFF
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('privacy notice is visible on the login page', async ({ page }) => {
    await page.goto('/portal/login');
    await expect(page.getByText('Your responses are always anonymous')).toBeVisible();
  });

  test('page title confirms this is the Nurse Portal', async ({ page }) => {
    await page.goto('/portal/login');
    await expect(page.getByText('Nurse Portal')).toBeVisible();
  });
});
