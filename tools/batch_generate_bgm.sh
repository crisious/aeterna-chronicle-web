#!/bin/bash
# 에테르나 크로니클 — BGM 배치 생성 (하나씩 순차 실행, SIGTERM 방지)
cd "/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클"
PYTHON="/Users/crisious_mini/audiocraft_venv/bin/python3"

TRACKS=(
    BGM-SYL-01 BGM-SYL-02
    BGM-SOL-01 BGM-SOL-02
    BGM-BOR-01 BGM-BOR-02
    BGM-ARG-01 BGM-ARG-02
    BGM-BRT-01 BGM-BRT-02
    BGM-PLT-01
    BGM-ERB-03 BGM-SYL-03 BGM-SOL-03 BGM-ARG-03
    BGM-PLT-02 BGM-PLT-03
    BGM-BTL-01 BGM-BTL-02 BGM-PVP-01
    BGM-SYS-01 BGM-SYS-02 BGM-ERB-02
    BGM-SYS-03 BGM-SYS-04
)

total=${#TRACKS[@]}
success=0
skip=0
fail=0

for i in "${!TRACKS[@]}"; do
    track="${TRACKS[$i]}"
    echo "[$(($i+1))/$total] Processing $track..."
    $PYTHON scripts/generate_bgm.py --tracks "$track" --device cpu 2>&1 | grep -E "SKIP|OGG saved|생성|실패|완료"
    if [ $? -eq 0 ]; then
        ((success++))
    else
        ((fail++))
        echo "  ⚠ Failed: $track"
    fi
    echo ""
done

echo "=== 배치 완료: $success 성공, $fail 실패 (총 $total) ==="
