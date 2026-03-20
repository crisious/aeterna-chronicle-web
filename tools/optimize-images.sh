#!/usr/bin/env bash
# ── 에테르나 크로니클 — 이미지 WebP 최적화 (ffmpeg) ─────────────
# generated/ 디렉터리의 대형 PNG를 WebP로 변환
#
# 사용법:
#   ./tools/optimize-images.sh              # 실제 변환
#   ./tools/optimize-images.sh --dry-run    # 절감 예상만 출력
#
# 의존성: ffmpeg (/opt/homebrew/bin/ffmpeg)
# 원본 파일은 삭제하지 않습니다.

set -euo pipefail

# ── 설정 ──────────────────────────────────────────────────────────
FFMPEG="/opt/homebrew/bin/ffmpeg"
ASSET_DIR="client/public/assets/generated"
MANIFEST="tools/webp-manifest.json"
QUALITY=80
SIZE_THRESHOLD=102400  # 100KB in bytes
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

# ── 색상 ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 유틸리티 ──────────────────────────────────────────────────────
filesize() {
    stat -f%z "$1" 2>/dev/null || stat --format=%s "$1" 2>/dev/null || echo 0
}

human_size() {
    local bytes=$1
    if [ "$bytes" -ge 1073741824 ]; then
        printf "%.1fGB" "$(echo "$bytes / 1073741824" | bc -l)"
    elif [ "$bytes" -ge 1048576 ]; then
        printf "%.1fMB" "$(echo "$bytes / 1048576" | bc -l)"
    elif [ "$bytes" -ge 1024 ]; then
        printf "%.1fKB" "$(echo "$bytes / 1024" | bc -l)"
    else
        echo "${bytes}B"
    fi
}

