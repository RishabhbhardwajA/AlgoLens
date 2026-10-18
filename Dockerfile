# =========================================================================
# AlgoLens — Production Multi-Stage Dockerfile
# =========================================================================
# Multi-stage build providing minimal image size, zero devDependencies in runtime,
# automated test gating during build, non-root execution, and graceful signal handling.
# =========================================================================

# -------------------------------------------------------------------------
# Stage 1: Build & Automated Test Gate
# -------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies using npm workspaces and root package-lock
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

RUN npm ci

# Copy full application source code and configurations
COPY frontend/ frontend/
COPY backend/ backend/
COPY tsconfig.json tsconfig.node.json ./

# Test Gate: Enforce that all backend and frontend unit/regression tests pass
RUN npm test

# Build production bundles: Frontend (Vite) -> frontend/dist, Backend (tsc) -> backend/dist
RUN npm run build

# -------------------------------------------------------------------------
# Stage 2: Production Dependencies Only
# -------------------------------------------------------------------------
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

# Install only production dependencies across workspaces
RUN npm ci --omit=dev --ignore-scripts

# -------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime
# -------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Install dumb-init for proper Linux PID 1 signal forwarding (SIGTERM / SIGINT)
RUN apk add --no-cache dumb-init && \
    rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/corepack \
           /opt/yarn*

ENV NODE_ENV=production \
    PORT=5000 \
    DATABASE_PATH=/app/backend/data/algolens.db

WORKDIR /app

# Create persistent storage directories and assign permissions to non-root 'node' user
RUN mkdir -p /app/backend/data /data && \
    chown -R node:node /app /data

# Copy production node_modules from prod-deps stage
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/package.json ./package.json
COPY --from=prod-deps --chown=node:node /app/backend/package.json ./backend/package.json

# Copy compiled production artifacts from builder stage
COPY --from=builder --chown=node:node /app/backend/dist ./backend/dist
COPY --from=builder --chown=node:node /app/frontend/dist ./frontend/dist

# Switch to non-root node user (UID 1000) for security hardening
USER node

# Expose unified application port (Express serves API on /api/* and frontend on /*)
EXPOSE 5000

# Container healthcheck querying lightweight /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Forward shutdown signals (SIGTERM) gracefully to Express and SQLite WAL checkpoint
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/server.js"]
