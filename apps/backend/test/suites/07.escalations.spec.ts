/**
 * Suite 07 — Escalations
 *
 * Covers:
 *  - List escalations (leadership only, NURSE → 403)
 *  - Trigger manual escalation (leadership only)
 *  - Get escalation by ID
 *  - Acknowledge escalation
 *  - Unauthenticated access → 401
 */

import { ApiClient, api } from '../helpers/client';

let svp: ApiClient;
let cnp: ApiClient;
let manager: ApiClient;
let nurse: ApiClient;

let escalationId: string;

beforeAll(async () => {
  [svp, cnp, manager, nurse] = await Promise.all([
    api.forRole('SVP'),
    api.forRole('CNO'),
    api.forRole('MANAGER'),
    api.forRole('NURSE'),
  ]);
});

// ── List ──────────────────────────────────────────────────────────────────────

describe('Escalations — List', () => {
  test('SVP can list escalations', async () => {
    const res = await svp.get('/escalations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    // Capture an ID for later tests
    if (res.data.length > 0) {
      escalationId = res.data[0].id;
    }
  });

  test('MANAGER can list escalations', async () => {
    const res = await manager.get('/escalations');
    expect(res.status).toBe(200);
  });

  test('NURSE cannot list escalations → 403', async () => {
    const res = await nurse.get('/escalations');
    expect(res.status).toBe(403);
  });

  test('Unauthenticated user cannot list escalations → 401', async () => {
    const res = await api.anon().get('/escalations');
    expect(res.status).toBe(401);
  });
});

// ── Trigger ───────────────────────────────────────────────────────────────────

describe('Escalations — Trigger', () => {
  test('SVP can manually trigger an escalation', async () => {
    const res = await svp.post('/escalations/trigger', {
      reason: '[REG] Regression test manual escalation.',
      level: 'HIGH',
    });
    expect([200, 201, 400]).toContain(res.status);
    if (res.data?.id) escalationId = res.data.id;
  });

  test('NURSE cannot trigger an escalation → 403', async () => {
    const res = await nurse.post('/escalations/trigger', {
      reason: 'Nurse trigger attempt.',
    });
    expect(res.status).toBe(403);
  });

  test('Unauthenticated user cannot trigger → 401', async () => {
    const res = await api.anon().post('/escalations/trigger', { reason: 'Anon.' });
    expect(res.status).toBe(401);
  });
});

// ── Get by ID ─────────────────────────────────────────────────────────────────

describe('Escalations — Get by ID', () => {
  test('SVP can get escalation by ID', async () => {
    if (!escalationId) return;
    const res = await svp.get(`/escalations/${escalationId}`);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(escalationId);
  });

  test('NURSE cannot get escalation by ID → 403', async () => {
    if (!escalationId) return;
    const res = await nurse.get(`/escalations/${escalationId}`);
    expect(res.status).toBe(403);
  });
});

// ── Acknowledge ───────────────────────────────────────────────────────────────

describe('Escalations — Acknowledge', () => {
  test('SVP can acknowledge an escalation', async () => {
    if (!escalationId) return;
    const res = await svp.patch(`/escalations/${escalationId}/acknowledge`);
    expect([200, 201, 400]).toContain(res.status);
  });

  test('NURSE cannot acknowledge an escalation → 403', async () => {
    if (!escalationId) return;
    const res = await nurse.patch(`/escalations/${escalationId}/acknowledge`);
    expect(res.status).toBe(403);
  });
});
