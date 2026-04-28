# ─── Stage 1: Admin build ───────────────────────────────────────────────
FROM node:20-alpine AS admin-build
WORKDIR /app/admin
COPY admin/ .
RUN npm install
RUN npm run build

# ─── Stage 2: Frontend (Mini App) build ─────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/ .
RUN npm install
RUN npm run build

# ─── Stage 3: Backend + serve ───────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY bot/bot.js ./backend/bot.js
COPY --from=admin-build     /app/admin/dist    ./admin/dist
COPY --from=frontend-build  /app/frontend/dist ./frontend/dist

EXPOSE 3000
EXPOSE 3001

CMD ["sh", "-c", "node backend/bot.js & node backend/server.js"]
