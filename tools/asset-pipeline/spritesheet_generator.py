#!/usr/bin/env python3
"""
에테르나 크로니클 — 스프라이트 시트 생성기
P11-08: AI 에셋 파이프라인 도구

이미지 프레임들을 스프라이트 시트로 패킹하고 JSON Atlas 메타데이터를 생성한다.

Usage:
    python spritesheet_generator.py --input ./frames/ --output ./sheets/ --size 64x64 --cols 8
    python spritesheet_generator.py --input ./frames/ --output ./sheets/ --size 64x64 --cols 8 --padding 2 --animation idle,walk,attack
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional

try:
    from PIL import Image
except ImportError:
    print("[ERROR] Pillow 라이브러리가 필요합니다: pip install Pillow")
    sys.exit(1)


# ─── 설정 ───────────────────────────────────────────────────────────

DEFAULT_FRAME_SIZE = (64, 64)
DEFAULT_COLS = 8
DEFAULT_PADDING = 2
MAX_SHEET_SIZE = (2048, 2048)
SUPPORTED_FORMATS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

# 애니메이션 프레임 수 기본값 (에테르나 크로니클 표준)
ANIMATION_FRAME_COUNTS = {
    "idle": 4,
    "walk": 6,
    "attack_melee": 6,
    "attack_ranged": 6,
    "cast": 5,
    "hit": 3,
    "death": 5,
}

# 8방향 정의
DIRECTIONS = [
    "down", "down_left", "left", "up_left",
    "up", "up_right", "right", "down_right",
]


# ─── 핵심 함수 ──────────────────────────────────────────────────────

def load_frames(input_dir: Path, frame_size: tuple[int, int]) -> list[tuple[str, Image.Image]]:
    """입력 디렉터리에서 프레임 이미지를 로드하고 정렬한다."""
    frames = []
    for f in sorted(input_dir.iterdir()):
        if f.suffix.lower() in SUPPORTED_FORMATS:
            img = Image.open(f).convert("RGBA")
            if img.size != frame_size:
                img = img.resize(frame_size, Image.Resampling.LANCZOS)
            frames.append((f.stem, img))
    return frames


def pack_spritesheet(
    frames: list[tuple[str, Image.Image]],
    frame_size: tuple[int, int],
    cols: int,
    padding: int,
) -> tuple[Image.Image, dict]:
    """프레임들을 스프라이트 시트로 패킹한다."""
    if not frames:
        raise ValueError("패킹할 프레임이 없습니다.")

    fw, fh = frame_size
    cell_w = fw + padding
    cell_h = fh + padding
    rows = (len(frames) + cols - 1) // cols

    sheet_w = cols * cell_w - padding
    sheet_h = rows * cell_h - padding

    if sheet_w > MAX_SHEET_SIZE[0] or sheet_h > MAX_SHEET_SIZE[1]:
        raise ValueError(
            f"시트 크기 {sheet_w}x{sheet_h}가 최대 허용 크기 "
            f"{MAX_SHEET_SIZE[0]}x{MAX_SHEET_SIZE[1]}를 초과합니다."
        )

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    frame_data = {}

    for idx, (name, img) in enumerate(frames):
        col = idx % cols
        row = idx // cols
        x = col * cell_w
        y = row * cell_h
        sheet.paste(img, (x, y))
        frame_data[name] = {
            "frame": {"x": x, "y": y, "w": fw, "h": fh},
            "pivot": {"x": 0.5, "y": 0.9},
            "duration": 200,
        }

    return sheet, frame_data


def generate_atlas(
    frame_data: dict,
    sheet_filename: str,
    sheet_size: tuple[int, int],
    animations: Optional[dict[str, list[str]]] = None,
) -> dict:
    """JSON Atlas 메타데이터를 생성한다."""
    atlas = {
        "meta": {
            "app": "에테르나 크로니클 Asset Pipeline",
            "version": "1.0",
            "image": sheet_filename,
            "size": {"w": sheet_size[0], "h": sheet_size[1]},
            "scale": 1,
        },
        "frames": frame_data,
        "animations": animations or {},
    }
    return atlas


def auto_detect_animations(frame_names: list[str]) -> dict[str, list[str]]:
    """프레임 이름에서 애니메이션 그룹을 자동 감지한다.

    네이밍 규칙: {animation}_{direction}_{frame_number}
    예: idle_down_0, walk_left_3
    """
    groups: dict[str, list[str]] = {}
    for name in frame_names:
        parts = name.rsplit("_", 1)
        if len(parts) == 2 and parts[1].isdigit():
            group_name = parts[0]
        else:
            group_name = name
        groups.setdefault(group_name, []).append(name)

    # 각 그룹 내 프레임을 정렬
    for key in groups:
        groups[key].sort()

    return groups


def generate_template_frames(
    output_dir: Path,
    frame_size: tuple[int, int],
    animations: list[str],
    directions: list[str],
) -> None:
    """빈 프레임 템플릿 파일들을 생성한다 (스텁)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    fw, fh = frame_size
    for anim in animations:
        n_frames = ANIMATION_FRAME_COUNTS.get(anim, 4)
        for direction in directions:
            for frame_idx in range(n_frames):
                name = f"{anim}_{direction}_{frame_idx}.png"
                filepath = output_dir / name
                if not filepath.exists():
                    img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
                    img.save(filepath)
    print(f"[INFO] 템플릿 프레임 생성 완료: {output_dir}")


