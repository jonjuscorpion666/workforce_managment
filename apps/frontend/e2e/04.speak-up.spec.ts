/**
 * E2E 04 — Speak-Up Submission (Manager)
 *
 * Covers:
 *  - Manager navigates to /speak-up
 *  - Submit tab is visible (not just "Cases")
 *  - Selects a category (SAFETY)
 *  - Fills in description
 *  - Submit button is disabled when description is empty
 *  - Submit button enables after description is typed
 *  - Submitting shows success "Your voice has been heard"
 *  - Can submit another concern (resets the form)
 *
 * Auth is injected via localStorage for speed.
 */

import { test, expect, Page } from '@playwright/test';
import { injectAdminAuth } from './helpers/auth';

async function gotoSpeakUp(page: Page) {
  await injectAdminAuth(page, 'MANAGER');
  await page.goto('/speak-up');
}

test.describe('Speak-Up — Submission Form', () => {
  test('speak-up page loads for a Manager', async ({ page }) => {
    await gotoSpeakUp(page);
    await expect(page.getByText('Safe, structured escalation')).toBeVisible();
  });

  test('all six category buttons are visible', async ({ page }) => {
    await gotoSpeakUp(page);
    const categories = ['STAFFING', 'LEADERSHIP', 'SCHEDULING', 'CULTURE', 'SAFETY', 'OTHER'];
    for (const cat of categories) {
      await expect(page.getByTestId(`category-btn-${cat}`)).toBeVisible();
    }
  });

  test('submit button is disabled when description is empty', async ({ page }) => {
    await gotoSpeakUp(page);
    await expect(page.getByTestId('submit-concern-button')).toBeDisabled();
  });

  test('submit button enables after typing a description', async ({ page }) => {
    await gotoSpeakUp(page);
    await page.getByTestId('description-textarea').fill('E2E test concern — short staffing on night shift.');
    await expect(page.getByTestId('submit-concern-button')).toBeEnabled();
  });

  test('selecting SAFETY category highlights it', async ({ page }) => {
    await gotoSpeakUp(page);
    await page.getByTestId('category-btn-SAFETY').click();
    // The selected button gets a ring class
    await expect(page.getByTestId('category-btn-SAFETY')).toHaveClass(/ring-2/);
  });

  test('full submission flow shows success screen', async ({ page }) => {
    await gotoSpeakUp(page);

    // Pick category
    await page.getByTestId('category-btn-SAFETY').click();

    // Fill description
    await page.getByTestId('description-textarea').fill(
      '[E2E] Staffing levels on Ward 4 night shift are critically low. Three nurses for 28 patients.',
    );

    // Submit
    await page.getByTestId('submit-concern-button').click();

    // Success
    await expect(page.getByTestId('success-heading')).toHaveText('Your voice has been heard', { timeout: 10_000 });
    await expect(page.getByText('anonymously')).toBeVisible();
  });

  test('"Submit another concern" resets the form', async ({ page }) => {
    await gotoSpeakUp(page);
    await page.getByTestId('description-textarea').fill('[E2E] Another concern.');
    await page.getByTestId('submit-concern-button').click();
    await expect(page.getByTestId('success-heading')).toBeVisible({ timeout: 10_000 });

    // Click reset
    await page.getByRole('button', { name: 'Submit another concern' }).click();

    // Form should be back
    await expect(page.getByTestId('submit-concern-button')).toBeVisible();
    await expect(page.getByTestId('description-textarea')).toHaveValue('');
  });
});
