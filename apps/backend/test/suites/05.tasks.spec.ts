/**
 * Suite 05 — Tasks
 *
 * Covers:
 *  - Create task (MANAGER, CNP, SVP can)
 *  - NURSE cannot create → 403
 *  - List tasks with filters
 *  - Get task by ID
 *  - Update task
 *  - Get overdue tasks
 *  - Subtasks (child tasks)
 *  - Comments: add, delete
 *  - Delete task
 *  - Bulk-delete (SUPER_ADMIN only)
 */

import { ApiClient, api } from '../helpers/client';

let cnp: ApiClient;
let manager: ApiClient;
let nurse: ApiClient;
let admin: ApiClient;

let taskId: string;
let subtaskId: string;
let taskCommentId: string;
let linkedIssueId: string;

beforeAll(async () => {
  [cnp, manager, nurse, admin] = await Promise.all([
    api.forRole('CNO'),
    api.forRole('MANAGER'),
    api.forRole('NURSE'),
    api.forRole('SUPER_ADMIN'),
  ]);

  // Create a parent issue to link tasks to
  const issue = await cnp.post('/issues', {
    title: '[REG] Issue for Task Suite',
    severity: 'P3',
  });
  if (issue.status === 201) linkedIssueId = issue.data.id;
});

// ── Create ────────────────────────────────────────────────────────────────────

describe('Tasks — Creation', () => {
  test('MANAGER can create a task', async () => {
    const res = await manager.post('/tasks', {
      title: '[REG] Conduct weekly safety briefing',
      description: 'Regression test task.',
      priority: 'HIGH',
      ...(linkedIssueId ? { issueId: linkedIssueId } : {}),
      dueDate: new Date(Date.now() + 14 * 86400_000).toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    taskId = res.data.id;
  });

  test('CNP can create a task', async () => {
    const res = await cnp.post('/tasks', {
      title: '[REG] CNP task',
      priority: 'MEDIUM',
    });
    expect(res.status).toBe(201);
  });

  test('NURSE cannot create a task → 403', async () => {
    const res = await nurse.post('/tasks', {
      title: 'Unauthorized task',
      priority: 'LOW',
    });
    expect(res.status).toBe(403);
  });

  test('Unauthenticated user cannot create task → 401', async () => {
    const res = await api.anon().post('/tasks', { title: 'Anon task', priority: 'LOW' });
    expect(res.status).toBe(401);
  });
});

// ── Read ──────────────────────────────────────────────────────────────────────

describe('Tasks — Read', () => {
  test('MANAGER can list tasks', async () => {
    const res = await manager.get('/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('NURSE can list tasks (read-only)', async () => {
    const res = await nurse.get('/tasks');
    expect(res.status).toBe(200);
  });

  test('Can filter tasks by status', async () => {
    const res = await manager.get('/tasks', { status: 'OPEN' });
    expect(res.status).toBe(200);
  });

  test('Can filter tasks by issueId', async () => {
    if (!linkedIssueId) return;
    const res = await manager.get('/tasks', { issueId: linkedIssueId });
    expect(res.status).toBe(200);
  });

  test('MANAGER can get task by ID', async () => {
    const res = await manager.get(`/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(taskId);
  });

  test('GET /tasks/overdue returns list', async () => {
    const res = await manager.get('/tasks/overdue');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

// ── Update ────────────────────────────────────────────────────────────────────

describe('Tasks — Update', () => {
  test('MANAGER can update a task', async () => {
    const res = await manager.patch(`/tasks/${taskId}`, {
      title: '[REG] Conduct weekly safety briefing (updated)',
      priority: 'MEDIUM',
    });
    expect(res.status).toBe(200);
  });
});

// ── Subtasks ──────────────────────────────────────────────────────────────────

describe('Tasks — Subtasks', () => {
  test('MANAGER can create a subtask (child task)', async () => {
    const res = await manager.post('/tasks', {
      title: '[REG] Subtask — prepare briefing slides',
      priority: 'LOW',
      parentTaskId: taskId,
    });
    expect([200, 201]).toContain(res.status);
    if (res.data.id) subtaskId = res.data.id;
  });

  test('GET subtasks for a task returns array', async () => {
    const res = await manager.get(`/tasks/${taskId}/subtasks`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

// ── Comments ──────────────────────────────────────────────────────────────────

describe('Tasks — Comments', () => {
  test('MANAGER can add a comment to a task', async () => {
    const res = await manager.post(`/tasks/${taskId}/comments`, {
      content: 'Briefing scheduled for Monday morning.',
    });
    expect([200, 201]).toContain(res.status);
    if (res.data.id) taskCommentId = res.data.id;
  });

  test('GET comments for a task returns array', async () => {
    const res = await manager.get(`/tasks/${taskId}/comments`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    if (!taskCommentId && res.data.length > 0) {
      taskCommentId = res.data[0].id;
    }
  });

  test('Author can delete their own comment', async () => {
    if (!taskCommentId) return;
    const res = await manager.delete(`/tasks/${taskId}/comments/${taskCommentId}`);
    expect(res.status).toBe(204);
  });
});

// ── Delete / Bulk ─────────────────────────────────────────────────────────────

describe('Tasks — Delete', () => {
  test('NURSE cannot delete a task → 403', async () => {
    const res = await nurse.delete(`/tasks/${taskId}`);
    expect(res.status).toBe(403);
  });

  test('SUPER_ADMIN can bulk-delete tasks', async () => {
    const create = await manager.post('/tasks', {
      title: '[REG] Bulk Delete Task',
      priority: 'LOW',
    });
    expect(create.status).toBe(201);

    const res = await admin.post('/tasks/bulk-delete', { ids: [create.data.id] });
    expect(res.status).toBe(200);
  });

  test('NURSE cannot bulk-delete → 403', async () => {
    const res = await nurse.post('/tasks/bulk-delete', { ids: [taskId] });
    expect(res.status).toBe(403);
  });

  test('MANAGER can delete their task', async () => {
    const create = await manager.post('/tasks', {
      title: '[REG] Delete Me Task',
      priority: 'LOW',
    });
    expect(create.status).toBe(201);
    const res = await manager.delete(`/tasks/${create.data.id}`);
    expect(res.status).toBe(204);
  });
});
