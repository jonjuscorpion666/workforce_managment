/**
 * Global Setup — runs once before all test suites.
 *
 * Responsibilities:
 *  1. Verify the API server is reachable at TEST_API_URL.
 *  2. Optionally seed the test database (via TEST_SKIP_SEED=true to skip).
 *
 * The server itself is expected to already be running (started by
 * scripts/run-regression.sh or a CI step). This keeps the setup fast
 * and avoids duplicating server bootstrap logic here.
 */

import axios from 'axios';
import { execSync } from 'child_process';
import * as path from 'path';

const BASE_URL = process.env.TEST_API_URL ?? 'http://localhost:3001/api/v1';
const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 1500;

async function waitForServer(): Promise<void> {
  console.log(`\n⏳ Waiting for API server at ${BASE_URL} ...`);
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await axios.get(`${BASE_URL}/auth/me`, { validateStatus: () => true });
      console.log(`✅ Server is ready.\n`);
      return;
    } catch {
      if (i === MAX_RETRIES) {
        throw new Error(
          `Server did not become ready after ${MAX_RETRIES * RETRY_INTERVAL_MS / 1000}s.\n` +
          `Make sure the backend is running at ${BASE_URL}.\n` +
          `Tip: run scripts/run-regression.sh to start everything automatically.`,
        );
      }
      await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }
}

async function seedIfNeeded(): Promise<void> {
  if (process.env.TEST_SKIP_SEED === 'true') {
    console.log('ℹ️  Skipping seed (TEST_SKIP_SEED=true).\n');
    return;
  }

  console.log('🌱 Seeding test database...');
  const seedScript = path.resolve(__dirname, '../src/database/seeds/seed.ts');
  const tsNode    = path.resolve(__dirname, '../node_modules/.bin/ts-node');
  const root      = path.resolve(__dirname, '../');

  try {
    execSync(
      `${tsNode} -r tsconfig-paths/register ${seedScript}`,
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL,
          NODE_ENV: 'test',
        },
      },
    );
    console.log('✅ Seed complete.\n');
  } catch (err: any) {
    // Non-zero exit = already seeded or seed error.
    // Allow tests to continue — the seed script skips existing data.
    console.warn('⚠️  Seed script exited with error (possibly already seeded):', err.message);
  }
}

export default async function globalSetup() {
  await waitForServer();
  await seedIfNeeded();
}
