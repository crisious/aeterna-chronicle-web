#!/usr/bin/env bash
# ── CDN 에셋 배포 스크립트 — P7-17 ──────────────────────────
# S3/R2 버킷으로 정적 에셋 업로드 + CloudFront 캐시 무효화
#
# 사용: ./tools/deploy/cdn-deploy.sh [version]
# 예:   ./tools/deploy/cdn-deploy.sh v1.2.0
#
# 환경변수:
#   CDN_BUCKET           — S3/R2 버킷명 (기본: aeterna-assets)
#   CDN_DISTRIBUTION_ID  — CloudFront 디스트리뷰션 ID
#   AWS_PROFILE          — AWS CLI 프로파일 (기본: default)

set -euo pipefail

VERSION="${1:-v1}"
BUCKET="${CDN_BUCKET:-aeterna-assets}"
DIST_ID="${CDN_DISTRIBUTION_ID:-}"
PROFILE="${AWS_PROFILE:-default}"
SOURCE_DIR="dist/assets"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CDN 에셋 배포 — ${VERSION}"
echo "  버킷: s3://${BUCKET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 빌드 디렉터리 확인
if [ ! -d "${SOURCE_DIR}" ]; then
  echo "⚠ ${SOURCE_DIR} 디렉터리 없음 — 먼저 빌드 실행 필요"
  echo "  npm run build (client)"
  exit 1
fi

# 이미지/스프라이트 (30일 캐시)
echo "📦 이미지/스프라이트 업로드..."
aws s3 sync "${SOURCE_DIR}/images/" "s3://${BUCKET}/${VERSION}/assets/images/" \
  --profile "${PROFILE}" \
  --cache-control "public, max-age=2592000, immutable" \
  --content-type "image/*" \
  --delete 2>/dev/null || true

aws s3 sync "${SOURCE_DIR}/sprites/" "s3://${BUCKET}/${VERSION}/assets/sprites/" \
  --profile "${PROFILE}" \
  --cache-control "public, max-age=2592000, immutable" \
  --delete 2>/dev/null || true

# 사운드 (30일 캐시)
echo "🔊 사운드 업로드..."
aws s3 sync "${SOURCE_DIR}/sounds/" "s3://${BUCKET}/${VERSION}/assets/sounds/" \
  --profile "${PROFILE}" \
  --cache-control "public, max-age=2592000, immutable" \
  --delete 2>/dev/null || true

# 폰트 (1년 캐시, immutable)
echo "🔤 폰트 업로드..."
aws s3 sync "${SOURCE_DIR}/fonts/" "s3://${BUCKET}/${VERSION}/assets/fonts/" \
  --profile "${PROFILE}" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete 2>/dev/null || true

# CloudFront 캐시 무효화
if [ -n "${DIST_ID}" ]; then
  echo "🌐 CloudFront 캐시 무효화..."
  aws cloudfront create-invalidation \
    --distribution-id "${DIST_ID}" \
    --paths "/${VERSION}/*" \
    --profile "${PROFILE}" \
    --no-cli-pager
  echo "✅ CloudFront 무효화 요청 완료"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ CDN 배포 완료"
echo "  버전: ${VERSION}"
echo "  URL:  https://\${CDN_BASE_URL}/${VERSION}/assets/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
