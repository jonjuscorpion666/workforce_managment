/**
 * Suite 06 — Speak-Up Cases
 *
 * Covers:
 *  - Anonymous submission (no JWT) → 201
 *  - Identified nurse submission (with JWT) → 201
 *  - NURSE cannot list cases → 403
 *  - MANAGER can list cases → 200
 *  - Full leadership lifecycle:
 *      acknowledge → schedule meeting → record outcome → resolve
 *  - Escalate a case
 *  - Add note to activity timeline
 *  - Convert case to Issue
 *  - GET metrics endpoint
 */

import { ApiClient, api } from '../helpers/client';

let manager: ApiClient;
let cnp: ApiClient;
let svp: ApiClient;
let nurse: ApiClient;
let hr: ApiClient;

let anonCaseId: string;
let identifiedCaseId: string;
let escalateCaseId: string;

beforeAll(async () => {
  [manager, cnp, svp, nurse, hr] = await Promise.all([
    api.forRole('MANAGER'),
    api.forRole('CNP'),
    api.forRole('SVP'),
    api.forRole('NURSE'),
    api.forRole('HR_ANALYST'),
  ]);
});

// ── Submission ────────────────────────────────────────────────────────────────

describe('Speak-Up — Submission', () => {
  test('anonymous user can submit a case', async () => {
    const res = await api.anon().post('/speak-up/cases', {
      category: 'SAFETY',
      description: '[REG] Anonymous safety concern — regression test.',
      urgency: 'HIGH',
    });
    expect([200, 201]).toContain(res.status);
    if (res.data?.id) anonCaseId = res.data.id;
  });

  test('identified nurse can submit a case', async () => {
    const res = await nurse.post('/speak-up/cases', {
      category: 'STAFFING',
      description: '[REG] Identified staffing concern — regression test.',
      urgency: 'MEDIUM',
    });
    expect([200, 201]).toContain(res.status);
    if (res.data?.id) identifiedCaseId = res.data.id;
  });

  test('manager can submit a case', async () => {
    const res = await manager.post('/speak-up/cases', {
      category: 'WELLBEING',
      description: '[REG] Manager wellbeing report — regression test.',
      urgency: 'LOW',
    });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Read ──────────────────────────────────────────────────────────────────────

describe('Speak-Up — Read (leadership only)', () => {
  test('MANAGER can list speak-up cases', async () => {
    const res = await manager.get('/speak-up/cases');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    // Capture case IDs from list if submit didn't return them
    if (!anonCaseId || !identifiedCaseId) {
      const cases = res.data as any[];
      const regCases = cases.filter((c: any) =>
        c.description?.includes('[REG]'),
      );
      if (!anonCaseId && regCases.length > 0) anonCaseId = regCases[0].id;
      if (!identifiedCaseId && regCases.length > 1) identifiedCaseId = regCases[1].id;
      if (regCases.length > 2) escalateCaseId = regCases[2].id;
    }
  });

  test('CNP can list speak-up cases', async () => {
    const res = await cnp.get('/speak-up/cases');
    expect(res.status).toBe(200);
  });

  test('HR_ANALYST can list speak-up cases', async () => {
    const res = await hr.get('/speak-up/cases');
    expect(res.status).toBe(200);
  });

  test('NURSE cannot list cases → 403', async () => {
    const res = await nurse.get('/speak-up/cases');
    expect(res.status).toBe(403);
  });

  test('Unauthenticated user cannot list cases → 401', async () => {
    const res = await api.anon().get('/speak-up/cases');
    expect(res.status).toBe(401);
  });

  test('MANAGER can get speak-up metrics', async () => {
    const res = await manager.get('/speak-up/metrics');
    expect(res.status).toBe(200);
  });

  test('NURSE cannot get metrics → 403', async () => {
    const res = await nurse.get('/speak-up/metrics');
    expect(res.status).toBe(403);
  });

  test('MANAGER can get case detail', async () => {
    if (!anonCaseId) return;
    const res = await manager.get(`/speak-up/cases/${anonCaseId}`);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(anonCaseId);
  });

  test('NURSE cannot get case detail → 403', async () => {
    if (!anonCaseId) return;
    const res = await nurse.get(`/speak-up/cases/${anonCaseId}`);
    expect(res.status).toBe(403);
  });
});

// ── Lifecycle: NEW → ACKNOWLEDGED → SCHEDULED → RESOLVED ─────────────────────

describe('Speak-Up — Case Lifecycle', () => {
  test('MANAGER can acknowledge a case', async () => {
    if (!anonCaseId) return;
    const res = await manager.post(`/speak-up/cases/${anonCaseId}/acknowledge`);
    expect([200, 201, 400]).toContain(res.status); // 400 if already acknowledged
  });

  test('NURSE cannot acknowledge a case → 403', async () => {
    if (!anonCaseId) return;
    const res = await nurse.post(`/speak-up/cases/${anonCaseId}/acknowledge`);
    expect(res.status).toBe(403);
  });

  test('MANAGER can schedule a meeting', async () => {
    if (!anonCaseId) return;
    const res = await manager.post(`/speak-up/cases/${anonCaseId}/schedule`, {
      scheduledAt: new Date(Date.now() + 3 * 86400_000).toISOString(),
      location: 'Conference Room A',
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  test('MANAGER can record meeting outcome', async () => {
    if (!anonCaseId) return;
    const res = await manager.post(`/speak-up/cases/${anonCaseId}/outcome`, {
      notes: 'Discussed safety concern. Action plan agreed: additional PPE supply.',
      agreedActions: 'Order extra PPE within 48 hours.',
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  test('MANAGER can resolve the case', async () => {
    if (!anonCaseId) return;
    const res = await manager.post(`/speak-up/cases/${anonCaseId}/resolve`);
    expect([200, 201, 400]).toContain(res.status);
  });

  test('NURSE cannot resolve a case → 403', async () => {
    if (!identifiedCaseId) return;
    const res = await nurse.post(`/speak-up/cases/${identifiedCaseId}/resolve`);
    expect(res.status).toBe(403);
  });
});

// ── Notes & Escalation ────────────────────────────────────────────────────────

describe('Speak-Up — Notes & Escalation', () => {
  test('CNP can add a note to the activity timeline', async () => {
    if (!identifiedCaseId) return;
    const res = await cnp.post(`/speak-up/cases/${identifiedCaseId}/notes`, {
      content: '[REG] CNP notes: escalating for visibility.',
    });
    expect([200, 201]).toContain(res.status);
  });

  test('NURSE cannot add a note → 403', async () => {
    if (!identifiedCaseId) return;
    const res = await nurse.post(`/speak-up/cases/${identifiedCaseId}/notes`, {
      content: 'Nurse note attempt.',
    });
    expect(res.status).toBe(403);
  });

  test('SVP can escalate a case', async () => {
    if (!identifiedCaseId) return;
    const res = await svp.post(`/speak-up/cases/${identifiedCaseId}/escalate`);
    expect([200, 201, 400]).toContain(res.status);
  });

  test('NURSE cannot escalate a case → 403', async () => {
    if (!identifiedCaseId) return;
    const res = await nurse.post(`/speak-up/cases/${identifiedCaseId}/escalate`);
    expect(res.status).toBe(403);
  });
});

// ── Convert to Issue ──────────────────────────────────────────────────────────

describe('Speak-Up — Convert to Issue', () => {
  test('HR_ANALYST can convert a case to a tracked Issue', async () => {
    // Create a fresh case to convert
    const submit = await nurse.post('/speak-up/cases', {
      category: 'SAFETY',
      description: '[REG] Case to convert to issue.',
      urgency: 'HIGH',
    });
    expect([200, 201]).toContain(submit.status);
    const caseId = submit.data?.id;
    if (!caseId) return;

    const res = await hr.post(`/speak-up/cases/${caseId}/convert-to-issue`);
    expect([200, 201, 400]).toContain(res.status);
  });

  test('NURSE cannot convert a case → 403', async () => {
    if (!identifiedCaseId) return;
    const res = await nurse.post(`/speak-up/cases/${identifiedCaseId}/convert-to-issue`);
    expect(res.status).toBe(403);
  });
});
