#!/usr/bin/env bash
# ── PostgreSQL 자동 백업 스크립트 — P7-18 ────────────────────
# pg_dump + gzip + S3 업로드 + 로컬 보관 (7일) + Slack 알림
#
# 크론 설정 예시:
#   0 3 * * * /path/to/tools/backup/pg_backup.sh >> /var/log/aeterna-backup.log 2>&1
#
# 환경변수:
#   POSTGRES_HOST     — DB 호스트 (기본: localhost)
#   POSTGRES_PORT     — DB 포트 (기본: 5432)
#   POSTGRES_DB       — DB 이름 (기본: aeterna)
#   POSTGRES_USER     — DB 사용자 (기본: aeterna)
#   PGPASSWORD        — DB 비밀번호 (pg_dump용)
#   BACKUP_S3_BUCKET  — S3 버킷 (기본: aeterna-backups)
#   BACKUP_S3_PREFIX  — S3 경로 프리픽스 (기본: pg-backups)
#   BACKUP_LOCAL_DIR  — 로컬 백업 디렉터리 (기본: /tmp/aeterna-backups)
#   BACKUP_RETENTION  — 로컬 보관 일수 (기본: 7)
#   BACKUP_WEBHOOK    — Slack/Discord 웹훅 URL (선택)

set -euo pipefail

# ── 설정 ─────────────────────────────────────────────────────

PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_DB="${POSTGRES_DB:-aeterna}"
PG_USER="${POSTGRES_USER:-aeterna}"
S3_BUCKET="${BACKUP_S3_BUCKET:-aeterna-backups}"
S3_PREFIX="${BACKUP_S3_PREFIX:-pg-backups}"
LOCAL_DIR="${BACKUP_LOCAL_DIR:-/tmp/aeterna-backups}"
RETENTION="${BACKUP_RETENTION:-7}"
WEBHOOK="${BACKUP_WEBHOOK:-}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="${PG_DB}_${TIMESTAMP}.sql.gz"
LOCAL_PATH="${LOCAL_DIR}/${FILENAME}"

# ── 시작 ─────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PostgreSQL 백업 시작"
echo "  시각: $(date -Iseconds)"
echo "  대상: ${PG_HOST}:${PG_PORT}/${PG_DB}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 로컬 디렉터리 생성
mkdir -p "${LOCAL_DIR}"

# ── pg_dump + gzip ───────────────────────────────────────────

echo "📦 pg_dump 실행 중..."
START_TIME=$(date +%s)

pg_dump \
  -h "${PG_HOST}" \
  -p "${PG_PORT}" \
  -U "${PG_USER}" \
  -d "${PG_DB}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --verbose \
  2>/dev/null | gzip > "${LOCAL_PATH}"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
FILE_SIZE=$(du -h "${LOCAL_PATH}" | cut -f1)

echo "✅ 덤프 완료: ${FILENAME} (${FILE_SIZE}, ${DURATION}초)"

# ── S3 업로드 ────────────────────────────────────────────────

echo "☁️  S3 업로드 중..."
if command -v aws &> /dev/null; then
  aws s3 cp "${LOCAL_PATH}" "s3://${S3_BUCKET}/${S3_PREFIX}/${FILENAME}" \
    --storage-class STANDARD_IA \
    --no-cli-pager 2>/dev/null

  echo "✅ S3 업로드 완료: s3://${S3_BUCKET}/${S3_PREFIX}/${FILENAME}"
else
  echo "⚠ aws CLI 미설치 — S3 업로드 스킵 (로컬 백업만 보관)"
fi

# ── 로컬 정리 (보관 기간 초과분 삭제) ────────────────────────

echo "🧹 로컬 정리 중 (${RETENTION}일 초과 삭제)..."
find "${LOCAL_DIR}" -name "*.sql.gz" -mtime "+${RETENTION}" -delete 2>/dev/null || true
REMAINING=$(find "${LOCAL_DIR}" -name "*.sql.gz" | wc -l | tr -d ' ')
echo "   로컬 보관 파일: ${REMAINING}개"

# ── S3 수명 주기 (90일 후 Glacier, 365일 후 삭제 권장) ────
# S3 Lifecycle Policy는 AWS 콘솔/Terraform에서 별도 설정

# ── 웹훅 알림 ────────────────────────────────────────────────

if [ -n "${WEBHOOK}" ]; then
  PAYLOAD=$(cat <<EOF
{
  "text": "✅ **DB 백업 완료**\n📦 \`${FILENAME}\` (${FILE_SIZE})\n⏱ ${DURATION}초\n🪣 s3://${S3_BUCKET}/${S3_PREFIX}/"
}
EOF
)
  curl -s -X POST "${WEBHOOK}" \
    -H 'Content-Type: application/json' \
    -d "${PAYLOAD}" > /dev/null 2>&1 || true
fi

# ── 완료 ─────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 백업 완료"
echo "  파일: ${FILENAME} (${FILE_SIZE})"
echo "  소요: ${DURATION}초"
echo "  보관: 로컬 ${RETENTION}일 + S3"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
