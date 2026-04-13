/**
 * API helpers for E2E test setup and teardown.
 * Uses Playwright's built-in request context (no browser required).
 */

import { APIRequestContext, request as pwRequest } from '@playwright/test';
import { API_URL, CREDENTIALS, fetchTokens } from './auth';

// ── Token cache ───────────────────────────────────────────────────────────────

const tokenCache: Record<string, string> = {};

export async function getToken(role: keyof typeof CREDENTIALS): Promise<string> {
  if (tokenCache[role]) return tokenCache[role];
  const creds = CREDENTIALS[role];
  const data  = await fetchTokens(creds.email, creds.password);
  tokenCache[role] = data.accessToken;
  return tokenCache[role];
}

// ── API client ────────────────────────────────────────────────────────────────

export async function apiAs(role: keyof typeof CREDENTIALS) {
  const token = await getToken(role);
  const ctx   = await pwRequest.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  return ctx;
}

// ── Survey factory ────────────────────────────────────────────────────────────

export interface CreatedSurvey {
  id: string;
  questions: Array<{ id: string; type: string }>;
}

/**
 * Creates an active (published) survey via API.
 * Returns the survey ID and its first question ID.
 * The CNO role is used to create, SVP to approve, CNO to publish.
 */
export async function createActiveSurvey(title: string): Promise<CreatedSurvey> {
  const cnpCtx = await apiAs('CNO');
  const svpCtx = await apiAs('SVP');

  // Create
  const createRes = await cnpCtx.post('/surveys', {
    data: {
      title,
      type: 'PULSE',
      targetScope: 'SYSTEM',
      questions: [
        { text: 'How satisfied are you with your work environment?', type: 'LIKERT_5', required: true,  order: 1 },
        { text: 'Any additional comments?',                          type: 'OPEN_TEXT', required: false, order: 2 },
      ],
    },
  });
  if (!createRes.ok()) throw new Error(`Failed to create survey: ${createRes.status()}`);
  const survey = await createRes.json();

  // Approve (SVP)
  await svpCtx.post(`/surveys/${survey.id}/approve`);

  // Publish (CNO)
  await cnpCtx.post(`/surveys/${survey.id}/publish`);

  // Fetch detail to get question IDs
  const detail = await cnpCtx.get(`/surveys/${survey.id}`);
  const data   = await detail.json();

  await cnpCtx.dispose();
  await svpCtx.dispose();

  return { id: survey.id, questions: data.questions ?? survey.questions ?? [] };
}