# ── 사전 검사 ─────────────────────────────────────────────────────
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  에테르나 크로니클 — 이미지 WebP 최적화${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"

if [[ "$DRY_RUN" == true ]]; then
    echo -e "  모드: ${YELLOW}DRY-RUN (변환 없음, 예상만 출력)${NC}"
else
    echo -e "  모드: ${GREEN}실제 변환${NC}"
fi

if [[ ! -x "$FFMPEG" ]]; then
    echo -e "${RED}오류: ffmpeg를 찾을 수 없습니다 ($FFMPEG)${NC}"
    exit 1
fi
echo -e "  ffmpeg: ${GREEN}✓${NC} $($FFMPEG -version 2>&1 | head -1)"

if [[ ! -d "$ASSET_DIR" ]]; then
    echo -e "${RED}오류: 에셋 디렉터리를 찾을 수 없습니다 ($ASSET_DIR)${NC}"
    exit 1
fi
echo -e "  대상: ${ASSET_DIR}"
echo -e "  품질: ${QUALITY}"
echo -e "  임계값: >100KB"
echo ""

# ── 파일 수집 ─────────────────────────────────────────────────────
TOTAL_ORIGINAL=0
TOTAL_WEBP=0
CONVERTED=0
SKIPPED=0
ERRORS=0

# 매니페스트를 위한 JSON 항목 배열
declare -a MANIFEST_ENTRIES

echo -e "${CYAN}PNG 파일 스캔 중...${NC}"

PNG_FILES=()
while IFS= read -r -d '' f; do
    PNG_FILES+=("$f")
done < <(find -L "$ASSET_DIR" -type f -iname "*.png" -print0 | sort -z)

TOTAL_FILES=${#PNG_FILES[@]}
echo -e "  총 PNG 파일: ${TOTAL_FILES}개"
echo ""

# ── 변환 루프 ─────────────────────────────────────────────────────
echo -e "${CYAN}변환 시작...${NC}"
echo ""

for f in "${PNG_FILES[@]}"; do
    size=$(filesize "$f")
    TOTAL_ORIGINAL=$((TOTAL_ORIGINAL + size))

    # 100KB 이하는 스킵
    if [ "$size" -lt "$SIZE_THRESHOLD" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # WebP 출력 경로 (원본 옆에 .webp 확장자)
    webp_path="${f%.png}.webp"
    rel_original="${f}"
    rel_webp="${webp_path}"

    if [[ "$DRY_RUN" == true ]]; then
        # dry-run: ffmpeg 없이 예상 절감율 ~60% 추정
        estimated_webp=$((size * 40 / 100))
        TOTAL_WEBP=$((TOTAL_WEBP + estimated_webp))
        saving=$(( (size - estimated_webp) * 100 / size ))

        MANIFEST_ENTRIES+=("{\"original\":\"${rel_original}\",\"webp\":\"${rel_webp}\",\"originalSize\":${size},\"webpSize\":${estimated_webp}}")
        CONVERTED=$((CONVERTED + 1))

        if (( CONVERTED % 100 == 0 )); then
            echo -e "  ${CONVERTED}/${TOTAL_FILES} 처리 중..."
        fi
    else
        # 이미 변환된 파일은 스킵
        if [[ -f "$webp_path" ]]; then
            webp_size=$(filesize "$webp_path")
            TOTAL_WEBP=$((TOTAL_WEBP + webp_size))
            MANIFEST_ENTRIES+=("{\"original\":\"${rel_original}\",\"webp\":\"${rel_webp}\",\"originalSize\":${size},\"webpSize\":${webp_size}}")
            CONVERTED=$((CONVERTED + 1))
            continue
        fi

        # ffmpeg 변환: PNG → WebP (quality 80)
        if "$FFMPEG" -y -i "$f" -c:v libwebp -quality "$QUALITY" -lossless 0 "$webp_path" -loglevel error 2>/dev/null; then
            webp_size=$(filesize "$webp_path")
            TOTAL_WEBP=$((TOTAL_WEBP + webp_size))

            saving=0
            if [ "$size" -gt 0 ]; then
                saving=$(( (size - webp_size) * 100 / size ))
            fi

            MANIFEST_ENTRIES+=("{\"original\":\"${rel_original}\",\"webp\":\"${rel_webp}\",\"originalSize\":${size},\"webpSize\":${webp_size}}")
            CONVERTED=$((CONVERTED + 1))

            if (( CONVERTED % 50 == 0 )); then
                echo -e "  ${GREEN}${CONVERTED}${NC} 파일 변환 완료..."
            fi
        else
            echo -e "  ${RED}실패:${NC} ${f}"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

# 스킵된 파일의 원본 크기도 합산 (webp 없으므로 원본 유지)
echo ""

# ── 매니페스트 생성 ───────────────────────────────────────────────
echo -e "${CYAN}매니페스트 생성 중...${NC}"

{
    echo "{"
    echo "  \"generated\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"quality\": ${QUALITY},"
    echo "  \"thresholdBytes\": ${SIZE_THRESHOLD},"
    echo "  \"totalFiles\": ${CONVERTED},"
    echo "  \"mappings\": ["

    if [ "${#MANIFEST_ENTRIES[@]}" -gt 0 ]; then
        for i in "${!MANIFEST_ENTRIES[@]}"; do
            if [ "$i" -lt $((${#MANIFEST_ENTRIES[@]} - 1)) ]; then
                echo "    ${MANIFEST_ENTRIES[$i]},"
            else
                echo "    ${MANIFEST_ENTRIES[$i]}"
            fi
        done
    fi

    echo "  ]"
    echo "}"
} > "$MANIFEST"

echo -e "  매니페스트: ${GREEN}${MANIFEST}${NC} (${#MANIFEST_ENTRIES[@]}개 항목)"

# ── 결과 리포트 ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  결과 리포트${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
echo -e "  총 PNG 파일:      ${TOTAL_FILES}개"
echo -e "  변환 대상 (>100KB): ${CONVERTED}개"
echo -e "  스킵 (≤100KB):     ${SKIPPED}개"
if [ "$ERRORS" -gt 0 ]; then
    echo -e "  오류:              ${RED}${ERRORS}개${NC}"
fi
echo ""
echo -e "  원본 총 크기:  ${BOLD}$(human_size "$TOTAL_ORIGINAL")${NC}"

if [[ "$DRY_RUN" == true ]]; then
    echo -e "  예상 WebP 크기: ${BOLD}$(human_size "$TOTAL_WEBP")${NC} ${YELLOW}(추정)${NC}"
    if [ "$TOTAL_ORIGINAL" -gt 0 ] && [ "$TOTAL_WEBP" -gt 0 ]; then
        SAVED=$((TOTAL_ORIGINAL - TOTAL_WEBP))
        REDUCTION=$((SAVED * 100 / TOTAL_ORIGINAL))
        echo -e "  예상 절감:     ${GREEN}${BOLD}$(human_size "$SAVED") (${REDUCTION}%)${NC}"
    fi
else
    # 실제 변환 시: 변환된 파일 크기 + 스킵된 파일 원본 크기
    echo -e "  WebP 크기:     ${BOLD}$(human_size "$TOTAL_WEBP")${NC}"
    if [ "$TOTAL_ORIGINAL" -gt 0 ] && [ "$TOTAL_WEBP" -gt 0 ]; then
        # 변환 대상만의 절감율
        SAVED=$((TOTAL_ORIGINAL - TOTAL_WEBP))
        REDUCTION=$((SAVED * 100 / TOTAL_ORIGINAL))
        echo -e "  절감:          ${GREEN}${BOLD}$(human_size "$SAVED") (${REDUCTION}%)${NC}"
    fi
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"

if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}DRY-RUN 완료. 실제 변환: ./tools/optimize-images.sh${NC}"
else
    echo -e "${GREEN}변환 완료! 원본 파일은 그대로 유지됩니다.${NC}"
fi
