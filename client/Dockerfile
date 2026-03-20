# ── 에테르나 크로니클 클라이언트 — Vite 빌드 + nginx 서빙 ──
# Stage 1: 빌드
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 설치
COPY client/package.json client/package-lock.json* ./client/
COPY shared/ ./shared/
RUN cd client && npm install

# 소스 복사 + Vite 빌드
COPY client/tsconfig.json client/vite.config.ts ./client/
COPY client/src/ ./client/src/
COPY client/index.html ./client/
COPY client/public/ ./client/public/ 2>/dev/null || true
RUN cd client && npx vite build

# Stage 2: nginx 서빙
FROM nginx:1.25-alpine AS runtime

# 커스텀 nginx 설정
COPY --from=builder /app/client/dist /usr/share/nginx/html

# SPA fallback + API reverse proxy 설정
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # API / Auth / Combat → 서버 프록시 \
    location /api/ { \
        proxy_pass http://server:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    location /auth/ { \
        proxy_pass http://server:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    location /combat/ { \
        proxy_pass http://server:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    \
    # Socket.IO WebSocket 프록시 \
    location /socket.io/ { \
        proxy_pass http://server:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    \
    # 정적 에셋 — 장기 캐시 \
    location /assets { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # SPA fallback \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
