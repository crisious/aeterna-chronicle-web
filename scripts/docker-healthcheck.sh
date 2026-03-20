#!/usr/bin/env bash
# ── 에테르나 크로니클 — Docker 헬스체크 스크립트 ──────────────
# 빌드 → 기동 → 헬스체크 → 결과 보고 → 정리
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
PROJECT="aeterna"
MAX_WAIT=120        # 최대 대기 시간(초)
POLL_INTERVAL=3     # 폴링 간격(초)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

passed=0
failed=0

cleanup() {
    echo ""
    echo -e "${YELLOW}[CLEANUP]${NC} docker compose down..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" down --volumes --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

log_pass() { echo -e "  ${GREEN}✓ PASS${NC}: $1"; ((passed++)); }
log_fail() { echo -e "  ${RED}✗ FAIL${NC}: $1"; ((failed++)); }

# ── Step 1: 빌드 ──
echo -e "${YELLOW}[1/4]${NC} Building Docker images..."
if docker compose -f "$COMPOSE_FILE" -p "$PROJECT" build --no-cache; then
    log_pass "Docker images built"
else
    log_fail "Docker image build failed"
    exit 1
fi

# ── Step 2: 기동 ──
echo -e "${YELLOW}[2/4]${NC} Starting services..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT" up -d

# ── Step 3: 헬스체크 대기 ──
echo -e "${YELLOW}[3/4]${NC} Waiting for services to become healthy (max ${MAX_WAIT}s)..."

wait_for_healthy() {
    local service="$1"
    local elapsed=0
    while [ $elapsed -lt $MAX_WAIT ]; do
        local health
        health=$(docker inspect --format='{{.State.Health.Status}}' "${PROJECT}-${service}" 2>/dev/null || echo "missing")
        if [ "$health" = "healthy" ]; then
            return 0
        fi
        sleep "$POLL_INTERVAL"
        elapsed=$((elapsed + POLL_INTERVAL))
    done
    return 1
}

# postgres와 redis 헬스체크 대기
for svc in postgres redis; do
    if wait_for_healthy "$svc"; then
        log_pass "$svc healthy"
    else
        log_fail "$svc not healthy after ${MAX_WAIT}s"
    fi
done

# server 헬스체크 대기 (Dockerfile HEALTHCHECK 사용)
if wait_for_healthy "server"; then
    log_pass "server container healthy"
else
    log_fail "server container not healthy after ${MAX_WAIT}s"
    echo "  Server logs:"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" logs server --tail=30
fi

# client 헬스체크 대기
if wait_for_healthy "client"; then
    log_pass "client container healthy"
else
    log_fail "client container not healthy after ${MAX_WAIT}s"
    echo "  Client logs:"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" logs client --tail=30
fi

# ── Step 4: HTTP 엔드포인트 검증 ──
echo -e "${YELLOW}[4/4]${NC} Verifying HTTP endpoints..."

# Server /api/health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_pass "GET /api/health → 200"
else
    log_fail "GET /api/health → $HTTP_CODE (expected 200)"
fi

# Client / (nginx)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:80/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_pass "GET / (client) → 200"
else
    log_fail "GET / (client) → $HTTP_CODE (expected 200)"
fi

# Client → Server proxy (/api/health via nginx)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:80/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_pass "GET /api/health via nginx proxy → 200"
else
    log_fail "GET /api/health via nginx proxy → $HTTP_CODE (expected 200)"
fi

# ── 결과 요약 ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed${NC}: $passed"
echo -e "  ${RED}Failed${NC}: $failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$failed" -gt 0 ]; then
    echo -e "${RED}RESULT: FAIL${NC}"
    exit 1
else
    echo -e "${GREEN}RESULT: ALL PASS${NC}"
    exit 0
fi
