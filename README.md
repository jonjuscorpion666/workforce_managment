# Workforce Transformation Platform

Enterprise employee engagement, accountability, and transformation management platform built for healthcare networks.

---

## What It Does

A full-stack internal tool that gives nursing leadership end-to-end visibility over their workforce — from survey distribution to issue resolution to transformation program tracking. Nurses interact through a dedicated mobile-friendly portal. Leaders manage everything through a command-center dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, React 18) |
| Backend | NestJS 10 (Node.js) |
| Database | PostgreSQL 16 (TypeORM) |
| Queue | Redis 7 + Bull |
| Search | Elasticsearch 8 |
| Auth | JWT + Refresh Tokens (Passport.js) |
| Styling | Tailwind CSS |
| State | TanStack React Query + Zustand |
| Docs | Swagger / OpenAPI |

---

## Quick Start (Development)

**Prerequisites:** Node.js 20+, Docker, Docker Compose

```bash
# 1. Clone and install
git clone https://github.com/your-org/workforce-platform.git
cd workforce-platform
npm install

# 2. Start infrastructure (Postgres, Redis, Elasticsearch)
docker-compose up -d postgres redis elasticsearch

# 3. Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum

# 4. Start both apps
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Swagger Docs | http://localhost:3001/api/docs |
| Nurse Portal | http://localhost:3000/portal |

---

## Production Deployment

```bash
# 1. Provision server (Ubuntu 22.04, 4GB RAM minimum)
apt update && apt install -y docker.io docker-compose-v2 git certbot

# 2. Clone and configure
git clone ... && cd workforce-platform
cp .env.example .env
nano .env  # set all CHANGE_ME values + domain

# 3. SSL certificate (free)
certbot certonly --standalone -d your-domain.com

# 4. Update nginx/nginx.conf — replace your-domain.com

# 5. Launch everything
docker-compose up -d

# 6. All future deploys
./deploy.sh
```

See `nginx/nginx.conf` for reverse proxy config and `docker-compose.yml` for the full service definition.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Generate: `openssl rand -base64 64` |
| `REFRESH_TOKEN_SECRET` | Yes | Generate: `openssl rand -base64 64` |
| `REDIS_HOST` | Yes | Redis hostname (default: `redis`) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `NEXT_PUBLIC_API_URL` | Yes | Public URL of the backend API |
| `SMTP_*` | No | Email notification settings |
| `OPENAI_API_KEY` | No | AI features (optional) |

---

## Project Structure

```
workforce-platform/
├── apps/
│   ├── backend/                  # NestJS API
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/         # JWT auth, users, roles, permissions
│   │       │   ├── surveys/      # Survey creation, distribution, approvals
│   │       │   ├── responses/    # Survey response collection
│   │       │   ├── issues/       # Issue tracking + action plans
│   │       │   ├── tasks/        # Task management
│   │       │   ├── program-flow/ # Transformation cycle pipeline
│   │       │   ├── speakup/      # Skip-level escalation channel
│   │       │   ├── announcements/# Leadership communications
│   │       │   ├── meetings/     # Meeting management
│   │       │   ├── escalations/  # Escalation workflows
│   │       │   ├── analytics/    # Dashboard analytics
│   │       │   ├── kpis/         # KPI tracking
│   │       │   ├── audit/        # Audit trail
│   │       │   ├── dashboard/    # User dashboard
│   │       │   ├── org/          # Organizational hierarchy
│   │       │   └── admin/        # Platform configuration
│   │       └── common/
│   │           ├── guards/       # JWT auth guard, roles guard
│   │           └── decorators/   # @Roles() decorator
│   │
│   └── frontend/                 # Next.js 14 App Router
│       └── src/app/
│           ├── portal/           # Nurse/staff portal (separate auth)
│           ├── dashboard/        # Leadership dashboard
│           ├── surveys/          # Survey management
│           ├── issues/           # Issue tracker
│           ├── tasks/            # Task board
│           ├── program-flow/     # Transformation pipeline
│           ├── speak-up/         # Speak Up case management
│           ├── announcements/    # Announcements
│           ├── meetings/         # Meeting management
│           ├── analytics/        # Analytics + SVP dashboard
│           ├── escalations/      # Escalation management
│           ├── kpis/             # KPI dashboard
│           ├── audit/            # Audit log viewer
│           └── admin/            # Admin settings
│
├── docker-compose.yml            # Full stack (infra + apps + nginx)
├── nginx/nginx.conf              # Reverse proxy + SSL
├── deploy.sh                     # One-command deploy script
└── .env.example                  # Environment variable template
```

---

## User Roles

| Role | Access Level |
|---|---|
| `SUPER_ADMIN` | Full platform access |
| `SVP` | Network-wide visibility, SVP dashboard |
| `CNP` / `CNO` | Hospital-wide, all leadership features |
| `VP` | Vice-president level access |
| `DIRECTOR` | Department-level management |
| `MANAGER` | Unit-level management |
| `NURSE` / `STAFF` | Nurse portal only (surveys, speak up, announcements) |
| `HR_ANALYST` | HR and analytics access |
| `READ_ONLY` | View-only |

---

## API Reference

Full interactive documentation available at `/api/docs` (Swagger UI) when running.

**Base URL:** `/api/v1`
**Auth:** `Authorization: Bearer <token>`

### Core endpoints

```
POST   /auth/login                  Login
POST   /auth/register               Register
GET    /auth/me                     Current user

GET    /surveys                     List surveys
POST   /surveys                     Create survey

POST   /responses                   Submit survey response

GET    /issues                      List issues
POST   /issues                      Create issue
PATCH  /issues/:id                  Update issue

GET    /tasks                       List tasks
POST   /tasks                       Create task

