# ─── Stage 1: Admin build ───────────────────────────────────────────────
FROM node:20-alpine AS admin-build
WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm ci
COPY admin/ .
RUN npm run build

# ─── Stage 2: Frontend (Mini App) build ─────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ─── Stage 3: Backend + PM2 ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# PM2 global o'rnatish
RUN npm install -g pm2

# Backend dependencies (dev paketlarsiz)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY bot/ ./bot/

# Build artefaktlarni ko'chirish
COPY --from=admin-build     /app/admin/dist    ./admin/dist
COPY --from=frontend-build  /app/frontend/dist ./frontend/dist

# Log papkasi
RUN mkdir -p ./backend/logs

EXPOSE 3000
EXPOSE 3001

# PM2 — backend va bot mustaqil jarayonlar (birining tushishi ikkinchisiga ta'sir qilmaydi)
# --no-daemon: Docker uchun (PM2 foreground da ishlaydi)
CMD ["pm2-runtime", "start", "backend/ecosystem.config.js", "--env", "production"]
