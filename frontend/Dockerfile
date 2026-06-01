# Contexto de build: raíz del monorepo
# docker build -f frontend/Dockerfile .

# ── Etapa 1: build Angular ────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copiar lockfile raíz y package.json de ambos niveles
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Instalar dependencias del workspace frontend usando el lockfile raíz
RUN npm ci --workspace=frontend

COPY frontend ./frontend

RUN cd frontend && npm run build -- --configuration=production

# ── Etapa 2: nginx con proxy dinámico ─────────────────────────────────────────
FROM nginx:1.27-alpine AS production

RUN apk add --no-cache gettext

COPY --from=builder /app/frontend/dist/frontend/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ > /dev/null 2>&1 || exit 1

CMD ["/bin/sh", "-c", \
  "envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
