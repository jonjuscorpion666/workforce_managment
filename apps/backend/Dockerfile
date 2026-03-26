# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

RUN npm ci --workspace=apps/backend --include-workspace-root

COPY apps/backend ./apps/backend

RUN npm run build --workspace=apps/backend

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only production dependencies
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

RUN npm ci --workspace=apps/backend --include-workspace-root --omit=dev

# Copy compiled output
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Start script (handles optional seed + app start)
COPY apps/backend/start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 3001

CMD ["sh", "start.sh"]
