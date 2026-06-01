# Contexto de build: raíz del monorepo
# docker build -f backend/Dockerfile .

# ── Etapa 1: build ────────────────────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json          ./
COPY backend/package*.json  ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci

COPY backend ./backend
RUN cd backend && npx prisma generate && npm run build

# ── Etapa 2: producción ───────────────────────────────────────────────────────
FROM node:24-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl wget && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/prisma                   ./backend/prisma

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health 2>/dev/null || exit 1

CMD ["node", "dist/src/main"]
