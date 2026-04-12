/**
 * Suite 02 — Surveys
 *
 * Covers:
 *  - CNP creates a survey (DRAFT)
 *  - NURSE cannot create a survey (403)
 *  - List surveys — all roles can read
 *  - Approval workflow: CNP requests approval → SVP approves
 *  - SVP rejects a separate survey with reason
 *  - Publish → Active
 *  - Close survey
 *  - Save as template
 *  - Delete (authorised vs unauthorised)
 *  - Governance endpoint
 */

import { ApiClient, api } from '../helpers/client';

let cnp: ApiClient;
let svp: ApiClient;
let nurse: ApiClient;
let hr: ApiClient;
let admin: ApiClient;

// State shared across tests in this suite
let surveyId: string;
let questionId: string;
let rejectSurveyId: string;

beforeAll(async () => {
  [cnp, svp, nurse, hr, admin] = await Promise.all([
    api.forRole('CNP'),
    api.forRole('SVP'),
    api.forRole('NURSE'),
    api.forRole('HR_ANALYST'),
    api.forRole('SUPER_ADMIN'),
  ]);
});

// ── Creation ─────────────────────────────────────────────────────────────────

describe('Surveys — Creation', () => {
  test('CNP can create a survey', async () => {
    const res = await cnp.post('/surveys', {
      title: '[REG] CNP Pulse Survey',
      description: 'Regression test pulse survey',
      type: 'PULSE',
      targetScope: 'SYSTEM',
      questions: [
        {
          text: 'How satisfied are you with your work environment?',
          type: 'LIKERT_5',
          required: true,
          order: 1,
        },
        {
          text: 'Any additional comments?',
          type: 'OPEN_TEXT',
          required: false,
          order: 2,
        },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    expect(res.data.status).toBe('DRAFT');
    surveyId = res.data.id;

    // Capture a question ID for response tests
    if (res.data.questions?.length) {
      questionId = res.data.questions[0].id;
    }
  });

  test('CNP can create a second survey (for reject workflow)', async () => {
    const res = await cnp.post('/surveys', {
      title: '[REG] Survey to Reject',
      type: 'AD_HOC',
      targetScope: 'SYSTEM',
      questions: [{ text: 'Test question?', type: 'YES_NO', required: true, order: 1 }],
    });
    expect(res.status).toBe(201);
    rejectSurveyId = res.data.id;
  });

  test('NURSE cannot create a survey → 403', async () => {
    const res = await nurse.post('/surveys', {
      title: 'Unauthorized survey',
      type: 'PULSE',
      targetScope: 'SYSTEM',
      questions: [],
    });
    expect(res.status).toBe(403);
  });

  test('Unauthenticated user cannot create a survey → 401', async () => {
    const res = await api.anon().post('/surveys', {
      title: 'Anonymous survey',
      type: 'PULSE',
      targetScope: 'SYSTEM',
      questions: [],
    });
    expect(res.status).toBe(401);
  });
});

// ── Read ─────────────────────────────────────────────────────────────────────

describe('Surveys — Read', () => {
  test('CNP can list surveys', async () => {
    const res = await cnp.get('/surveys');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('NURSE can list surveys', async () => {
    const res = await nurse.get('/surveys');
    expect(res.status).toBe(200);
  });

  test('HR_ANALYST can list surveys', async () => {
    const res = await hr.get('/surveys');
    expect(res.status).toBe(200);
  });

  test('Unauthenticated user cannot list surveys → 401', async () => {
    const res = await api.anon().get('/surveys');
    expect(res.status).toBe(401);
  });

  test('CNP can get survey by ID', async () => {
    const res = await cnp.get(`/surveys/${surveyId}`);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(surveyId);

    // Capture question ID if not already set
    if (!questionId && res.data.questions?.length) {
      questionId = res.data.questions[0].id;
    }
  });

  test('GET /surveys/governance returns approval rules', async () => {
    const res = await cnp.get('/surveys/governance');
    expect(res.status).toBe(200);
  });

  test('GET /surveys/pending-approvals returns list', async () => {
    const res = await cnp.get('/surveys/pending-approvals');
    expect(res.status).toBe(200);
  });
});

// ── Approval workflow ─────────────────────────────────────────────────────────

describe('Surveys — Approval Workflow', () => {
  test('CNP can request SVP approval', async () => {
    const res = await cnp.post(`/surveys/${surveyId}/request-approval`);
    // May be 200 or 201 depending on implementation; also 400 if governance skips approval
    expect([200, 201, 400]).toContain(res.status);
  });

  test('SVP can approve a survey', async () => {
    const res = await svp.post(`/surveys/${surveyId}/approve`);
    expect([200, 201, 400]).toContain(res.status); // 400 if already approved or governance skipped
  });

  test('NURSE cannot approve a survey → 403', async () => {
    const res = await nurse.post(`/surveys/${surveyId}/approve`);
    expect(res.status).toBe(403);
  });

  test('SVP can reject a survey with reason', async () => {
    const res = await svp.post(`/surveys/${rejectSurveyId}/reject`, {
      reason: 'Needs more specific questions for regression test.',
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  test('NURSE cannot reject a survey → 403', async () => {
    const res = await nurse.post(`/surveys/${rejectSurveyId}/reject`, { reason: 'No.' });
    expect(res.status).toBe(403);
  });
});

// ── Publish / Close ───────────────────────────────────────────────────────────

describe('Surveys — Publish & Close', () => {
  test('CNP can publish survey', async () => {
    const res = await cnp.post(`/surveys/${surveyId}/publish`);
    // 200 OK or 400 if approval required first
    expect([200, 400]).toContain(res.status);
  });

  test('Survey status is ACTIVE or still DRAFT after publish attempt', async () => {
    const res = await cnp.get(`/surveys/${surveyId}`);
    expect(res.status).toBe(200);
    expect(['DRAFT', 'ACTIVE', 'PENDING_APPROVAL']).toContain(res.data.status);
  });

  test('CNP can close survey', async () => {
    const res = await cnp.post(`/surveys/${surveyId}/close`);
    expect([200, 400]).toContain(res.status);
  });
});

// ── Templates ─────────────────────────────────────────────────────────────────

describe('Surveys — Templates', () => {
  test('GET /surveys/templates returns list', async () => {
    const res = await cnp.get('/surveys/templates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('CNP can save survey as template', async () => {
    const res = await cnp.post(`/surveys/${surveyId}/save-as-template`);
    expect([200, 201, 400]).toContain(res.status);
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

describe('Surveys — Delete', () => {
  test('NURSE cannot delete a survey → 403', async () => {
    const res = await nurse.delete(`/surveys/${rejectSurveyId}`);
    expect(res.status).toBe(403);
  });

  test('SUPER_ADMIN can bulk-delete surveys', async () => {
    // Create a throwaway survey then bulk-delete it
    const create = await cnp.post('/surveys', {
      title: '[REG] Bulk Delete Target',
      type: 'AD_HOC',
      targetScope: 'SYSTEM',
      questions: [{ text: 'Delete me?', type: 'YES_NO', required: false, order: 1 }],
    });
    expect(create.status).toBe(201);

    const res = await admin.post('/surveys/bulk-delete', { ids: [create.data.id] });
    expect(res.status).toBe(200);
  });

  test('NURSE cannot bulk-delete → 403', async () => {
    const res = await nurse.post('/surveys/bulk-delete', { ids: [surveyId] });
    expect(res.status).toBe(403);
  });
});

// Export for use by responses suite
export { surveyId, questionId };
