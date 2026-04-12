#!/usr/bin/env bash
# =============================================================================
# Workforce Platform — Pre-Release Regression Test Runner
#
# Usage:
#   ./scripts/run-regression.sh [OPTIONS]
#
# Options:
#   --url <url>        API base URL to test against (skips local server start)
#                      Example: --url https://workforce-staging.up.railway.app/api/v1
#   --skip-seed        Don't seed the test database (use if already seeded)
#   --skip-db          Don't create/drop the regression database (use with --url)
#   --keep-db          Don't drop the regression database on exit
#   --port <port>      Local server port (default: 3099)
#   --help             Show this help
#
# Examples:
#   # Full local run (creates DB, seeds, starts server, tests, cleans up):
#   ./scripts/run-regression.sh
#
#   # Test against Railway staging (no local server needed):
#   ./scripts/run-regression.sh --url https://my-app.up.railway.app/api/v1 --skip-db
#
#   # Re-run tests against already-running local server:
#   ./scripts/run-regression.sh --url http://localhost:3001/api/v1 --skip-db --skip-seed
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/apps/backend"

TEST_PORT="${TEST_PORT:-3099}"
REGRESSION_DB="workforce_regression"
DB_USER="${DB_USER:-$(whoami)}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT_PG="${DB_PORT_PG:-5432}"
TEST_DATABASE_URL="postgres://${DB_USER}@${DB_HOST}:${DB_PORT_PG}/${REGRESSION_DB}"

CUSTOM_URL=""
SKIP_SEED=false
SKIP_DB=false
KEEP_DB=false
SERVER_PID=""

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()     { echo -e "${CYAN}[regression]${RESET} $*"; }
success() { echo -e "${GREEN}[regression]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[regression]${RESET} $*"; }
error()   { echo -e "${RED}[regression]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}\n"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)       CUSTOM_URL="$2"; shift 2 ;;
    --port)      TEST_PORT="$2"; shift 2 ;;
    --skip-seed) SKIP_SEED=true; shift ;;
    --skip-db)   SKIP_DB=true; shift ;;
    --keep-db)   KEEP_DB=true; shift ;;
    --help)
      sed -n '/^# Usage/,/^# ====/p' "${BASH_SOURCE[0]}" | head -n -1
      exit 0
      ;;
    *) error "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  local exit_code=$?

  if [[ -n "${SERVER_PID}" ]]; then
    log "Stopping test server (PID ${SERVER_PID})..."
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi

  if [[ "${SKIP_DB}" == false && "${KEEP_DB}" == false ]]; then
    log "Dropping regression database: ${REGRESSION_DB}"
    dropdb --if-exists -h "${DB_HOST}" -p "${DB_PORT_PG}" -U "${DB_USER}" \
      "${REGRESSION_DB}" 2>/dev/null || warn "Could not drop DB (may not exist)"
  fi

  if [[ $exit_code -eq 0 ]]; then
    success "Regression run complete — ALL TESTS PASSED ✅"
  else
    error "Regression run complete — SOME TESTS FAILED ❌"
    error "HTML report: ${BACKEND_DIR}/test/reports/regression-report.html"
  fi

  exit $exit_code
}
trap cleanup EXIT INT TERM

# ── Banner ────────────────────────────────────────────────────────────────────
header "Workforce Platform — Regression Test Suite"
log "Date: $(date '+%Y-%m-%d %H:%M:%S')"
log "Backend: ${BACKEND_DIR}"

# ── Determine test URL ────────────────────────────────────────────────────────
if [[ -n "${CUSTOM_URL}" ]]; then
  TEST_API_URL="${CUSTOM_URL}"
  SKIP_DB=true
  log "Target URL: ${TEST_API_URL} (external — skipping local server)"
else
  TEST_API_URL="http://localhost:${TEST_PORT}/api/v1"
  log "Target URL: ${TEST_API_URL} (local)"
fi

export TEST_API_URL

# ── Build ─────────────────────────────────────────────────────────────────────
if [[ -z "${CUSTOM_URL}" ]]; then
  header "Building backend"
  (cd "${BACKEND_DIR}" && npm run build)
  success "Build complete"
fi

# ── Database setup ────────────────────────────────────────────────────────────
if [[ "${SKIP_DB}" == false ]]; then
  header "Setting up regression database"

  log "Dropping existing regression DB (if any)..."
  dropdb --if-exists -h "${DB_HOST}" -p "${DB_PORT_PG}" -U "${DB_USER}" \
    "${REGRESSION_DB}" 2>/dev/null || true

  log "Creating fresh regression DB: ${REGRESSION_DB}"
  createdb -h "${DB_HOST}" -p "${DB_PORT_PG}" -U "${DB_USER}" "${REGRESSION_DB}"
  success "Database created"
fi

# ── Seed ──────────────────────────────────────────────────────────────────────
if [[ "${SKIP_SEED}" == false && -z "${CUSTOM_URL}" ]]; then
  header "Seeding regression database"
  (
    cd "${BACKEND_DIR}"
    DATABASE_URL="${TEST_DATABASE_URL}" \
    NODE_ENV=test \
      npx ts-node -r tsconfig-paths/register src/database/seeds/seed.ts
  )
  success "Seed complete"
fi

# ── Start local server ────────────────────────────────────────────────────────
if [[ -z "${CUSTOM_URL}" ]]; then
  header "Starting test server on port ${TEST_PORT}"

  # Load base .env then override for test
  set -o allexport
  [[ -f "${ROOT_DIR}/.env" ]] && source "${ROOT_DIR}/.env"
  set +o allexport

  DATABASE_URL="${TEST_DATABASE_URL}" \
  NODE_ENV=test \
  PORT="${TEST_PORT}" \
    node "${BACKEND_DIR}/dist/main.js" > /tmp/regression-backend.log 2>&1 &
  SERVER_PID=$!

  log "Server PID: ${SERVER_PID}"
  log "Waiting for server to be ready..."

  MAX_WAIT=60
  for i in $(seq 1 $MAX_WAIT); do
    if curl -sf "${TEST_API_URL}/auth/me" -o /dev/null 2>/dev/null; then
      success "Server ready after ${i}s"
      break
    fi
    if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
      error "Server process exited unexpectedly. Logs:"
      tail -30 /tmp/regression-backend.log
      exit 1
    fi
    sleep 1
    if [[ $i -eq $MAX_WAIT ]]; then
      error "Server did not become ready after ${MAX_WAIT}s. Logs:"
      tail -30 /tmp/regression-backend.log
      exit 1
    fi
  done
fi

# ── Run tests ─────────────────────────────────────────────────────────────────
header "Running regression test suite"

mkdir -p "${BACKEND_DIR}/test/reports"

TEST_API_URL="${TEST_API_URL}" \
TEST_SKIP_SEED=true \
  npx jest \
    --config "${BACKEND_DIR}/test/jest.integration.ts" \
    --forceExit \
    --passWithNoTests \
    "${@}"

# Exit code is propagated by trap
