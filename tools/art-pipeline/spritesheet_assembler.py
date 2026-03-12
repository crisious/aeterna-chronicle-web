#!/usr/bin/env python3
"""
에테르나 크로니클 — 스프라이트 시트 조립기
티켓: P13-16
의존성: Pillow
사용법: python spritesheet_assembler.py frames_dir/ output.png --cols 8 --frame-size 64
"""

import argparse
import json
import math
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[ERROR] 필수 패키지 미설치. pip install Pillow 실행 필요.")
    sys.exit(1)


# ── 에테르나 스프라이트 시트 규격 (sprite-spec.md 기준) ────
SPRITE_SPECS = {
    "character": {
        "frame_size": 64,
        "padding": 2,
        "max_sheet_size": 2048,
        "motions": {
            "idle": 4,
            "walk": 6,
            "attack_melee": 6,
            "attack_ranged": 6,
            "cast": 5,
            "hit": 3,
            "death": 5,
        },
        "directions": 5,  # 실제 제작 (나머지 미러링)
    },
    "monster_s": {"frame_size": 32, "padding": 2, "max_sheet_size": 1024},
    "monster_m": {"frame_size": 48, "padding": 2, "max_sheet_size": 1024},
    "monster_l": {"frame_size": 64, "padding": 2, "max_sheet_size": 2048},
    "monster_xl": {"frame_size": 96, "padding": 2, "max_sheet_size": 2048},
    "icon": {"frame_size": 32, "padding": 1, "max_sheet_size": 1024},
    "effect": {"frame_size": 128, "padding": 2, "max_sheet_size": 2048},
}


def natural_sort_key(path: Path) -> list:
    """자연 정렬 키 (frame_01, frame_02, ..., frame_10 순서 보장)."""
    return [
        int(c) if c.isdigit() else c.lower()
        for c in re.split(r"(\d+)", path.stem)
    ]


def assemble_spritesheet(
    frames_dir: str,
    output_path: str,
    frame_size: int = 64,
    cols: int = 0,
    padding: int = 2,
    max_sheet_size: int = 2048,
    preset: str = None,
) -> dict:
    """
    프레임 이미지들을 하나의 스프라이트 시트로 조립.

    Args:
        frames_dir: 프레임 이미지 디렉터리
        output_path: 출력 스프라이트 시트 경로
        frame_size: 프레임 크기 (정사각)
        cols: 열 수 (0=자동 계산)
        padding: 프레임 간 패딩 (px)
        max_sheet_size: 시트 최대 크기
        preset: 프리셋 이름 (SPRITE_SPECS 키)

    Returns:
        dict: 조립 결과 + 메타데이터
    """
    if preset and preset in SPRITE_SPECS:
        spec = SPRITE_SPECS[preset]
        frame_size = spec["frame_size"]
        padding = spec["padding"]
        max_sheet_size = spec["max_sheet_size"]

    frames_path = Path(frames_dir)
    exts = (".png", ".jpg", ".jpeg", ".webp")
    frame_files = sorted(
        [f for f in frames_path.iterdir() if f.suffix.lower() in exts],
        key=natural_sort_key,
    )

    if not frame_files:
        raise FileNotFoundError(f"프레임 파일 없음: {frames_dir}")

    total_frames = len(frame_files)

    # 열 수 자동 계산
    if cols <= 0:
        cell_size = frame_size + padding
        max_cols = max_sheet_size // cell_size
        cols = min(total_frames, max_cols)

    rows = math.ceil(total_frames / cols)
    cell_size = frame_size + padding
    sheet_w = cols * cell_size + padding
    sheet_h = rows * cell_size + padding

    if sheet_w > max_sheet_size or sheet_h > max_sheet_size:
        print(f"[WARN] 시트 크기 {sheet_w}x{sheet_h} > 최대 {max_sheet_size}. 분할 필요.")

    # 시트 생성 (RGBA 투명)
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    frame_meta = []
    for idx, frame_file in enumerate(frame_files):
        row = idx // cols
        col = idx % cols
        x = padding + col * cell_size
        y = padding + row * cell_size

        frame = Image.open(frame_file).convert("RGBA")

        # 프레임 크기 맞추기 (리사이즈 또는 크롭)
        if frame.size != (frame_size, frame_size):
            frame = frame.resize((frame_size, frame_size), Image.NEAREST)

        sheet.paste(frame, (x, y))
        frame_meta.append({
            "index": idx,
            "file": frame_file.name,
            "x": x,
            "y": y,
            "w": frame_size,
            "h": frame_size,
        })

    # 저장
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(str(out_path), "PNG")

    # 메타데이터 JSON 저장
    meta = {
        "sheet": str(out_path),
        "frame_size": frame_size,
        "padding": padding,
        "cols": cols,
        "rows": rows,
        "total_frames": total_frames,
        "sheet_size": [sheet_w, sheet_h],
        "frames": frame_meta,
    }
    meta_path = out_path.with_suffix(".json")
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    return meta


