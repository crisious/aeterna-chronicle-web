#!/usr/bin/env bash
# ─── DB 복원 스크립트 (P6-17) ──────────────────────────────────
# S3에서 백업 다운로드 + pg_restore
# 사용법: ./restore.sh --file <파일명> | --latest [--prefix daily|weekly]

set -euo pipefail

FILE=""
LATEST=false
PREFIX="daily"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --latest) LATEST=true; shift ;;
    --prefix) PREFIX="$2"; shift 2 ;;
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

LOCAL_DIR="/tmp/etherna-backups"
mkdir -p "${LOCAL_DIR}"

echo "══════════════════════════════════════════════"
echo " DB 복원"
echo " 시각: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo " 대상: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "══════════════════════════════════════════════"

# 1) 파일 결정
if [ "${LATEST}" = true ]; then
  echo ""
  echo "▶ 최신 백업 검색 (${PREFIX})..."
  FILE=$(aws s3 ls "s3://${S3_BUCKET}/${PREFIX}/" --region "${AWS_REGION}" \
    | sort | tail -1 | awk '{print $4}')
  if [ -z "${FILE}" ]; then
    echo "❌ 백업 파일 없음: s3://${S3_BUCKET}/${PREFIX}/"
    exit 1
  fi
  echo "  최신 파일: ${FILE}"
fi

if [ -z "${FILE}" ]; then
  echo "❌ --file <파일명> 또는 --latest 옵션 필요"
  exit 1
fi

# 2) S3 다운로드
S3_PATH="s3://${S3_BUCKET}/${PREFIX}/${FILE}"
LOCAL_PATH="${LOCAL_DIR}/${FILE}"

echo ""
echo "▶ S3 다운로드: ${S3_PATH}"
aws s3 cp "${S3_PATH}" "${LOCAL_PATH}" --region "${AWS_REGION}"
echo "✅ 다운로드 완료"

# 3) 복원 전 확인
echo ""
echo "⚠️  경고: ${DB_NAME} 데이터베이스를 백업으로 덮어씁니다."
echo "  계속하려면 'yes'를 입력하세요:"
read -r CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "취소됨"
  rm -f "${LOCAL_PATH}"
  exit 0
fi

# 4) 복원 실행
echo ""
echo "▶ pg_restore 실행..."
gunzip -c "${LOCAL_PATH}" | PGPASSWORD="${PGPASSWORD:-}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --single-transaction

echo "✅ 복원 완료"

# 5) 정리
rm -f "${LOCAL_PATH}"

echo ""
echo "══════════════════════════════════════════════"
echo " ✅ DB 복원 완료: ${FILE}"
echo " ⚠️  Prisma migrate 상태 확인 필요:"
echo "    cd server && npx prisma migrate status"
echo "══════════════════════════════════════════════"
