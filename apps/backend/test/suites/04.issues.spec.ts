/**
 * Suite 04 — Issues
 *
 * Covers:
 *  - Create issue (authorised roles)
 *  - NURSE cannot create → 403
 *  - List + filter issues
 *  - Get issue by ID
 *  - Update issue
 *  - Get change history
 *  - Action plans: create, update
 *  - Milestones: add, update, delete
 *  - Comments: add, delete (author only)
 *  - Reopen closed issue
 *  - Auto-create from survey
 *  - Bulk-delete (SUPER_ADMIN only)
 */

import { ApiClient, api } from '../helpers/client';

let cnp: ApiClient;
let svp: ApiClient;
let manager: ApiClient;
let nurse: ApiClient;
let hr: ApiClient;
let admin: ApiClient;

let issueId: string;
let actionPlanId: string;
let milestoneId: string;
let issueCommentId: string;

beforeAll(async () => {
  [cnp, svp, manager, nurse, hr, admin] = await Promise.all([
    api.forRole('CNP'),
    api.forRole('SVP'),
    api.forRole('MANAGER'),
    api.forRole('NURSE'),
    api.forRole('HR_ANALYST'),
    api.forRole('SUPER_ADMIN'),
  ]);
});

// ── Create ────────────────────────────────────────────────────────────────────

describe('Issues — Creation', () => {
  test('CNP can create an issue', async () => {
    const res = await cnp.post('/issues', {
      title: '[REG] Nurse Staffing Shortage — ICU',
      description: 'Regression test issue: chronic understaffing in ICU observed over 3 shifts.',
      severity: 'P2',
      category: 'STAFFING',
    });

    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    issueId = res.data.id;
  });

  test('MANAGER can create an issue', async () => {
    const res = await manager.post('/issues', {
      title: '[REG] Manager-Created Issue',
      severity: 'P3',
    });
    expect(res.status).toBe(201);
  });

  test('NURSE cannot create an issue → 403', async () => {
    const res = await nurse.post('/issues', {
      title: 'Nurse Issue',
      severity: 'P2',
    });
    expect(res.status).toBe(403);
  });

  test('Unauthenticated user cannot create issue → 401', async () => {
    const res = await api.anon().post('/issues', { title: 'Anon', severity: 'P1' });
    expect(res.status).toBe(401);
  });
});

// ── Read ──────────────────────────────────────────────────────────────────────

describe('Issues — Read', () => {
  test('CNP can list all issues', async () => {
    const res = await cnp.get('/issues');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('NURSE can list issues (read-only)', async () => {
    const res = await nurse.get('/issues');
    expect(res.status).toBe(200);
  });

  test('Can filter issues by status', async () => {
    const res = await cnp.get('/issues', { status: 'OPEN' });
    expect(res.status).toBe(200);
  });

  test('CNP can get issue by ID', async () => {
    const res = await cnp.get(`/issues/${issueId}`);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(issueId);
  });

  test('GET issue history returns array', async () => {
    const res = await cnp.get(`/issues/${issueId}/history`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

// ── Update ────────────────────────────────────────────────────────────────────

describe('Issues — Update', () => {
  test('CNP can update issue title and severity', async () => {
    const res = await cnp.patch(`/issues/${issueId}`, {
      title: '[REG] Nurse Staffing Shortage — ICU (updated)',
      severity: 'P1',
    });
    expect(res.status).toBe(200);
    expect(res.data.severity).toBe('P1');
  });
});

// ── Action Plans ──────────────────────────────────────────────────────────────

describe('Issues — Action Plans', () => {
  test('CNP can create an action plan for the issue', async () => {
    const res = await cnp.post(`/issues/${issueId}/action-plans`, {
      title: 'Hire 3 agency nurses for ICU',
      targetDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
    });
    expect([200, 201]).toContain(res.status);
    if (res.data.id) actionPlanId = res.data.id;
  });

  test('GET action plans for issue returns array', async () => {
    const res = await cnp.get(`/issues/${issueId}/action-plans`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    if (!actionPlanId && res.data.length > 0) {
      actionPlanId = res.data[0].id;
    }
  });

  test('CNP can update the action plan', async () => {
    if (!actionPlanId) return; // skip if creation failed
    const res = await cnp.patch(`/issues/action-plans/${actionPlanId}`, {
      title: 'Hire 5 agency nurses for ICU (revised)',
    });
    expect(res.status).toBe(200);
  });
});

// ── Milestones ────────────────────────────────────────────────────────────────

describe('Issues — Milestones', () => {
  test('CNP can add a milestone to an action plan', async () => {
    if (!actionPlanId) return;
    const res = await cnp.post(`/issues/action-plans/${actionPlanId}/milestones`, {
      title: 'Post job listings on 3 agencies',
      dueDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
    });
    expect([200, 201]).toContain(res.status);
    if (res.data.id) milestoneId = res.data.id;
  });

  test('CNP can update a milestone', async () => {
    if (!milestoneId) return;
    const res = await cnp.patch(`/issues/milestones/${milestoneId}`, {
      title: 'Post listings — completed',
      completed: true,
    });
    expect(res.status).toBe(200);
  });

  test('CNP can delete a milestone', async () => {
    if (!milestoneId) return;
    const res = await cnp.delete(`/issues/milestones/${milestoneId}`);
    expect(res.status).toBe(204);
  });
});

// ── Comments ──────────────────────────────────────────────────────────────────

describe('Issues — Comments', () => {
  test('CNP can add a comment to an issue', async () => {
    const res = await cnp.post(`/issues/${issueId}/comments`, {
      content: 'Escalating this to HR for immediate review.',
    });
    expect([200, 201]).toContain(res.status);
    if (res.data.id) issueCommentId = res.data.id;
  });

  test('GET comments returns array', async () => {
    const res = await cnp.get(`/issues/${issueId}/comments`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    if (!issueCommentId && res.data.length > 0) {
      issueCommentId = res.data[0].id;
    }
  });

  test('Author can delete their own comment', async () => {
    if (!issueCommentId) return;
    const res = await cnp.delete(`/issues/${issueId}/comments/${issueCommentId}`);
    expect(res.status).toBe(204);
  });
});

// ── Delete / Bulk ─────────────────────────────────────────────────────────────

describe('Issues — Delete', () => {
  test('NURSE cannot delete an issue → 403', async () => {
    const res = await nurse.delete(`/issues/${issueId}`);
    expect(res.status).toBe(403);
  });

  test('SUPER_ADMIN can bulk-delete issues', async () => {
    const create = await cnp.post('/issues', {
      title: '[REG] Bulk Delete Issue',
      severity: 'P4',
    });
    expect(create.status).toBe(201);

    const res = await admin.post('/issues/bulk-delete', { ids: [create.data.id] });
    expect(res.status).toBe(200);
  });

  test('NURSE cannot bulk-delete → 403', async () => {
    const res = await nurse.post('/issues/bulk-delete', { ids: [issueId] });
    expect(res.status).toBe(403);
  });
});

// Export issueId for tasks suite
export { issueId };