def assemble_character_sheet(
    base_dir: str,
    output_path: str,
) -> dict:
    """
    캐릭터 전체 스프라이트 시트 조립 (5방향 × 7모션).
    
    기대 디렉터리 구조:
      base_dir/
        idle/      (4 frames × 5 directions = 20 files)
        walk/      (6 frames × 5 dirs = 30 files)
        attack_melee/ (6×5 = 30)
        ...

    출력: 행=방향(5), 열=모션 프레임 연결
    """
    spec = SPRITE_SPECS["character"]
    motions = spec["motions"]
    directions = spec["directions"]
    frame_size = spec["frame_size"]
    padding = spec["padding"]

    total_cols = sum(motions.values())  # 35
    total_rows = directions  # 5

    cell_size = frame_size + padding
    sheet_w = total_cols * cell_size + padding
    sheet_h = total_rows * cell_size + padding

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    base = Path(base_dir)
    meta_frames = []

    for dir_idx in range(directions):
        col_offset = 0
        for motion_name, frame_count in motions.items():
            motion_dir = base / motion_name
            if not motion_dir.exists():
                print(f"  [SKIP] {motion_name}/ 디렉터리 없음")
                col_offset += frame_count
                continue

            # 방향별 프레임 파일 검색
            pattern = f"*_d{dir_idx}_*"
            files = sorted(motion_dir.glob(pattern), key=natural_sort_key)
            if not files:
                # 대안: 전체 파일을 방향별로 분할
                all_files = sorted(
                    [f for f in motion_dir.iterdir() if f.suffix.lower() == ".png"],
                    key=natural_sort_key,
                )
                start = dir_idx * frame_count
                files = all_files[start:start + frame_count]

            for f_idx, frame_file in enumerate(files[:frame_count]):
                col = col_offset + f_idx
                x = padding + col * cell_size
                y = padding + dir_idx * cell_size

                frame = Image.open(frame_file).convert("RGBA")
                if frame.size != (frame_size, frame_size):
                    frame = frame.resize((frame_size, frame_size), Image.NEAREST)
                sheet.paste(frame, (x, y))

                meta_frames.append({
                    "direction": dir_idx,
                    "motion": motion_name,
                    "frame": f_idx,
                    "file": frame_file.name,
                    "x": x, "y": y,
                })

            col_offset += frame_count

    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(str(out_path), "PNG")

    meta = {
        "type": "character_spritesheet",
        "sheet": str(out_path),
        "frame_size": frame_size,
        "cols": total_cols,
        "rows": total_rows,
        "sheet_size": [sheet_w, sheet_h],
        "motions": motions,
        "directions": directions,
        "frames": meta_frames,
    }
    meta_path = out_path.with_suffix(".json")
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    return meta


# ── CLI ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="에테르나 크로니클 — 스프라이트 시트 조립기"
    )
    parser.add_argument("frames_dir", help="프레임 이미지 디렉터리")
    parser.add_argument("output", help="출력 스프라이트 시트 경로")
    parser.add_argument("--frame-size", type=int, default=64, help="프레임 크기 (기본: 64)")
    parser.add_argument("--cols", type=int, default=0, help="열 수 (0=자동)")
    parser.add_argument("--padding", type=int, default=2, help="프레임 간 패딩 (기본: 2)")
    parser.add_argument(
        "--preset", choices=list(SPRITE_SPECS.keys()),
        help="프리셋 (규격 자동 적용)"
    )
    parser.add_argument(
        "--character", action="store_true",
        help="캐릭터 전체 시트 모드 (5방향×7모션)"
    )

    args = parser.parse_args()

    if args.character:
        print(f"[캐릭터 시트 모드] {args.frames_dir} → {args.output}")
        meta = assemble_character_sheet(args.frames_dir, args.output)
    else:
        print(f"[일반 시트 모드] {args.frames_dir} → {args.output}")
        meta = assemble_spritesheet(
            args.frames_dir, args.output,
            frame_size=args.frame_size, cols=args.cols,
            padding=args.padding, preset=args.preset,
        )

    print(f"  시트 크기: {meta['sheet_size'][0]}x{meta['sheet_size'][1]}")
    print(f"  프레임: {meta.get('total_frames', len(meta.get('frames', [])))}")
    print(f"  메타데이터: {Path(args.output).with_suffix('.json')}")
    print("  완료.")


if __name__ == "__main__":
    main()
