#!/bin/sh
# Railway start script — runs seed on first deploy if RUN_SEED=true
set -e

if [ "$RUN_SEED" = "true" ]; then
  echo "Running database seed..."
  # The seed is idempotent (existing users are skipped). A non-zero exit
  # therefore means a real error — surface it loudly instead of pretending
  # the DB is already seeded.
  if node apps/backend/dist/database/seeds/seed.js; then
    echo "✓ Seed complete."
  else
    seed_exit=$?
    echo "❌ Seed FAILED (exit $seed_exit). Aborting startup — fix the error or unset RUN_SEED." >&2
    exit "$seed_exit"
  fi
fi

echo "Starting backend..."
exec node apps/backend/dist/main
