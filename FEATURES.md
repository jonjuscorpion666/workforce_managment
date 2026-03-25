# Feature List — Workforce Transformation Platform

Complete feature inventory across all modules. Status: **MVP — Production Ready**

---

## 1. Authentication & Access Control

- [x] Email + password login with JWT access tokens
- [x] Refresh token rotation (30-day sessions)
- [x] Auto-refresh on 401 — seamless re-authentication
- [x] Role-based access control (9 roles: SUPER_ADMIN → NURSE)
- [x] Permission decorators (`@Roles()`) on all sensitive endpoints
- [x] Separate nurse portal auth (validates role on login, separate token store)
- [x] Persistent login state via Zustand + localStorage
- [x] Secure logout (clears all tokens)
- [x] User profile: name, job title, department, employee ID, org unit
- [x] Hierarchical reporting structure (`reportsToId`)

---

## 2. Nurse / Staff Portal

Dedicated mobile-friendly interface for frontline staff. Separate from the leadership app.

- [x] Dedicated login page (`/portal/login`) — nurses only, role-validated
- [x] Welcome header with nurse name
- [x] Stats strip: active surveys, announcements count, pending acknowledgements
- [x] Active survey listing with question count and closing date
- [x] Anonymous survey submission (responses never linked to identity)
- [x] Announcement feed with read/unread state and priority colour-coding
- [x] Critical announcement banner with acknowledgement requirement
- [x] One-tap announcement acknowledgement
- [x] **Speak Up inline form** — submit concerns without leaving the portal
  - Category selection, description, urgency, escalation level, privacy mode
  - Anonymous or confidential privacy choice
  - SLA messaging (24h urgent / 72h normal)
  - Success confirmation with next-steps messaging

---

## 3. Survey Management

- [x] Create surveys with title, description, close date, anonymous flag
- [x] Multi-type questions: scale (1–5), text, multiple choice
- [x] Survey approval workflow (draft → pending approval → active)
- [x] Approval queue for senior leadership
- [x] Activate / pause / close surveys
- [x] Link surveys to org units (hospital, department, unit)
- [x] Survey response collection with anonymous mode
- [x] View response counts and completion rates
- [x] Auto-create issues from low survey scores

---

## 4. Issue Tracking

Full issue lifecycle from identification to closure.

- [x] Create issues manually or auto-generate from surveys
- [x] Issue sources: Survey Auto, Manual, Speak Up, Escalation
- [x] Severity levels: Critical, High, Medium, Low
- [x] Priority levels: P1–P4
- [x] Status flow: Open → Action Planned → In Progress → Awaiting Validation → Resolved → Closed
- [x] Status transition validation (only valid transitions allowed)
- [x] Reopen with required reason + reopen count tracking
- [x] Issue level: Unit / Department / Hospital / System
- [x] Owner and assigned-to fields with role labels
- [x] Due date tracking
- [x] Org unit scoping (hospital, department, unit)
- [x] Tags and category classification
- [x] Linked survey and question references
- [x] Baseline and target score tracking
- [x] Status notes on every transition
- [x] Full issue history / change log
- [x] Action plans with milestones
- [x] Filtering by status, severity, org unit, owner, source
- [x] Chronic issue detection (open > 30 days)

---

## 5. Action Plans & Tasks

- [x] Action plans linked to issues
- [x] Milestones within action plans with due dates
- [x] Milestone status tracking: Not Started → In Progress → Completed
- [x] Standalone tasks (not tied to issues)
- [x] Task status: Todo → In Progress → Blocked → Done → Cancelled
- [x] Task priority: High, Medium, Low
- [x] Due date + overdue detection
- [x] Parent/child task hierarchy (sub-tasks)
- [x] Task ownership and assignment
- [x] Overdue task counts surfaced in dashboards

---

## 6. Program Flow (Transformation Pipeline)

Executive command center tracking 6-stage transformation cycles across all hospitals.

