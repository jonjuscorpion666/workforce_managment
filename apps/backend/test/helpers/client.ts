/**
 * API client used by all test suites.
 *
 * Usage:
 *   const client = await api.forRole('CNP');
 *   const res = await client.post('/surveys', { ... });
 *   expect(res.status).toBe(201);
 *
 *   const anon = api.anon();
 *   const res = await anon.post('/speak-up/cases', { ... });
 */

import axios, { AxiosResponse } from 'axios';

export const BASE_URL = process.env.TEST_API_URL ?? 'http://localhost:3001/api/v1';

// ── Role credentials (mirrors demo-users.seed.ts) ───────────────────────────

export const CREDENTIALS: Record<string, { email: string; password: string }> = {
  SUPER_ADMIN: { email: 'admin@hospital.com',    password: 'Password123!' },
  SVP:         { email: 'svp@hospital.com',       password: 'Password123!' },
  CNP:         { email: 'cnp@hospital.com',       password: 'Password123!' },
  VP:          { email: 'vp@hospital.com',        password: 'Password123!' },
  DIRECTOR:    { email: 'director@hospital.com',  password: 'Password123!' },
  MANAGER:     { email: 'manager@hospital.com',   password: 'Password123!' },
  NURSE:       { email: 'nurse1@hospital.com',    password: 'Password123!' },
  PCT:         { email: 'pct1@hospital.com',      password: 'Password123!' },
  HR_ANALYST:  { email: 'hr@hospital.com',        password: 'Password123!' },
};

// Token cache — populated lazily, shared for the entire Jest process (runInBand)
const TOKEN_CACHE: Record<string, string> = {};

export async function loginAs(role: string): Promise<string> {
  if (TOKEN_CACHE[role]) return TOKEN_CACHE[role];

  const creds = CREDENTIALS[role];
  if (!creds) throw new Error(`No credentials configured for role: ${role}`);

  const res = await axios.post(`${BASE_URL}/auth/login`, creds, { validateStatus: () => true });
  if (res.status !== 200 || !res.data?.accessToken) {
    throw new Error(`Login failed for ${role}: ${res.status} — ${JSON.stringify(res.data)}`);
  }

  TOKEN_CACHE[role] = res.data.accessToken;
  return TOKEN_CACHE[role];
}

// ── ApiClient class ──────────────────────────────────────────────────────────

export class ApiClient {
  constructor(
    private readonly baseUrl: string = BASE_URL,
    private readonly token?: string,
  ) {}

  /** Return a new client authenticated as the given role. */
  async forRole(role: string): Promise<ApiClient> {
    const token = await loginAs(role);
    return new ApiClient(this.baseUrl, token);
  }

  /** Return an unauthenticated client (for anonymous endpoint testing). */
  anon(): ApiClient {
    return new ApiClient(this.baseUrl, undefined);
  }

  /** Return a client with an arbitrary invalid token (for 401 testing). */
  withBadToken(): ApiClient {
    return new ApiClient(this.baseUrl, 'invalid.jwt.token');
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private opts() {
    return { headers: this.headers, validateStatus: () => true as true };
  }

  get(path: string, params?: Record<string, unknown>): Promise<AxiosResponse> {
    return axios.get(`${this.baseUrl}${path}`, { ...this.opts(), params });
  }

  post(path: string, data?: unknown): Promise<AxiosResponse> {
    return axios.post(`${this.baseUrl}${path}`, data, this.opts());
  }

  patch(path: string, data?: unknown): Promise<AxiosResponse> {
    return axios.patch(`${this.baseUrl}${path}`, data, this.opts());
  }

  delete(path: string): Promise<AxiosResponse> {
    return axios.delete(`${this.baseUrl}${path}`, this.opts());
  }
}

export const api = new ApiClient(BASE_URL);
