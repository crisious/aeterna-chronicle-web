#!/bin/bash
# ── 에테르나 크로니클 — 스테이징 리셋 스크립트 ───────────────
# DB 초기화 + 시드 재실행
# 사용법: bash tools/staging/reset.sh
set -euo pipefail

COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
PROJECT="aeterna-staging"
DB_URL="postgresql://aeterna_staging:staging_secret_changeme@postgres:5432/aeterna_staging"

echo "══════════════════════════════════════════"
echo "  에테르나 크로니클 — 스테이징 리셋"
echo "══════════════════════════════════════════"
echo ""
echo "⚠️  경고: 스테이징 DB의 모든 데이터가 삭제됩니다."
read -p "  계속하시겠습니까? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "  취소됨."
  exit 0
fi

# ── 1. DB 초기화 (볼륨 삭제 + 재생성) ──
echo ""
echo "🗑️  [1/4] DB 볼륨 삭제..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT" down -v 2>/dev/null || true

# ── 2. DB + Redis 재기동 ──
echo ""
echo "🗄️  [2/4] 데이터베이스 + Redis 재기동..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" up -d postgres redis

echo "  ⏳ PostgreSQL 헬스체크 대기..."
until docker compose -f "$COMPOSE_FILE" -p "$PROJECT" exec -T postgres pg_isready -U aeterna_staging 2>/dev/null; do
  sleep 2
done
echo "  ✅ PostgreSQL 준비 완료"

# ── 3. 마이그레이션 재실행 ──
echo ""
echo "📐 [3/4] Prisma 마이그레이션 재실행..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" run --rm \
  -e DATABASE_URL="$DB_URL" \
  server npx prisma migrate deploy

# ── 4. 시드 재실행 ──
echo ""
echo "🌱 [4/4] 시드 재실행..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" run --rm \
  -e DATABASE_URL="$DB_URL" \
  server npx ts-node tools/staging/seed.ts

# ── 5. 전체 서비스 재기동 ──
echo ""
echo "🚀 서비스 재기동..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" up -d

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ 스테이징 리셋 완료"
echo "══════════════════════════════════════════"
