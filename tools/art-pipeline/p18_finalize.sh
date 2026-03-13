#!/bin/bash
# P18-08~14 완료 후 실행: 결과 확인 + git commit + push
set -e

BASE="/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클"
cd "$BASE"

echo "=== P18 배치 결과 확인 ==="

# 생성된 이미지 수 카운트
echo ""
echo "--- 몬스터 (일반) ---"
find assets/generated/monsters/normal -name "*.png" 2>/dev/null | wc -l

echo "--- 몬스터 (엘리트/보스) ---"
find assets/generated/monsters/elite_boss -name "*.png" 2>/dev/null | wc -l

echo "--- 몬스터 (레이드) ---"
find assets/generated/monsters/raid_boss -name "*.png" 2>/dev/null | wc -l

echo "--- 환경 (타일) ---"
find assets/generated/environment/tiles -name "*.png" 2>/dev/null | wc -l

echo "--- 환경 (배경) ---"
find assets/generated/environment/backgrounds -name "*.png" 2>/dev/null | wc -l

echo "--- 아이콘 (아이템) ---"
find assets/generated/ui/icons/items -name "*.png" 2>/dev/null | wc -l

echo "--- 아이콘 (스킬) ---"
find assets/generated/ui/icons/skills -name "*.png" 2>/dev/null | wc -l

echo "--- 아이콘 (상태이상) ---"
find assets/generated/ui/icons/status -name "*.png" 2>/dev/null | wc -l

echo ""
TOTAL=$(find assets/generated -name "*.png" 2>/dev/null | wc -l)
echo "총 생성 이미지: $TOTAL 장"

echo ""
echo "=== batch_result.json ==="
cat assets/generated/batch_result.json 2>/dev/null || echo "(없음)"

echo ""
echo "=== Git Commit ==="
git add -A
git status --short | head -20
echo "..."
git commit -m "feat: P18-08~14 몬스터+환경+아이콘 이미지 생성

- prompt_gap_filler.py: 프롬프트 갭 분석 스크립트
- p18_batch_runner.py: 통합 배치 이미지 생성 러너
- 몬스터 일반 120종 + 엘리트/보스 62종 + 레이드 32장
- 환경 타일셋+배경 153장
- 아이콘 335종 (아이템+스킬+상태이상)
- ComfyUI SD 1.5 (512x512, steps 20, cfg 7.0)"

git push 2>&1 || echo "push 실패 — 수동 push 필요"

echo ""
echo "=== 완료 ==="