- [x] Create named transformation cycles with start/target end dates
- [x] Link cycle to a survey
- [x] 6-stage pipeline per org unit: Survey Setup → Execution → Root Cause → Remediation → Communication → Validation
- [x] Stage states: Not Started, In Progress, Completed, Blocked
- [x] Per-cell metrics: days in stage, SLA status, issues count, tasks count
- [x] Configurable SLA thresholds per stage per cycle (JSONB)
- [x] Default SLA fallback (Survey Setup: 7d, Execution: 21d, Root Cause: 14d, Remediation: 45d, Communication: 7d, Validation: 14d)
- [x] SLA status: OK, Warning (>75%), Overdue
- [x] **Staleness detection** — IN_PROGRESS + no update in 7+ days
- [x] **Blocked reason** surfaced from note field
- [x] **Next recommended action** — rule-based string computed server-side
- [x] **Aggregate cells per hospital** — stuckCount, staleCount, overSlaCount, noOwnerCount
- [x] Owner short name display (e.g. "Dir. Chen")
- [x] Hospital-level row collapse/expand
- [x] KPI cards: Overall Completion %, Hospitals Active, Units Stuck, Overdue Tasks, Chronic Issues, Avg Days/Stage
- [x] Smart alert banner with reasons and affected unit IDs
- [x] Stage drill-down drawer with timeline, issues, tasks, next action
- [x] Stage edit modal with blocked reason labelling
- [x] Auto-compute stage states from existing data
- [x] SLA configuration modal (per-cycle override)
- [x] Stage flow legend with SLA days
- [x] 60-second auto-refresh

---

## 7. Speak Up (Skip-Level Escalation)

Safe, structured escalation channel for employees to bypass their direct manager.

- [x] **Employee submission form** (no auth required for anonymous)
  - 6 categories: Staffing, Leadership, Scheduling, Culture, Safety, Other
  - Description (required)
  - Urgency: Normal (72h SLA) or Urgent (24h SLA)
  - Preferred escalation level: Director, CNO, or HR
  - Privacy: Anonymous (identity never stored) or Confidential (stored, hidden from manager)
  - Trust banner explaining routing and privacy
- [x] **Auto-routing logic** (server-side, cannot be overridden by employee)
  - Safety → always CNO
  - Leadership / Culture → always HR
  - Urgent + Director preferred → bumped to CNO
  - Everything else → employee's preferred level
- [x] **Auto-generated case number** (SU-YYYYMM-NNNN)
- [x] **SLA enforcement**: 24h (urgent) or 72h (normal) from submission
- [x] **Status workflow**: New → Acknowledged → Scheduled → In Progress → Resolved / Escalated
- [x] **Leadership case management**
  - Case list with filters (status, urgency, category, routed-to)
  - Metrics dashboard: total, open, overdue, escalated, resolved, urgent, anonymous counts
  - Days open indicator, SLA breach flag
- [x] **Case detail view**
  - Full description, metadata, routing, privacy label
  - SLA deadline with breach indicator
  - Immutable activity timeline with icons
- [x] **Case actions** (contextual — only valid actions shown)
  - Acknowledge (New → Acknowledged)
  - Schedule Meeting (captures date + notes)
  - Record Outcome (root cause, summary, action required, owner — all required)
  - Resolve (blocked until outcome is recorded)
  - Escalate to senior leadership
  - Add Note (free-text, logged to timeline)
- [x] **Outcome gate** — case cannot be resolved without a complete meeting outcome
- [x] **Convert to Issue** — creates a tracked Issue linked to the speak up case
- [x] **Inline form in nurse portal** — nurses submit without leaving their portal
- [x] **Audit trail** — every action logged to `speak_up_activities` table
- [x] Anonymous identity protection — submittedById is null when anonymous

---

## 8. Announcements

- [x] Create announcements with title, body, type, priority (Critical/High/Medium/Low)
- [x] Audience targeting: System, Hospital, Department, Unit, Role, Combination
- [x] Draft → Scheduled → Published → Expired → Archived workflow
- [x] Pin important announcements
- [x] Acknowledgement requirement with due date
- [x] Schedule future publish date
- [x] Read tracking per recipient
- [x] Acknowledgement tracking per recipient
- [x] Personalized feed (role-filtered)
- [x] Unread count and pending acknowledgement count in nurse portal
- [x] Read/ack metrics for leadership (% read, % acknowledged)
- [x] Tags for categorisation
- [x] Expiry date

