# ── Etapa 1: build Angular ────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production

# ── Etapa 2: nginx con proxy dinámico ─────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# envsubst viene incluido en nginx:alpine (gettext-envsubst)
RUN apk add --no-cache gettext

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health.txt 2>/dev/null || exit 1

# envsubst reemplaza ${BACKEND_URL} con la variable de entorno real en runtime
CMD ["/bin/sh", "-c", \
  "envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
