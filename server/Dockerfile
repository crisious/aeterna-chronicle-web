# ── 에테르나 크로니클 서버 — 멀티스테이지 빌드 ──────────────
# Stage 1: 빌드
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 설치 (캐시 레이어 분리)
COPY server/package.json server/package-lock.json* ./server/
COPY shared/ ./shared/
RUN cd server && npm ci --ignore-scripts

# 소스 복사 + 빌드
COPY server/tsconfig.json ./server/
COPY server/src/ ./server/src/
RUN cd server && npx tsc

# Prisma 클라이언트 생성
COPY server/prisma/ ./server/prisma/
RUN cd server && npx prisma generate

# Stage 2: 런타임
FROM node:20-alpine AS runtime
WORKDIR /app

# 보안: non-root 사용자
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 프로덕션 의존성만 설치
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# 빌드 산출물 복사
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY server/prisma/ ./prisma/

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server/src/server.js"]
