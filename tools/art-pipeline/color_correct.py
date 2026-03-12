#!/usr/bin/env python3
"""
에테르나 크로니클 — 색보정 스크립트 (팔레트 매칭)
티켓: P13-16
의존성: Pillow, numpy
사용법: python color_correct.py input.png output.png --palette erebos
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("[ERROR] 필수 패키지 미설치. pip install Pillow numpy 실행 필요.")
    sys.exit(1)


# ── 지역별 마스터 팔레트 ──────────────────────────────────
# style-guide.md 2.2절 지역 팔레트 기준
REGION_PALETTES = {
    "global": {
        "name": "글로벌 공통",
        "colors": [
            (26, 26, 46),    # #1A1A2E 심연 남색
            (22, 33, 62),    # #16213E 딥 네이비
            (232, 232, 232), # #E8E8E8 밝은 회색
            (255, 215, 0),   # #FFD700 금색
            (255, 68, 68),   # #FF4444 경고 적색
            (137, 207, 240), # #89CFF0 기억 청색
            (13, 13, 26),    # #0D0D1A 심연 흑색
        ],
    },
    "erebos": {
        "name": "에레보스 — 망각의 폐허",
        "colors": [
            (40, 35, 50),    # 어두운 보라-회색
            (60, 50, 80),    # 짙은 보라
            (100, 80, 120),  # 연보라
            (137, 207, 240), # 기억 청색 발광
            (50, 50, 65),    # 어두운 석재
            (180, 170, 190), # 밝은 석재
            (30, 25, 40),    # 그림자
        ],
    },
    "silvanheim": {
        "name": "실반헤임 — 기억의 숲",
        "colors": [
            (20, 60, 30),    # 짙은 녹색
            (40, 100, 50),   # 중간 녹색
            (80, 160, 80),   # 밝은 녹색
            (200, 180, 100), # 금빛 햇살
            (60, 40, 30),    # 나무 갈색
            (100, 80, 60),   # 밝은 갈색
            (15, 40, 20),    # 그림자
        ],
    },
    "solaris": {
        "name": "솔라리스 사막 — 불꽃의 땅",
        "colors": [
            (180, 120, 60),  # 모래색
            (220, 160, 80),  # 밝은 모래
            (200, 80, 40),   # 붉은 암석
            (255, 180, 50),  # 금빛
            (120, 60, 30),   # 어두운 암석
            (240, 200, 140), # 연한 사막
            (80, 40, 20),    # 그림자
        ],
    },
    "argentium": {
        "name": "아르겐티움 — 제국의 심장",
        "colors": [
            (180, 190, 200), # 은색 석재
            (60, 80, 140),   # 로열 블루
            (160, 40, 40),   # 크림슨
            (220, 220, 230), # 밝은 은색
            (40, 50, 80),    # 어두운 블루
            (200, 170, 80),  # 금장식
            (30, 35, 55),    # 그림자
        ],
    },
    "frozen": {
        "name": "북방 영원빙원",
        "colors": [
            (180, 210, 240), # 밝은 빙색
            (100, 150, 200), # 중간 빙색
            (60, 100, 160),  # 짙은 빙색
            (200, 180, 220), # 연보라 오로라
            (220, 230, 240), # 하얀 눈
            (140, 180, 220), # 하늘
            (40, 60, 100),   # 그림자
        ],
    },
    "britalia": {
        "name": "브리탈리아 — 자유항",
        "colors": [
            (60, 130, 140),  # 틸
            (160, 120, 80),  # 나무
            (180, 120, 60),  # 구리
            (200, 180, 140), # 밝은 모래
            (80, 100, 120),  # 바다 회색
            (240, 200, 120), # 석양
            (40, 60, 70),    # 그림자
        ],
    },
    "oblivion": {
        "name": "망각의 고원",
        "colors": [
            (20, 15, 25),    # 공허 흑색
            (60, 100, 40),   # 병든 녹색
            (140, 30, 30),   # 핏빛
            (80, 60, 90),    # 부패 보라
            (40, 70, 30),    # 어두운 녹
            (100, 40, 40),   # 어두운 적
            (10, 8, 15),     # 그림자
        ],
    },
    "mist_sea": {
        "name": "무한 안개해",
        "colors": [
            (200, 210, 220), # 안개 흰색
            (30, 50, 80),    # 딥 네이비
            (120, 180, 140), # 연한 녹색 유령빛
            (160, 170, 180), # 중간 안개
            (60, 80, 110),   # 바다색
            (180, 200, 190), # 연한 안개
            (20, 30, 50),    # 그림자
        ],
    },
    "abyss": {
        "name": "기억의 심연",
        "colors": [
            (10, 20, 50),    # 심해 남색
            (30, 60, 120),   # 심해 청색
            (60, 200, 180),  # 생물발광 청록
            (100, 220, 160), # 생물발광 녹색
            (20, 40, 80),    # 중간 심해
            (80, 160, 200),  # 밝은 심해
            (5, 10, 30),     # 그림자
        ],
    },
}


def hex_to_rgb(hex_str: str) -> tuple:
    """#RRGGBB → (R, G, B)"""
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))


