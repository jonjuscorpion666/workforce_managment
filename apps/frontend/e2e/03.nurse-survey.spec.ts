/**
 * E2E 03 — Nurse Survey Response (end-to-end happy path)
 *
 * Covers:
 *  - Nurse navigates directly to an active survey
 *  - Progress bar starts at 0/N
 *  - Nurse answers a Likert-5 question (clicks option 4)
 *  - Progress updates to 1/N
 *  - Nurse submits the form
 *  - Success screen "Response Submitted!" is shown
 *  - "Back to Portal" link returns to /portal
 *
 * Survey is created and published via API in beforeAll (avoids UI survey
 * creation complexity). Auth is injected into localStorage (faster than
 * going through the login form).
 */

import { test, expect, Page } from '@playwright/test';
import { injectNurseAuth } from './helpers/auth';
import { createActiveSurvey, CreatedSurvey } from './helpers/api';

let survey: CreatedSurvey;

test.beforeAll(async () => {
  survey = await createActiveSurvey('[E2E] Nurse Survey Response Test');
});

async function loginAndNavigate(page: Page) {
  await injectNurseAuth(page, 'NURSE');
  await page.goto(`/portal/survey/${survey.id}`);
}

test.describe('Nurse — Survey Response Flow', () => {
  test('survey page loads with title and Anonymous badge', async ({ page }) => {
    await loginAndNavigate(page);
    await expect(page.getByText('[E2E] Nurse Survey Response Test')).toBeVisible();
    await expect(page.getByText('Anonymous')).toBeVisible();
  });

  test('progress starts at 0 answered questions', async ({ page }) => {
    await loginAndNavigate(page);
    // Progress shows "0/{total}"
    const total = survey.questions.length;
    await expect(page.getByText(`0/${total}`)).toBeVisible();
  });

  test('clicking Likert option 4 updates progress', async ({ page }) => {
    await loginAndNavigate(page);
    const total = survey.questions.length;

    // Click Likert button "4"
    await page.getByTestId('likert-btn-4').first().click();

    // Progress should now show "1/{total}"
    await expect(page.getByText(`1/${total}`)).toBeVisible();
  });

  test('submitting all required answers shows success screen', async ({ page }) => {
    await loginAndNavigate(page);

    // Answer the Likert-5 question
    await page.getByTestId('likert-btn-4').first().click();

    // Submit
    await page.getByTestId('submit-response-button').click();

    // Success screen
    await expect(page.getByTestId('success-heading')).toHaveText('Response Submitted!', { timeout: 10_000 });
    await expect(page.getByText('anonymously')).toBeVisible();
  });

  test('"Back to Portal" on success screen returns to /portal', async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByTestId('likert-btn-4').first().click();
    await page.getByTestId('submit-response-button').click();
    await expect(page.getByTestId('success-heading')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: 'Back to Portal' }).click();
    await expect(page).toHaveURL(/\/portal$/, { timeout: 8_000 });
  });

  test('unauthenticated nurse is redirected to portal login', async ({ page }) => {
    // No auth injection — fresh context
    await page.goto(`/portal/survey/${survey.id}`);
    await expect(page).toHaveURL(/\/portal\/login/, { timeout: 8_000 });
  });
});
