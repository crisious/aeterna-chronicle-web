#!/usr/bin/env bash
# ── 에테르나 크로니클 — 에셋 최적화 스크립트 ──────────────────
# P12-13: CDN + 에셋 최적화
#
# 사용법:
#   ./tools/optimize-assets.sh [INPUT_DIR] [OUTPUT_DIR]
#
# 기본값:
#   INPUT_DIR  = client/public/assets
#   OUTPUT_DIR = client/public/assets-optimized
#
# 의존성:
#   brew install cwebp imagemagick optipng jpegoptim brotli
#   (또는 apt-get install 등)
#
# 동작:
#   1. PNG → WebP 변환 (품질 80)
#   2. JPG/JPEG → WebP 변환 (품질 80)
#   3. PNG 무손실 최적화 (원본 유지용)
#   4. SVG 최소화 (svgo, 있으면)
#   5. 결과 리포트 출력

set -euo pipefail

INPUT_DIR="${1:-client/public/assets}"
OUTPUT_DIR="${2:-client/public/assets-optimized}"

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "══════════════════════════════════════════════"
echo "  에테르나 크로니클 — 에셋 최적화"
echo "══════════════════════════════════════════════"
echo "  입력: ${INPUT_DIR}"
echo "  출력: ${OUTPUT_DIR}"
echo ""

# 출력 디렉터리 생성
mkdir -p "${OUTPUT_DIR}"

# 통계 변수
TOTAL_BEFORE=0
TOTAL_AFTER=0
FILE_COUNT=0
SKIPPED=0

# 도구 확인
check_tool() {
    if command -v "$1" &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "  ${YELLOW}✗${NC} $1 (스킵됨)"
        return 1
    fi
}

echo "도구 확인:"
HAS_CWEBP=0; check_tool cwebp && HAS_CWEBP=1
HAS_OPTIPNG=0; check_tool optipng && HAS_OPTIPNG=1
HAS_JPEGOPTIM=0; check_tool jpegoptim && HAS_JPEGOPTIM=1
HAS_SVGO=0; check_tool svgo && HAS_SVGO=1
echo ""

# 파일 크기 (바이트)
filesize() {
    stat -f%z "$1" 2>/dev/null || stat --format=%s "$1" 2>/dev/null || echo 0
}

human_size() {
    local bytes=$1
    if [ "$bytes" -ge 1048576 ]; then
        echo "$((bytes / 1048576))MB"
    elif [ "$bytes" -ge 1024 ]; then
        echo "$((bytes / 1024))KB"
    else
        echo "${bytes}B"
    fi
}

# ── PNG → WebP ──
if [ "$HAS_CWEBP" -eq 1 ]; then
    echo "PNG → WebP 변환 중..."
    find "${INPUT_DIR}" -type f -iname "*.png" | while read -r f; do
        rel="${f#${INPUT_DIR}/}"
        out="${OUTPUT_DIR}/${rel%.png}.webp"
        mkdir -p "$(dirname "$out")"
        
        before=$(filesize "$f")
        cwebp -q 80 -m 6 "$f" -o "$out" 2>/dev/null
        after=$(filesize "$out")
        
        saving=0
        if [ "$before" -gt 0 ]; then
            saving=$(( (before - after) * 100 / before ))
        fi
        
        echo "  ${rel} → $(human_size "$before") → $(human_size "$after") (${saving}% 감소)"
        FILE_COUNT=$((FILE_COUNT + 1))
    done
fi

# ── JPG → WebP ──
if [ "$HAS_CWEBP" -eq 1 ]; then
    echo "JPG → WebP 변환 중..."
    find "${INPUT_DIR}" -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r f; do
        rel="${f#${INPUT_DIR}/}"
        out="${OUTPUT_DIR}/${rel%.*}.webp"
        mkdir -p "$(dirname "$out")"
        
        before=$(filesize "$f")
        cwebp -q 80 -m 6 "$f" -o "$out" 2>/dev/null
        after=$(filesize "$out")
        
        echo "  ${rel} → $(human_size "$before") → $(human_size "$after")"
        FILE_COUNT=$((FILE_COUNT + 1))
    done
fi

# ── PNG 무손실 최적화 (원본 유지) ──
if [ "$HAS_OPTIPNG" -eq 1 ]; then
    echo "PNG 무손실 최적화 중..."
    find "${INPUT_DIR}" -type f -iname "*.png" | while read -r f; do
        rel="${f#${INPUT_DIR}/}"
        out="${OUTPUT_DIR}/${rel}"
        mkdir -p "$(dirname "$out")"
        cp "$f" "$out"
        optipng -o5 -quiet "$out" 2>/dev/null || true
        echo "  ${rel} 최적화 완료"
    done
fi

# ── SVG 최소화 ──
if [ "$HAS_SVGO" -eq 1 ]; then
    echo "SVG 최소화 중..."
    find "${INPUT_DIR}" -type f -iname "*.svg" | while read -r f; do
        rel="${f#${INPUT_DIR}/}"
        out="${OUTPUT_DIR}/${rel}"
        mkdir -p "$(dirname "$out")"
        svgo -i "$f" -o "$out" --quiet 2>/dev/null || cp "$f" "$out"
        echo "  ${rel} 최소화 완료"
    done
fi

# ── 기타 파일 복사 ──
echo "기타 파일 복사 중..."
find "${INPUT_DIR}" -type f ! \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.svg" \) | while read -r f; do
    rel="${f#${INPUT_DIR}/}"
    out="${OUTPUT_DIR}/${rel}"
    mkdir -p "$(dirname "$out")"
    cp "$f" "$out"
done

# ── 결과 리포트 ──
echo ""
echo "══════════════════════════════════════════════"

BEFORE_TOTAL=$(find "${INPUT_DIR}" -type f -exec stat -f%z {} + 2>/dev/null | paste -sd+ - | bc 2>/dev/null || echo 0)
AFTER_TOTAL=$(find "${OUTPUT_DIR}" -type f -exec stat -f%z {} + 2>/dev/null | paste -sd+ - | bc 2>/dev/null || echo 0)

echo "  원본 총 크기: $(human_size "${BEFORE_TOTAL:-0}")"
echo "  최적화 후:    $(human_size "${AFTER_TOTAL:-0}")"

if [ "${BEFORE_TOTAL:-0}" -gt 0 ] && [ "${AFTER_TOTAL:-0}" -gt 0 ]; then
    REDUCTION=$(( (BEFORE_TOTAL - AFTER_TOTAL) * 100 / BEFORE_TOTAL ))
    echo "  절감:         ${REDUCTION}%"
fi

echo "══════════════════════════════════════════════"
echo -e "${GREEN}완료!${NC}"
