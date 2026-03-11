#!/usr/bin/env bash
# ─── 프로덕션 롤백 스크립트 (P6-16) ────────────────────────────
# 사용법: ./rollback.sh <이전_태그> [네임스페이스]
# 예: ./rollback.sh v1.2.3

set -euo pipefail

TAG="${1:?사용법: ./rollback.sh <태그> [네임스페이스]}"
NAMESPACE="${2:-etherna-production}"
REGISTRY="ghcr.io"
IMAGE_NAME="etherna/etherna-server"
IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "══════════════════════════════════════════════"
echo " 프로덕션 롤백"
echo " 대상 태그: ${TAG}"
echo " 네임스페이스: ${NAMESPACE}"
echo "══════════════════════════════════════════════"

# 1) 현재 배포 상태 확인
echo ""
echo "▶ 현재 Green 이미지:"
kubectl get deployment server-green -n "${NAMESPACE}" \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
echo ""

# 2) 롤백 이미지 적용
echo ""
echo "▶ 롤백 이미지 적용: ${IMAGE}"
kubectl set image deployment/server-green \
  "server=${IMAGE}" \
  -n "${NAMESPACE}"

# 3) 롤아웃 상태 대기
echo ""
echo "▶ 롤아웃 대기 (최대 300초)..."
kubectl rollout status deployment/server-green \
  -n "${NAMESPACE}" --timeout=300s

# 4) 헬스체크
echo ""
echo "▶ 헬스체크..."
GREEN_SVC=$(kubectl get svc server-green -n "${NAMESPACE}" \
  -o jsonpath='{.spec.clusterIP}')

for i in $(seq 1 10); do
  STATUS=$(curl -sf "http://${GREEN_SVC}:3000/health" \
    | jq -r '.status' 2>/dev/null || echo "fail")
  if [ "${STATUS}" = "ok" ]; then
    echo "✅ 롤백 헬스체크 통과 (${i}/10)"
    break
  fi
  if [ "${i}" -eq 10 ]; then
    echo "❌ 롤백 헬스체크 실패 — 수동 확인 필요"
    exit 1
  fi
  echo "  재시도 ${i}/10..."
  sleep 10
done

echo ""
echo "══════════════════════════════════════════════"
echo " ✅ 롤백 완료: ${TAG}"
echo "══════════════════════════════════════════════"
