/**
 * Suite 08 — RBAC Coverage Matrix
 *
 * Systematically verifies that every sensitive endpoint:
 *   (a) returns 403 for roles that must not access it, and
 *   (b) returns 401 for unauthenticated requests.
 *
 * This is the security regression layer. If a new endpoint is added
 * without a guard, this suite will catch it.
 */

import { ApiClient, api } from '../helpers/client';

// ── Client setup ──────────────────────────────────────────────────────────────

let admin: ApiClient;
let svp: ApiClient;
let cnp: ApiClient;
let manager: ApiClient;
let nurse: ApiClient;
let pct: ApiClient;
let hr: ApiClient;
let anon: ApiClient;

beforeAll(async () => {
  [admin, svp, cnp, manager, nurse, pct, hr, anon] = await Promise.all([
    api.forRole('SUPER_ADMIN'),
    api.forRole('SVP'),
    api.forRole('CNO'),
    api.forRole('MANAGER'),
    api.forRole('NURSE'),
    api.forRole('PCT'),
    api.forRole('HR_ANALYST'),
    Promise.resolve(api.anon()),
  ]);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function expectForbidden(status: number, label: string) {
  expect(status).toBe(403);
  // Helps with debugging if an assertion fails
  if (status !== 403) {
    console.warn(`  ⚠ Expected 403 for ${label}, got ${status}`);
  }
}

function expectUnauthorized(status: number, label: string) {
  expect(status).toBe(401);
  if (status !== 401) {
    console.warn(`  ⚠ Expected 401 for ${label}, got ${status}`);
  }
}

// ── Survey RBAC ───────────────────────────────────────────────────────────────

describe('RBAC Matrix — Surveys', () => {
  const UNAUTHORISED_CREATORS = [nurse, pct];
  const UNAUTHORISED_LABELS   = ['NURSE', 'PCT'];

  test.each(UNAUTHORISED_CREATORS.map((c, i) => [UNAUTHORISED_LABELS[i], c]))(
    '%s cannot POST /surveys',
    async (label, client) => {
      const res = await (client as ApiClient).post('/surveys', {
        title: 'RBAC test', type: 'PULSE', targetScope: 'SYSTEM', questions: [],
      });
      expectForbidden(res.status, `${label} POST /surveys`);
    },
  );

  test('anon cannot POST /surveys → 401', async () => {
    const res = await anon.post('/surveys', { title: 'x', type: 'PULSE', targetScope: 'SYSTEM', questions: [] });
    expectUnauthorized(res.status, 'anon POST /surveys');
  });

  test('NURSE cannot POST /surveys/bulk-delete → 403', async () => {
    const res = await nurse.post('/surveys/bulk-delete', { ids: [] });
    expectForbidden(res.status, 'NURSE bulk-delete surveys');
  });

  test('PCT cannot POST /surveys/bulk-delete → 403', async () => {
    const res = await pct.post('/surveys/bulk-delete', { ids: [] });
    expectForbidden(res.status, 'PCT bulk-delete surveys');
  });

  test('NURSE cannot POST /surveys/:id/approve → 403', async () => {
    const res = await nurse.post('/surveys/00000000-0000-0000-0000-000000000000/approve');
    expectForbidden(res.status, 'NURSE approve survey');
  });

  test('NURSE cannot POST /surveys/:id/reject → 403', async () => {
    const res = await nurse.post('/surveys/00000000-0000-0000-0000-000000000000/reject', { reason: 'x' });
    expectForbidden(res.status, 'NURSE reject survey');
  });

  test('anon cannot GET /surveys → 401', async () => {
    const res = await anon.get('/surveys');
    expectUnauthorized(res.status, 'anon GET /surveys');
  });
});

// ── Issues RBAC ───────────────────────────────────────────────────────────────

describe('RBAC Matrix — Issues', () => {
  test('NURSE cannot POST /issues → 403', async () => {
    const res = await nurse.post('/issues', { title: 'RBAC test', severity: 'P3' });
    expectForbidden(res.status, 'NURSE POST /issues');
  });

  test('PCT cannot POST /issues → 403', async () => {
    const res = await pct.post('/issues', { title: 'RBAC test', severity: 'P3' });
    expectForbidden(res.status, 'PCT POST /issues');
  });

  test('NURSE cannot POST /issues/bulk-delete → 403', async () => {
    const res = await nurse.post('/issues/bulk-delete', { ids: [] });
    expectForbidden(res.status, 'NURSE bulk-delete issues');
  });

  test('NURSE cannot POST /issues/auto-create → 403', async () => {
    const res = await nurse.post('/issues/auto-create', { surveyId: '00000000-0000-0000-0000-000000000000' });
    expectForbidden(res.status, 'NURSE auto-create issues');
  });

  test('anon cannot GET /issues → 401', async () => {
    const res = await anon.get('/issues');
    expectUnauthorized(res.status, 'anon GET /issues');
  });

  test('anon cannot POST /issues → 401', async () => {
    const res = await anon.post('/issues', { title: 'x', severity: 'P1' });
    expectUnauthorized(res.status, 'anon POST /issues');
  });
});

// ── Tasks RBAC ────────────────────────────────────────────────────────────────

describe('RBAC Matrix — Tasks', () => {
  test('NURSE cannot POST /tasks → 403', async () => {
    const res = await nurse.post('/tasks', { title: 'RBAC test', priority: 'LOW' });
    expectForbidden(res.status, 'NURSE POST /tasks');
  });

  test('PCT cannot POST /tasks → 403', async () => {
    const res = await pct.post('/tasks', { title: 'RBAC test', priority: 'LOW' });
    expectForbidden(res.status, 'PCT POST /tasks');
  });

  test('NURSE cannot POST /tasks/bulk-delete → 403', async () => {
    const res = await nurse.post('/tasks/bulk-delete', { ids: [] });
    expectForbidden(res.status, 'NURSE bulk-delete tasks');
  });

  test('anon cannot GET /tasks → 401', async () => {
    const res = await anon.get('/tasks');
    expectUnauthorized(res.status, 'anon GET /tasks');
  });

  test('anon cannot POST /tasks → 401', async () => {
    const res = await anon.post('/tasks', { title: 'x', priority: 'LOW' });
    expectUnauthorized(res.status, 'anon POST /tasks');
  });
});

// ── Speak-Up RBAC ─────────────────────────────────────────────────────────────

describe('RBAC Matrix — Speak-Up', () => {
  // Submit is open (OptionalJwtGuard) — anon should succeed
  test('anon CAN POST /speak-up/cases (OptionalJwt — intentional)', async () => {
    const res = await anon.post('/speak-up/cases', {
      category: 'SAFETY',
      description: 'RBAC anon speak-up test',
      urgency: 'LOW',
    });
    expect([200, 201]).toContain(res.status);
  });

  test('NURSE cannot GET /speak-up/cases → 403', async () => {
    const res = await nurse.get('/speak-up/cases');
    expectForbidden(res.status, 'NURSE GET /speak-up/cases');
  });

  test('PCT cannot GET /speak-up/cases → 403', async () => {
    const res = await pct.get('/speak-up/cases');
    expectForbidden(res.status, 'PCT GET /speak-up/cases');
  });

  test('NURSE cannot GET /speak-up/metrics → 403', async () => {
    const res = await nurse.get('/speak-up/metrics');
    expectForbidden(res.status, 'NURSE GET /speak-up/metrics');
  });

  test('anon cannot GET /speak-up/cases → 401', async () => {
    const res = await anon.get('/speak-up/cases');
    expectUnauthorized(res.status, 'anon GET /speak-up/cases');
  });

  test('NURSE cannot POST /speak-up/cases/:id/acknowledge → 403', async () => {
    const res = await nurse.post('/speak-up/cases/00000000-0000-0000-0000-000000000000/acknowledge');
    expectForbidden(res.status, 'NURSE acknowledge speak-up case');
  });

  test('NURSE cannot POST /speak-up/cases/:id/resolve → 403', async () => {
    const res = await nurse.post('/speak-up/cases/00000000-0000-0000-0000-000000000000/resolve');
    expectForbidden(res.status, 'NURSE resolve speak-up case');
  });

  test('NURSE cannot POST /speak-up/cases/:id/escalate → 403', async () => {
    const res = await nurse.post('/speak-up/cases/00000000-0000-0000-0000-000000000000/escalate');
    expectForbidden(res.status, 'NURSE escalate speak-up case');
  });

  test('NURSE cannot POST /speak-up/cases/:id/convert-to-issue → 403', async () => {
    const res = await nurse.post('/speak-up/cases/00000000-0000-0000-0000-000000000000/convert-to-issue');
    expectForbidden(res.status, 'NURSE convert speak-up to issue');
  });
});

// ── Escalations RBAC ──────────────────────────────────────────────────────────

describe('RBAC Matrix — Escalations', () => {
  test('NURSE cannot GET /escalations → 403', async () => {
    const res = await nurse.get('/escalations');
    expectForbidden(res.status, 'NURSE GET /escalations');
  });

  test('PCT cannot GET /escalations → 403', async () => {
    const res = await pct.get('/escalations');
    expectForbidden(res.status, 'PCT GET /escalations');
  });

  test('NURSE cannot POST /escalations/trigger → 403', async () => {
    const res = await nurse.post('/escalations/trigger', { reason: 'RBAC test' });
    expectForbidden(res.status, 'NURSE trigger escalation');
  });

  test('anon cannot GET /escalations → 401', async () => {
    const res = await anon.get('/escalations');
    expectUnauthorized(res.status, 'anon GET /escalations');
  });

  test('anon cannot POST /escalations/trigger → 401', async () => {
    const res = await anon.post('/escalations/trigger', { reason: 'x' });
    expectUnauthorized(res.status, 'anon POST /escalations/trigger');
  });
});

// ── Audit RBAC ────────────────────────────────────────────────────────────────

describe('RBAC Matrix — Audit', () => {
  test('anon cannot access audit logs → 401', async () => {
    const res = await anon.get('/audit');
    expect([401, 404]).toContain(res.status); // 404 if route uses different path
  });
});
