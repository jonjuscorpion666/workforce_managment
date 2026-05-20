# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install full deps (need devDeps for `nest build`)
RUN npm ci --workspace=apps/backend --include-workspace-root \
      --prefer-offline --no-audit --no-fund

COPY apps/backend ./apps/backend

RUN npm run build --workspace=apps/backend \
 && npm prune --omit=dev --workspace=apps/backend --include-workspace-root \
 && npm cache clean --force

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Reuse the pruned install + compiled output from the builder — avoids a second
# `npm ci` on the build daemon (halves peak disk usage during the build).
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Start script (handles optional seed + app start)
COPY apps/backend/start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 3001

CMD ["sh", "start.sh"]