# ─── CLI ────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="에테르나 크로니클 스프라이트 시트 생성기",
    )
    parser.add_argument(
        "--input", "-i", type=Path, required=True,
        help="프레임 이미지가 있는 입력 디렉터리",
    )
    parser.add_argument(
        "--output", "-o", type=Path, required=True,
        help="스프라이트 시트 출력 디렉터리",
    )
    parser.add_argument(
        "--size", "-s", type=str, default="64x64",
        help="프레임 크기 (WxH, 기본: 64x64)",
    )
    parser.add_argument(
        "--cols", "-c", type=int, default=DEFAULT_COLS,
        help=f"시트 열 수 (기본: {DEFAULT_COLS})",
    )
    parser.add_argument(
        "--padding", "-p", type=int, default=DEFAULT_PADDING,
        help=f"프레임 간 패딩 (기본: {DEFAULT_PADDING}px)",
    )
    parser.add_argument(
        "--name", "-n", type=str, default="spritesheet",
        help="출력 파일 이름 (기본: spritesheet)",
    )
    parser.add_argument(
        "--generate-template", action="store_true",
        help="빈 프레임 템플릿을 생성 (에셋 제작 시작용)",
    )
    parser.add_argument(
        "--animations", type=str, default=None,
        help="애니메이션 이름 목록 (쉼표 구분, 예: idle,walk,attack_melee)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # 프레임 크기 파싱
    try:
        w, h = args.size.lower().split("x")
        frame_size = (int(w), int(h))
    except ValueError:
        print(f"[ERROR] 잘못된 크기 형식: {args.size} (예: 64x64)")
        sys.exit(1)

    # 애니메이션 목록
    if args.animations:
        anim_list = [a.strip() for a in args.animations.split(",")]
    else:
        anim_list = list(ANIMATION_FRAME_COUNTS.keys())

    # 템플릿 생성 모드
    if args.generate_template:
        generate_template_frames(args.input, frame_size, anim_list, DIRECTIONS)
        return

    # 입력 검증
    if not args.input.is_dir():
        print(f"[ERROR] 입력 디렉터리를 찾을 수 없습니다: {args.input}")
        sys.exit(1)

    args.output.mkdir(parents=True, exist_ok=True)

    # 프레임 로드
    print(f"[INFO] 프레임 로드 중: {args.input}")
    frames = load_frames(args.input, frame_size)
    if not frames:
        print("[ERROR] 로드된 프레임이 없습니다.")
        sys.exit(1)
    print(f"[INFO] {len(frames)}개 프레임 로드 완료")

    # 스프라이트 시트 패킹
    print(f"[INFO] 스프라이트 시트 패킹 중 (cols={args.cols}, padding={args.padding}px)")
    sheet, frame_data = pack_spritesheet(frames, frame_size, args.cols, args.padding)

    # 애니메이션 자동 감지
    frame_names = [name for name, _ in frames]
    animations = auto_detect_animations(frame_names)
    print(f"[INFO] 감지된 애니메이션 그룹: {list(animations.keys())}")

    # 시트 저장
    sheet_filename = f"{args.name}.png"
    sheet_path = args.output / sheet_filename
    sheet.save(sheet_path, "PNG")
    print(f"[INFO] 시트 저장: {sheet_path} ({sheet.size[0]}x{sheet.size[1]})")

    # Atlas JSON 저장
    atlas = generate_atlas(frame_data, sheet_filename, sheet.size, animations)
    atlas_path = args.output / f"{args.name}.json"
    with open(atlas_path, "w", encoding="utf-8") as f:
        json.dump(atlas, f, indent=2, ensure_ascii=False)
    print(f"[INFO] Atlas 저장: {atlas_path}")

    print("[INFO] 완료!")


if __name__ == "__main__":
    main()
