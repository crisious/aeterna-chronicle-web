#!/usr/bin/env bash
# ─── DB 백업 스크립트 (P6-17) ──────────────────────────────────
# pg_dump + S3 업로드 + 보존 정책 (7일 daily + 4주 weekly)
# 사용법: ./backup.sh [--tag <태그>] [--weekly]

set -euo pipefail

TAG=""
WEEKLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    --weekly) WEEKLY=true; shift ;;
    *) shift ;;
  esac
done

# 환경 변수
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-etherna_prod}"
DB_USER="${DB_USER:-etherna}"
S3_BUCKET="${AWS_S3_BACKUP_BUCKET:-etherna-db-backups}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"

TIMESTAMP=$(date -u '+%Y%m%d_%H%M%S')
FILENAME="etherna_${TIMESTAMP}"
[ -n "${TAG}" ] && FILENAME="etherna_${TAG}_${TIMESTAMP}"
FILENAME="${FILENAME}.sql.gz"

LOCAL_DIR="/tmp/etherna-backups"
mkdir -p "${LOCAL_DIR}"
LOCAL_PATH="${LOCAL_DIR}/${FILENAME}"

echo "══════════════════════════════════════════════"
echo " DB 백업"
echo " 시각: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo " 대상: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "══════════════════════════════════════════════"

# 1) pg_dump
echo ""
echo "▶ pg_dump 실행..."
PGPASSWORD="${PGPASSWORD:-}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip > "${LOCAL_PATH}"

SIZE=$(du -h "${LOCAL_PATH}" | cut -f1)
echo "✅ 덤프 완료: ${FILENAME} (${SIZE})"

# 2) S3 업로드
S3_PREFIX="daily"
[ "${WEEKLY}" = true ] && S3_PREFIX="weekly"

echo ""
echo "▶ S3 업로드: s3://${S3_BUCKET}/${S3_PREFIX}/${FILENAME}"
aws s3 cp "${LOCAL_PATH}" "s3://${S3_BUCKET}/${S3_PREFIX}/${FILENAME}" \
  --region "${AWS_REGION}" \
  --storage-class STANDARD_IA

echo "✅ S3 업로드 완료"

# 3) 보존 정책 적용
echo ""
echo "▶ 보존 정책 적용..."

# Daily: 7일 이전 삭제
if [ "${S3_PREFIX}" = "daily" ]; then
  CUTOFF=$(date -u -v-7d '+%Y%m%d' 2>/dev/null || date -u -d '7 days ago' '+%Y%m%d')
  echo "  Daily 보존: 7일 (${CUTOFF} 이전 삭제)"
  aws s3 ls "s3://${S3_BUCKET}/daily/" --region "${AWS_REGION}" | while read -r line; do
    FILE=$(echo "${line}" | awk '{print $4}')
    FILE_DATE=$(echo "${FILE}" | grep -oE '[0-9]{8}' | head -1)
    if [ -n "${FILE_DATE}" ] && [ "${FILE_DATE}" -lt "${CUTOFF}" ]; then
      echo "    삭제: ${FILE}"
      aws s3 rm "s3://${S3_BUCKET}/daily/${FILE}" --region "${AWS_REGION}"
    fi
  done
fi

# Weekly: 4주(28일) 이전 삭제
if [ "${WEEKLY}" = true ]; then
  CUTOFF=$(date -u -v-28d '+%Y%m%d' 2>/dev/null || date -u -d '28 days ago' '+%Y%m%d')
  echo "  Weekly 보존: 28일 (${CUTOFF} 이전 삭제)"
  aws s3 ls "s3://${S3_BUCKET}/weekly/" --region "${AWS_REGION}" | while read -r line; do
    FILE=$(echo "${line}" | awk '{print $4}')
    FILE_DATE=$(echo "${FILE}" | grep -oE '[0-9]{8}' | head -1)
    if [ -n "${FILE_DATE}" ] && [ "${FILE_DATE}" -lt "${CUTOFF}" ]; then
      echo "    삭제: ${FILE}"
      aws s3 rm "s3://${S3_BUCKET}/weekly/${FILE}" --region "${AWS_REGION}"
    fi
  done
fi

# 4) 로컬 임시 파일 정리
rm -f "${LOCAL_PATH}"

echo ""
echo "══════════════════════════════════════════════"
echo " ✅ 백업 완료: ${FILENAME}"
echo "══════════════════════════════════════════════"