GET    /program-flow/cycles         List transformation cycles
POST   /program-flow/cycles         Create cycle
GET    /program-flow/cycles/:id/pipeline   Pipeline view

POST   /speak-up/cases              Submit speak up case
GET    /speak-up/cases              List cases (leadership)
POST   /speak-up/cases/:id/resolve  Resolve case

GET    /announcements/feed          Personalized announcement feed
GET    /analytics                   Dashboard analytics
GET    /kpis                        KPI data
```

---

## Regression Testing

A full API regression suite lives in `apps/backend/test/`. Run it before every release to catch auth, RBAC, and workflow regressions across all eight feature modules.

Two layers of test coverage: **API regression** (fast, role-by-role) and **UI E2E** (real browser, critical journeys).

### API regression — what is covered

| Suite | Description |
|---|---|
| `01.auth` | Login (all 9 roles), JWT structure, token refresh, logout |
| `02.surveys` | Create, approval workflow (CNP → SVP), publish, close, delete |
| `03.responses` | Anonymous submission, identified submission, validation errors |
| `04.issues` | CRUD, action plans, milestones, comments, bulk-delete |
| `05.tasks` | CRUD, subtasks, comments, bulk-delete |
| `06.speakup` | Full lifecycle (submit → acknowledge → schedule → outcome → resolve), escalate, convert to issue |
| `07.escalations` | Trigger, list, get by ID, acknowledge |
| `08.rbac-matrix` | Systematic 403/401 checks — every sensitive endpoint tested with an unauthorized role |

### UI E2E — what is covered (Playwright)

| Suite | Description |
|---|---|
| `01.nurse-login` | Nurse portal login, wrong credentials, admin blocked from nurse portal |
| `02.admin-login` | Admin login for SVP/CNP/Manager/HR, wrong credentials, auth guard redirects |
| `03.nurse-survey` | Full flow: nurse navigates to survey, answers Likert question, submits, sees success |
| `04.speak-up` | Manager submits a speak-up case, form validation, success screen, reset |
| `05.rbac-ui` | Unauthenticated access to all protected routes, cross-portal access attempts, post-logout redirect |

### Run locally (full automated run)

**Prerequisites:** PostgreSQL running locally, Node 20+, backend built.

```bash
# API tests only (creates DB, seeds, starts server, tests, tears down):
./scripts/run-regression.sh

# API + UI tests together:
./scripts/run-regression.sh --e2e

# UI tests only (backend + frontend already running):
./scripts/run-regression.sh --e2e-only --skip-db --url http://localhost:3001/api/v1

# Test against Railway staging:
./scripts/run-regression.sh --url https://your-app.up.railway.app/api/v1 --skip-db
```

### Run manually

```bash
# API tests (server must be running):
cd apps/backend
TEST_API_URL=http://localhost:3001/api/v1 npm run test:regression

# UI tests (both backend + frontend must be running):
cd apps/frontend
TEST_API_URL=http://localhost:3001/api/v1 npm run test:e2e

# Open Playwright's interactive UI explorer:
npm run test:e2e:ui

# View the last HTML report:
npm run test:e2e:report
```

### HTML report

After each run an HTML report is written to `apps/backend/test/reports/regression-report.html`. Open it in a browser for a full pass/fail breakdown per suite and test case.

### CI (GitHub Actions)

The workflow at `.github/workflows/regression.yml` runs on every PR targeting `main` and on manual trigger (`workflow_dispatch`). It:

1. Spins up a fresh PostgreSQL + Redis service container
2. Seeds the regression database
3. Starts the compiled backend on port 3099
4. Runs the full Jest suite
5. Uploads the HTML report as a build artifact
6. Posts a ✅ / ❌ comment on the PR

> **Note:** Pushing the workflow file requires the `workflow` scope on your GitHub personal access token. Add it at **GitHub → Settings → Developer settings → Personal access tokens**, then:
> ```bash
> git add .github/workflows/regression.yml && git commit -m "ci: add regression workflow" && git push
> ```

### Test credentials

The suite uses the standard demo users seeded by `npm run seed`. All use password `Password123!`.

| Role | Email |
|---|---|
| `SUPER_ADMIN` | admin@hospital.com |
| `SVP` | svp@hospital.com |
| `CNP` | cnp@hospital.com |
| `VP` | vp@hospital.com |
| `DIRECTOR` | director@hospital.com |
| `MANAGER` | manager@hospital.com |
| `NURSE` | nurse1@hospital.com |
| `PCT` | pct1@hospital.com |
| `HR_ANALYST` | hr@hospital.com |

---

## Scripts

```bash
npm run dev              # Start both apps in watch mode
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run build            # Build both apps for production

# Database (backend)
npm run migration:generate   # Generate migration from entity changes
npm run migration:run        # Run pending migrations
npm run seed                 # Seed demo data

# Testing
npm run test:regression      # Run API regression suite (server must be running)
./scripts/run-regression.sh  # Full automated regression run (local)

# Docker
npm run docker:up        # Start infrastructure services
npm run docker:down      # Stop infrastructure services
./deploy.sh              # Full production deploy
```

---

## Important Notes

**Development vs Production database:**
TypeORM runs with `synchronize: true` in development (auto-migrates schema). In production, set `NODE_ENV=production` and use migration files instead — this prevents accidental data loss.

**Anonymous speak-up submissions:**
The `POST /speak-up/cases` endpoint intentionally has no auth guard so nurses can submit without being identified. Identity is only stored when `privacy: "CONFIDENTIAL"` is explicitly chosen.

**Nurse portal auth:**
The nurse portal (`/portal`) uses a separate Zustand auth store (`nurse-auth.ts`) and validates that the logged-in user has the `NURSE` or `STAFF` role. Nurses cannot access the leadership app.

---

## License

Private — internal use only.
