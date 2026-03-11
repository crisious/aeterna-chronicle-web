#!/usr/bin/env bash
# ─── DB 마이그레이션 자동화 (P6-17) ────────────────────────────
# Prisma migrate deploy + 사전 백업 + 무중단 검증
# 사용법: ./migrate.sh [--skip-backup] [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"

SKIP_BACKUP=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --skip-backup) SKIP_BACKUP=true ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

echo "══════════════════════════════════════════════"
echo " DB 마이그레이션 — 프로덕션"
echo " 시각: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "══════════════════════════════════════════════"

# 1) 환경 변수 검증
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL 환경변수 미설정"
  exit 1
fi

# 2) 마이그레이션 전 자동 백업
if [ "${SKIP_BACKUP}" = false ]; then
  echo ""
  echo "▶ 마이그레이션 전 자동 백업..."
  "${SCRIPT_DIR}/backup.sh" --tag "pre-migrate-$(date +%Y%m%d%H%M%S)"
  echo "✅ 백업 완료"
fi

# 3) 보류 중인 마이그레이션 확인
echo ""
echo "▶ 보류 중인 마이그레이션 확인..."
cd "${SERVER_DIR}"
PENDING=$(npx prisma migrate status 2>&1 || true)
echo "${PENDING}"

if echo "${PENDING}" | grep -q "No pending migrations"; then
  echo "ℹ️  보류 중인 마이그레이션 없음 — 종료"
  exit 0
fi

# 4) 무중단 마이그레이션 사전 검증
# ALTER TABLE 시 ACCESS EXCLUSIVE lock 여부 확인
echo ""
echo "▶ 무중단 마이그레이션 검증..."
MIGRATION_DIR="${SERVER_DIR}/prisma/migrations"
LATEST_MIGRATION=$(ls -t "${MIGRATION_DIR}" 2>/dev/null | head -1)

if [ -n "${LATEST_MIGRATION}" ] && [ -f "${MIGRATION_DIR}/${LATEST_MIGRATION}/migration.sql" ]; then
  SQL_FILE="${MIGRATION_DIR}/${LATEST_MIGRATION}/migration.sql"
  
  # 위험한 DDL 패턴 검사
  DANGEROUS_PATTERNS="DROP TABLE|DROP COLUMN|ALTER COLUMN.*TYPE|RENAME TABLE"
  if grep -iE "${DANGEROUS_PATTERNS}" "${SQL_FILE}" 2>/dev/null; then
    echo "⚠️  경고: 위험한 DDL 감지 — 잠금(lock) 발생 가능"
    echo "  파일: ${SQL_FILE}"
    echo "  수동 확인 후 --skip-check 옵션으로 재실행하세요"
    if [ "${DRY_RUN}" = false ]; then
      echo "  (dry-run이 아니므로 중단)"
      exit 1
    fi
  else
    echo "✅ 위험한 DDL 패턴 미감지"
  fi
fi

# 5) 마이그레이션 실행
if [ "${DRY_RUN}" = true ]; then
  echo ""
  echo "ℹ️  Dry-run 모드 — 실행 없이 종료"
  exit 0
fi

echo ""
echo "▶ Prisma migrate deploy 실행..."
cd "${SERVER_DIR}"
npx prisma migrate deploy

echo ""
echo "▶ Prisma client 재생성..."
npx prisma generate

echo ""
echo "══════════════════════════════════════════════"
echo " ✅ 마이그레이션 완료"
echo " 시각: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "══════════════════════════════════════════════"

# 6) 롤백 가이드
echo ""
echo "📖 롤백이 필요한 경우:"
echo "  1. 백업 복원: ./restore.sh --latest"
echo "  2. 수동 롤백 SQL: ${MIGRATION_DIR}/${LATEST_MIGRATION}/migration.sql 참조"
echo "  3. Prisma migrate resolve --rolled-back <마이그레이션명>"
