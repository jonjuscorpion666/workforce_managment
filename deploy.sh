#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Zero-downtime deploy for Workforce Transformation Platform
# Usage: ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest code
git pull origin main

# 2. Build new images (no cache on CI, cached locally for speed)
docker-compose build --parallel

# 3. Restart services one at a time (keeps DB/Redis up)
docker-compose up -d --no-deps postgres redis elasticsearch
echo "  ✓ Infrastructure running"

# 4. Run database migrations (TypeORM synchronize handles dev; use migrations in prod)
# Uncomment when you have migration files:
# docker-compose run --rm backend node apps/backend/dist/database/migrate.js

# 5. Bring up backend then frontend
docker-compose up -d --no-deps backend
echo "  ✓ Backend running"

docker-compose up -d --no-deps frontend
echo "  ✓ Frontend running"

# 6. Reload Nginx (no downtime)
docker-compose up -d --no-deps nginx
docker-compose exec nginx nginx -s reload
echo "  ✓ Nginx reloaded"

# 7. Clean up old images
docker image prune -f

echo ""
echo "✅ Deployment complete!"
echo "   Frontend: https://your-domain.com"
echo "   API:      https://your-domain.com/api/v1"
echo "   Docs:     https://your-domain.com/api/docs"