def find_nearest_palette_color(pixel: np.ndarray, palette: np.ndarray) -> np.ndarray:
    """유클리드 거리 기반으로 가장 가까운 팔레트 색상 반환."""
    distances = np.sqrt(np.sum((palette - pixel) ** 2, axis=1))
    return palette[np.argmin(distances)]


def color_correct(
    input_path: str,
    output_path: str,
    palette_name: str = "global",
    strength: float = 0.5,
    preserve_alpha: bool = True,
) -> dict:
    """
    이미지를 지정 팔레트 방향으로 색보정.

    Args:
        input_path: 입력 이미지
        output_path: 출력 이미지
        palette_name: 팔레트 키 (REGION_PALETTES)
        strength: 보정 강도 (0.0=원본, 1.0=완전 팔레트 매칭)
        preserve_alpha: 알파 채널 보존

    Returns:
        dict: 처리 결과
    """
    if palette_name not in REGION_PALETTES:
        raise ValueError(f"미지원 팔레트: {palette_name}. 지원: {list(REGION_PALETTES.keys())}")

    palette = np.array(REGION_PALETTES[palette_name]["colors"], dtype=np.float64)
    img = Image.open(input_path)
    has_alpha = img.mode == "RGBA"

    if has_alpha:
        alpha_channel = np.array(img.split()[-1])
        rgb = np.array(img.convert("RGB"), dtype=np.float64)
    else:
        rgb = np.array(img, dtype=np.float64)
        alpha_channel = None

    h, w, _ = rgb.shape
    corrected = rgb.copy()

    # 각 픽셀을 가장 가까운 팔레트 색상으로 블렌딩
    for y in range(h):
        for x in range(w):
            if has_alpha and preserve_alpha and alpha_channel[y, x] < 10:
                continue  # 투명 픽셀 스킵
            nearest = find_nearest_palette_color(rgb[y, x], palette)
            corrected[y, x] = rgb[y, x] * (1 - strength) + nearest * strength

    corrected = np.clip(corrected, 0, 255).astype(np.uint8)
    result_img = Image.fromarray(corrected, "RGB")

    if has_alpha and preserve_alpha:
        result_img.putalpha(Image.fromarray(alpha_channel))

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    result_img.save(output_path, "PNG")

    return {
        "input": str(input_path),
        "output": str(output_path),
        "palette": palette_name,
        "palette_display": REGION_PALETTES[palette_name]["name"],
        "strength": strength,
        "size": (w, h),
    }


def batch_correct(
    input_dir: str,
    output_dir: str,
    palette_name: str = "global",
    strength: float = 0.5,
) -> list:
    """디렉터리 내 모든 이미지 일괄 색보정."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    results = []
    exts = (".png", ".jpg", ".jpeg", ".webp")
    files = [f for f in input_path.iterdir() if f.suffix.lower() in exts]
    total = len(files)

    for i, f in enumerate(sorted(files), 1):
        out_file = output_path / f"{f.stem}_cc.png"
        print(f"  [{i}/{total}] {f.name} → {out_file.name} (palette: {palette_name})")
        try:
            result = color_correct(str(f), str(out_file), palette_name, strength)
            result["status"] = "ok"
        except Exception as e:
            result = {"input": str(f), "status": "error", "error": str(e)}
        results.append(result)

    return results


# ── CLI ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="에테르나 크로니클 — 색보정 (팔레트 매칭)"
    )
    parser.add_argument("input", help="입력 이미지 또는 디렉터리")
    parser.add_argument("output", help="출력 이미지 또는 디렉터리")
    parser.add_argument(
        "--palette", default="global",
        choices=list(REGION_PALETTES.keys()),
        help="지역 팔레트 (기본: global)"
    )
    parser.add_argument(
        "--strength", type=float, default=0.5,
        help="보정 강도 0.0~1.0 (기본: 0.5)"
    )
    parser.add_argument("--batch", action="store_true", help="디렉터리 배치 모드")

    args = parser.parse_args()

    if args.batch:
        print(f"[배치 색보정] palette={args.palette}, strength={args.strength}")
        results = batch_correct(args.input, args.output, args.palette, args.strength)
        ok = sum(1 for r in results if r["status"] == "ok")
        print(f"\n완료: {ok}/{len(results)} 성공")
    else:
        result = color_correct(args.input, args.output, args.palette, args.strength)
        print(f"  팔레트: {result['palette_display']}")
        print(f"  강도: {result['strength']}")
        print("  완료.")


if __name__ == "__main__":
    main()
