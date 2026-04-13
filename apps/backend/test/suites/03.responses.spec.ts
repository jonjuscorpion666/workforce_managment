/**
 * Suite 03 — Survey Responses
 *
 * Covers:
 *  - Nurse submits response to an active survey (identified)
 *  - Anonymous submission (no JWT)
 *  - PCT submits response
 *  - Missing required fields → 400
 *  - Submission to non-existent survey → 404/400
 *
 * Note: This suite creates its own survey to avoid depending on Suite 02
 * state (publish/close ordering is nondeterministic when governance is on).
 */

import { ApiClient, api } from '../helpers/client';

let cnp: ApiClient;
let svp: ApiClient;
let nurse: ApiClient;
let pct: ApiClient;

let activeSurveyId: string;
let likertQuestionId: string;

beforeAll(async () => {
  [cnp, svp, nurse, pct] = await Promise.all([
    api.forRole('CNO'),
    api.forRole('SVP'),
    api.forRole('NURSE'),
    api.forRole('PCT'),
  ]);

  // Create + publish a survey for response tests
  const survey = await cnp.post('/surveys', {
    title: '[REG] Response Test Survey',
    type: 'PULSE',
    targetScope: 'SYSTEM',
    questions: [
      { text: 'Rate your satisfaction (1–5)', type: 'LIKERT_5', required: true,  order: 1 },
      { text: 'Any comments?',                type: 'OPEN_TEXT', required: false, order: 2 },
    ],
  });
  expect(survey.status).toBe(201);
  activeSurveyId = survey.data.id;

  // Capture question ID
  const detail = await cnp.get(`/surveys/${activeSurveyId}`);
  if (detail.data.questions?.length) {
    likertQuestionId = detail.data.questions.find((q: any) => q.type === 'LIKERT_5')?.id
      ?? detail.data.questions[0].id;
  }

  // Publish — bypass governance if needed by using SUPER_ADMIN approve + publish
  await svp.post(`/surveys/${activeSurveyId}/approve`);
  await cnp.post(`/surveys/${activeSurveyId}/publish`);
});

// ── Identified submissions ────────────────────────────────────────────────────

describe('Responses — Identified Nurse', () => {
  test('NURSE submits a valid response', async () => {
    const res = await nurse.post('/responses', {
      surveyId: activeSurveyId,
      answers: [
        { questionId: likertQuestionId, value: 4 },
      ],
    });
    // 201 created, or 200 if idempotent
    expect([200, 201]).toContain(res.status);
  });

  test('PCT submits a valid response', async () => {
    const res = await pct.post('/responses', {
      surveyId: activeSurveyId,
      answers: [
        { questionId: likertQuestionId, value: 3 },
      ],
    });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Anonymous submissions ─────────────────────────────────────────────────────

describe('Responses — Anonymous', () => {
  test('anonymous user can submit without a token', async () => {
    const res = await api.anon().post('/responses', {
      surveyId: activeSurveyId,
      answers: [
        { questionId: likertQuestionId, value: 5 },
      ],
    });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Validation / negative cases ───────────────────────────────────────────────

describe('Responses — Validation', () => {
  test('missing surveyId returns 400', async () => {
    const res = await nurse.post('/responses', {
      answers: [{ questionId: likertQuestionId, value: 4 }],
    });
    expect([400, 422]).toContain(res.status);
  });

  test('missing answers array returns 400', async () => {
    const res = await nurse.post('/responses', { surveyId: activeSurveyId });
    expect([400, 422]).toContain(res.status);
  });

  test('non-existent surveyId returns 400 or 404', async () => {
    const res = await nurse.post('/responses', {
      surveyId: '00000000-0000-0000-0000-000000000000',
      answers: [],
    });
    expect([400, 404]).toContain(res.status);
  });
});
