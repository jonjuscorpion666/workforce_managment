#!/bin/sh
# Railway start script — runs seed on first deploy if RUN_SEED=true
set -e

if [ "$RUN_SEED" = "true" ]; then
  echo "Running database seed..."
  node apps/backend/dist/database/seeds/seed.js || echo "Seed failed (may already be seeded)"
fi

echo "Starting backend..."
exec node apps/backend/dist/main
