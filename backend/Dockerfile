# Contexto de build: raíz del monorepo
# docker build -f backend/Dockerfile .

# ── Etapa 1: build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copiar lockfile raíz y package.json de ambos niveles
COPY package*.json ./
COPY backend/package*.json ./backend/

# Instalar dependencias del workspace backend usando el lockfile raíz
RUN npm ci --workspace=backend

COPY backend ./backend

RUN cd backend && npx prisma generate && npm run build

# ── Etapa 2: producción ───────────────────────────────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY backend/prisma ./backend/prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "backend/dist/main"]