---

## 9. Meetings

- [x] Create and manage meetings
- [x] Meeting notes
- [x] Link meetings to issues, action plans, org units
- [x] Meeting type classification
- [x] Attendee tracking

---

## 10. Escalations

- [x] Formal escalation workflow
- [x] Link escalations to issues
- [x] Escalation levels
- [x] Automated escalation triggers based on inactivity (configurable threshold)
- [x] Overdue detection with configurable check interval

---

## 11. Analytics

- [x] Main analytics dashboard with survey completion and issue trends
- [x] SVP dashboard — network-wide executive view
- [x] Survey score trends by dimension
- [x] Issue resolution rates
- [x] Org unit comparison views
- [x] Charts powered by Recharts

---

## 12. KPIs

- [x] KPI definition and tracking
- [x] Target vs actual comparison
- [x] KPI dashboard view
- [x] Historical trend tracking

---

## 13. Org Hierarchy

- [x] 4-level org structure: System → Hospital → Department → Unit
- [x] Org unit codes and locations
- [x] Timezone support per unit
- [x] Active/inactive status
- [x] All issues, tasks, surveys, speak-up cases scoped to org units

---

## 14. Audit Trail

- [x] Immutable audit log for all significant actions
- [x] Action type, actor, before/after state, timestamp
- [x] Audit viewer in leadership app
- [x] Used by Issues module on every status change

---

## 15. Admin

- [x] Platform configuration
- [x] User management
- [x] Role and permission management
- [x] System-level settings

---

## 16. Dashboard

- [x] Personalised leadership dashboard
- [x] Quick stats: open issues, active surveys, pending tasks, recent activity
- [x] Role-adaptive content

---

## Infrastructure & Developer Experience

- [x] npm workspaces monorepo
- [x] Hot reload in development (`nest start --watch`, `next dev`)
- [x] Swagger / OpenAPI docs auto-generated at `/api/docs`
- [x] Global `ValidationPipe` with whitelist + forbidNonWhitelisted
- [x] URI-versioned API (`/api/v1/...`)
- [x] CORS configured per environment
- [x] Bull job queues with Redis backend
- [x] Scheduled tasks (`@nestjs/schedule`) for SLA breach checks
- [x] Elasticsearch integration for search
- [x] Winston structured logging
- [x] TypeORM `synchronize` in dev, migration-based in production
- [x] Multi-stage Docker builds (minimal production images)
- [x] `docker-compose.yml` — full stack including Nginx
- [x] Nginx reverse proxy with SSL termination (Let's Encrypt)
- [x] One-command deploy script (`./deploy.sh`)
- [x] `.env.example` with all variables documented
- [x] `.dockerignore` for lean images
- [x] Database seed script

---

## Security

- [x] Passwords hashed with bcrypt
- [x] JWT with short-lived access tokens (7d) + refresh rotation
- [x] Role-based guard on all management endpoints
- [x] Anonymous speak-up — identity never stored server-side unless opted in
- [x] Manager cannot see confidential speak-up submissions
- [x] Nurse portal role-validates on login (NURSE/STAFF only)
- [x] CORS restricted to configured origins
- [x] Nginx security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [x] TLS 1.2/1.3 only in production
- [x] No secrets in source (all via `.env`)
- [x] Audit trail for all sensitive operations

---

## Planned / Future

- [ ] Email notifications (SMTP config exists, delivery not yet wired)
- [ ] Push notifications (mobile)
- [ ] AI-powered issue categorisation (OpenAI key in env, not yet connected)
- [ ] Survey response sentiment analysis
- [ ] Bulk user import from CSV/HRIS
- [ ] SAML/SSO integration
- [ ] Mobile app (React Native)
- [ ] Advanced reporting exports (PDF, Excel)
- [ ] Webhook integrations (Slack, Teams)
- [ ] Multi-language / i18n support
