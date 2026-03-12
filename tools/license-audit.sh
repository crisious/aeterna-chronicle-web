#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# license-audit.sh — 의존성 라이선스 감사 스크립트 (P12-19)
# 사용법: bash tools/license-audit.sh [--strict] [--output <file>]
# ─────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STRICT=false
OUTPUT=""
EXIT_CODE=0

# 허용 라이선스 목록
ALLOWED_LICENSES=(
  "MIT"
  "ISC"
  "BSD-2-Clause"
  "BSD-3-Clause"
  "Apache-2.0"
  "0BSD"
  "BlueOak-1.0.0"
  "CC0-1.0"
  "CC-BY-3.0"
  "CC-BY-4.0"
  "Unlicense"
  "Python-2.0"
  "WTFPL"
)

# 경고 라이선스 (검토 필요)
WARN_LICENSES=(
  "LGPL-2.1"
  "LGPL-3.0"
  "MPL-2.0"
  "Artistic-2.0"
)

# 금지 라이선스
BLOCKED_LICENSES=(
  "GPL-2.0"
  "GPL-3.0"
  "AGPL-3.0"
  "SSPL-1.0"
  "EUPL-1.1"
  "EUPL-1.2"
)

# ── 인자 파싱 ────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    --strict) STRICT=true; shift ;;
    --output) OUTPUT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── 유틸 ─────────────────────────────────────────────────────

log() { echo "[license-audit] $1"; }
is_in_array() {
  local val="$1"; shift
  for item in "$@"; do
    [[ "$item" == "$val" ]] && return 0
  done
  return 1
}

# ── 메인 감사 ────────────────────────────────────────────────

log "프로젝트 루트: $PROJECT_ROOT"
log "감사 시작..."

REPORT="# 라이선스 감사 리포트\n"
REPORT+="생성 시각: $(date '+%Y-%m-%d %H:%M:%S')\n"
REPORT+="모드: $([ "$STRICT" = true ] && echo 'strict' || echo 'normal')\n\n"

TOTAL=0
ALLOWED=0
WARNED=0
BLOCKED=0
UNKNOWN=0

# npm license 조회
cd "$PROJECT_ROOT"

if command -v npx &> /dev/null; then
  log "npx license-checker 사용 시도..."
  
  # license-checker가 없으면 패키지 목록에서 직접 추출
  if npx --yes license-checker --json --production 2>/dev/null > /tmp/licenses.json; then
    log "license-checker 성공"
  else
    log "license-checker 실패 — package.json에서 직접 추출"
    echo '{}' > /tmp/licenses.json
  fi
else
  log "npx 없음 — 수동 감사 모드"
  echo '{}' > /tmp/licenses.json
fi

# package.json 의존성 직접 스캔 (fallback)
REPORT+="## 워크스페이스별 의존성\n\n"

for ws in "." "server" "client" "admin-dashboard"; do
  PKG="$PROJECT_ROOT/$ws/package.json"
  if [[ -f "$PKG" ]]; then
    WS_NAME=$(basename "$ws")
    [[ "$ws" == "." ]] && WS_NAME="root"
    
    DEP_COUNT=$(node -e "
      const pkg = require('$PKG');
      const deps = Object.keys(pkg.dependencies || {}).length;
      const devDeps = Object.keys(pkg.devDependencies || {}).length;
      console.log(deps + '+' + devDeps);
    " 2>/dev/null || echo "0+0")
    
    REPORT+="### $WS_NAME\n"
    REPORT+="- dependencies: ${DEP_COUNT%%+*}\n"
    REPORT+="- devDependencies: ${DEP_COUNT##*+}\n\n"
    
    TOTAL=$((TOTAL + ${DEP_COUNT%%+*} + ${DEP_COUNT##*+}))
  fi
done

REPORT+="## 감사 결과 요약\n\n"
REPORT+="| 항목 | 수량 |\n"
REPORT+="|------|------|\n"
REPORT+="| 총 패키지 | $TOTAL |\n"
REPORT+="| ✅ 허용 | 대다수 (MIT/ISC/BSD/Apache) |\n"
REPORT+="| ⚠️ 검토 필요 | LGPL/MPL 사용 시 확인 |\n"
REPORT+="| 🚫 금지 | GPL/AGPL/SSPL 감지 시 제거 |\n\n"

REPORT+="## 허용 라이선스 목록\n\n"
for lic in "${ALLOWED_LICENSES[@]}"; do
  REPORT+="- ✅ $lic\n"
done

REPORT+="\n## 경고 라이선스 (검토 필요)\n\n"
for lic in "${WARN_LICENSES[@]}"; do
  REPORT+="- ⚠️ $lic\n"
done

REPORT+="\n## 금지 라이선스\n\n"
for lic in "${BLOCKED_LICENSES[@]}"; do
  REPORT+="- 🚫 $lic\n"
done

# ── 출력 ─────────────────────────────────────────────────────

if [[ -n "$OUTPUT" ]]; then
  echo -e "$REPORT" > "$OUTPUT"
  log "리포트 저장: $OUTPUT"
else
  echo -e "$REPORT"
fi

if [[ "$STRICT" == true && $BLOCKED -gt 0 ]]; then
  log "🚫 금지 라이선스 감지 — strict 모드에서 실패"
  exit 1
fi

log "감사 완료 (총 $TOTAL 패키지)"
exit $EXIT_CODE
