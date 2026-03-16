# ── 에테르나 크로니클 — 올인원 Dockerfile (개발/CI 용) ────────
# 프로덕션 배포는 docker-compose (server/Dockerfile + client/Dockerfile) 사용 권장
#
# 사용법:
#   docker build -t aeterna-chronicle .
#   docker run -p 3000:3000 aeterna-chronicle

# Stage 1: 빌드 (서버)
FROM node:20-alpine AS builder
WORKDIR /app

# 공유 모듈 복사
COPY shared/ ./shared/

# 서버 의존성 설치
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --ignore-scripts

# 서버 소스 복사 + 빌드
COPY server/tsconfig.json ./server/
COPY server/src/ ./server/src/
COPY server/prisma/ ./server/prisma/
RUN cd server && npx prisma generate && npx tsc

# Stage 2: 런타임
FROM node:20-alpine AS runtime
WORKDIR /app

# 보안: non-root 사용자
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 프로덕션 의존성만 설치
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

# 빌드 산출물 복사
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY server/prisma/ ./prisma/

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server/src/server.js"]
