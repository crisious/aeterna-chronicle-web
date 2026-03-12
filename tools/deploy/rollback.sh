#!/usr/bin/env bash

set -euo pipefail

TAG="${1:?Usage: ./rollback.sh <tag> [namespace]}"
NAMESPACE="${2:-etherna-production}"
REGISTRY="ghcr.io"
DEFAULT_REPOSITORY="$(git config --get remote.origin.url | sed -E 's#(https://github.com/|git@github.com:)([^/]+/[^/.]+)(\.git)?#\2#')"
IMAGE_NAME="${IMAGE_NAME:-${DEFAULT_REPOSITORY}/etherna-server}"
IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "Rolling back production deployment"
echo "Tag: ${TAG}"
echo "Namespace: ${NAMESPACE}"
echo "Image: ${IMAGE}"

echo
echo "Current green image:"
kubectl get deployment server-green -n "${NAMESPACE}" \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
echo

echo
echo "Applying rollback image"
kubectl set image deployment/server-green \
  "server=${IMAGE}" \
  -n "${NAMESPACE}"

echo
echo "Waiting for rollout"
kubectl rollout status deployment/server-green \
  -n "${NAMESPACE}" --timeout=300s

echo
echo "Running health checks"
GREEN_SVC="$(kubectl get svc server-green -n "${NAMESPACE}" -o jsonpath='{.spec.clusterIP}')"

for i in $(seq 1 10); do
  STATUS="$(curl -sf "http://${GREEN_SVC}:3000/api/health" | jq -r '.status' 2>/dev/null || echo "fail")"
  if [ "${STATUS}" = "ok" ]; then
    echo "Rollback health check passed (${i}/10)"
    exit 0
  fi

  if [ "${i}" -eq 10 ]; then
    echo "Rollback health check failed"
    exit 1
  fi

  echo "Retrying rollback health check ${i}/10"
  sleep 10
done
