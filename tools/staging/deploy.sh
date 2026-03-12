#!/bin/bash
# ── 에테르나 크로니클 — 스테이징 배포 스크립트 ───────────────
# 사용법: bash tools/staging/deploy.sh
set -euo pipefail

COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
PROJECT="aeterna-staging"

echo "══════════════════════════════════════════"
echo "  에테르나 크로니클 — 스테이징 배포"
echo "══════════════════════════════════════════"

# ── 1. 환경변수 파일 확인 ──
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE 파일이 없습니다. .env.staging을 먼저 생성하세요."
  exit 1
fi

# ── 2. 이미지 빌드 ──
echo ""
echo "🔨 [1/5] Docker 이미지 빌드..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" build --no-cache

# ── 3. DB + Redis 먼저 기동 (마이그레이션 선행 조건) ──
echo ""
echo "🗄️  [2/5] 데이터베이스 + Redis 기동..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" up -d postgres redis

# DB 헬스체크 대기
echo "  ⏳ PostgreSQL 헬스체크 대기..."
until docker compose -f "$COMPOSE_FILE" -p "$PROJECT" exec -T postgres pg_isready -U aeterna_staging 2>/dev/null; do
  sleep 2
done
echo "  ✅ PostgreSQL 준비 완료"

# ── 4. Prisma 마이그레이션 실행 ──
echo ""
echo "📐 [3/5] Prisma 마이그레이션 실행..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" run --rm \
  -e DATABASE_URL="postgresql://aeterna_staging:staging_secret_changeme@postgres:5432/aeterna_staging" \
  server npx prisma migrate deploy

# ── 5. 시드 실행 ──
echo ""
echo "🌱 [4/5] 스테이징 시드 실행..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" run --rm \
  -e DATABASE_URL="postgresql://aeterna_staging:staging_secret_changeme@postgres:5432/aeterna_staging" \
  server npx ts-node tools/staging/seed.ts

# ── 6. 전체 서비스 시작 ──
echo ""
echo "🚀 [5/5] 전체 서비스 기동..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" up -d

# ── 7. 헬스체크 ──
echo ""
echo "🩺 헬스체크..."
sleep 5

check_service() {
  local name="$1"
  local url="$2"
  if curl -sf "$url" > /dev/null 2>&1; then
    echo "  ✅ $name — 정상"
  else
    echo "  ⚠️  $name — 응답 없음 (잠시 후 재시도 필요)"
  fi
}

check_service "Server (API)" "http://localhost:3001/api/health"
check_service "Client (Web)" "http://localhost:8080/"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ 스테이징 배포 완료"
echo ""
echo "  Server: http://localhost:3001"
echo "  Client: http://localhost:8080"
echo "  DB:     localhost:5433"
echo "  Redis:  localhost:6380"
echo "══════════════════════════════════════════"
