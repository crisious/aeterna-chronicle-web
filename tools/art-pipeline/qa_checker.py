#!/usr/bin/env python3
"""
에테르나 크로니클 — 에셋 QA 자동 검증 스크립트
티켓: P13-17
의존성: Pillow
사용법: python qa_checker.py check input.png [--expected-size 64]
        python qa_checker.py batch input_dir/ [--report report.json]
        python qa_checker.py naming input_dir/
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[ERROR] 필수 패키지 미설치. pip install Pillow 실행 필요.")
    sys.exit(1)


# ── QA 규격 정의 ──────────────────────────────────────────
# sprite-spec.md + style-guide.md 기준

VALID_SIZES = {
    "character": (64, 64),
    "monster_s": (32, 32),
    "monster_m": (48, 48),
    "monster_l": (64, 64),
    "monster_xl": (96, 96),
    "icon": (32, 32),
    "effect_s": (64, 64),
    "effect_m": (128, 128),
    "effect_l": (256, 256),
    "tile": (32, 32),
    "ui_button": (120, 40),
    "ui_panel": (256, 256),  # 가변
}

# 네이밍 규칙: {타입}_{지역}_{이름}_{변형}_{크기}.png
NAMING_PATTERN = re.compile(
    r"^(char|mon|npc|icon|tile|bg|vfx|ui)_"  # 타입
    r"([a-z]+)_"                                # 지역/카테고리
    r"([a-z0-9\-]+)_"                           # 이름
    r"([a-z0-9\-]+)_"                           # 변형 (idle, walk, v1 등)
    r"(\d+x\d+)"                                # 크기
    r"\.png$",
    re.IGNORECASE,
)

# 글로벌 팔레트 범위 (허용 색상 영역 — HSV 기반)
# style-guide.md 기준 허용 범위
PALETTE_RANGES = {
    "global": {
        "saturation_max": 0.95,  # 과도한 채도 경고
        "brightness_min": 0.02,  # 완전 검정은 OK (그림자)
        "brightness_max": 0.98,  # 완전 흰색 경고
    },
}


def check_resolution(img: Image.Image, expected_size: tuple = None) -> dict:
    """해상도 규격 확인."""
    w, h = img.size
    result = {
        "check": "resolution",
        "actual": f"{w}x{h}",
        "passed": True,
        "details": [],
    }

    # 정사각 여부
    if expected_size:
        ew, eh = expected_size
        if (w, h) != (ew, eh):
            result["passed"] = False
            result["details"].append(f"기대 {ew}x{eh}, 실제 {w}x{h}")

    # 2의 거듭제곱 확인 (GPU 최적화)
    def is_pow2(n):
        return n > 0 and (n & (n - 1)) == 0

    if not is_pow2(w) or not is_pow2(h):
        result["details"].append(f"경고: {w}x{h}는 2의 거듭제곱이 아님 (GPU 비최적)")

    # 최대 크기 제한
    if w > 4096 or h > 4096:
        result["passed"] = False
        result["details"].append(f"최대 크기 초과: {w}x{h} > 4096")

    return result


def check_alpha_channel(img: Image.Image) -> dict:
    """투명도/알파 채널 확인."""
    result = {
        "check": "alpha_channel",
        "passed": True,
        "details": [],
    }

    if img.mode != "RGBA":
        result["passed"] = False
        result["details"].append(f"RGBA 모드 아님: {img.mode}")
        return result

    alpha = list(img.split()[-1].getdata())
    total = len(alpha)
    fully_transparent = sum(1 for a in alpha if a == 0)
    fully_opaque = sum(1 for a in alpha if a == 255)
    semi_transparent = total - fully_transparent - fully_opaque

    result["transparent_ratio"] = round(fully_transparent / total, 4)
    result["opaque_ratio"] = round(fully_opaque / total, 4)
    result["semi_transparent_ratio"] = round(semi_transparent / total, 4)

    # 배경이 투명한지 확인 (최소 10% 이상 투명)
    if result["transparent_ratio"] < 0.1:
        result["details"].append(
            f"경고: 투명 영역 {result['transparent_ratio']:.1%} — 배경 제거 필요?"
        )

    # 반투명 비율 경고 (픽셀아트는 보통 반투명 적음)
    if result["semi_transparent_ratio"] > 0.05:
        result["details"].append(
            f"경고: 반투명 픽셀 {result['semi_transparent_ratio']:.1%} — "
            f"픽셀아트 안티앨리어싱 의심"
        )

    return result


def check_color_consistency(img: Image.Image, palette_name: str = "global") -> dict:
    """색상 일관성 (팔레트 범위 체크)."""
    result = {
        "check": "color_consistency",
        "passed": True,
        "details": [],
    }

    if img.mode == "RGBA":
        pixels = [
            img.getpixel((x, y))[:3]
            for y in range(img.height)
            for x in range(img.width)
            if img.getpixel((x, y))[3] > 10  # 투명 픽셀 제외
        ]
    else:
        pixels = list(img.convert("RGB").getdata())

    if not pixels:
        result["details"].append("경고: 불투명 픽셀 없음")
        return result

    # 고유 색상 수
    unique_colors = len(set(pixels))
    result["unique_colors"] = unique_colors

    # 픽셀아트 색상 수 제한 (보통 16~64색)
    if unique_colors > 256:
        result["details"].append(
            f"경고: 고유 색상 {unique_colors}개 — 픽셀아트 기준 과다 (권장 ≤256)"
        )

    # RGB → HSV 변환으로 채도/명도 범위 체크
    import colorsys
    saturations = []
    brightnesses = []
    for r, g, b in pixels[:5000]:  # 샘플링
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        saturations.append(s)
        brightnesses.append(v)

    avg_sat = sum(saturations) / len(saturations)
    avg_bright = sum(brightnesses) / len(brightnesses)
    result["avg_saturation"] = round(avg_sat, 3)
    result["avg_brightness"] = round(avg_bright, 3)

    ranges = PALETTE_RANGES.get(palette_name, PALETTE_RANGES["global"])
    if avg_sat > ranges["saturation_max"]:
        result["details"].append(f"경고: 평균 채도 {avg_sat:.2f} > {ranges['saturation_max']}")

    return result


def check_frame_consistency(frames_dir: str, expected_count: int = 0) -> dict:
    """프레임 수/사이즈 정합 확인."""
    result = {
        "check": "frame_consistency",
        "passed": True,
        "details": [],
    }

    path = Path(frames_dir)
    files = sorted(path.glob("*.png"))
    if not files:
        result["passed"] = False
        result["details"].append("프레임 파일 없음")
        return result

    result["frame_count"] = len(files)

    if expected_count > 0 and len(files) != expected_count:
        result["passed"] = False
        result["details"].append(
            f"기대 프레임 수 {expected_count}, 실제 {len(files)}"
        )

    # 모든 프레임 동일 크기 확인
    sizes = set()
    for f in files:
        img = Image.open(f)
        sizes.add(img.size)

    if len(sizes) > 1:
        result["passed"] = False
        result["details"].append(f"프레임 크기 불일치: {sizes}")
    else:
        result["frame_size"] = list(sizes)[0]

    return result


def check_naming(file_path: str) -> dict:
    """네이밍 규칙 준수 확인."""
    name = Path(file_path).name
    result = {
        "check": "naming",
        "file": name,
        "passed": True,
        "details": [],
    }

    if not NAMING_PATTERN.match(name):
        result["passed"] = False
        result["details"].append(
            f"네이밍 규칙 위반: '{name}' — "
            f"기대 형식: {{타입}}_{{지역}}_{{이름}}_{{변형}}_{{크기}}.png"
        )

    # 소문자+하이픈만 허용
    stem = Path(file_path).stem
    if stem != stem.lower():
        result["details"].append("경고: 파일명에 대문자 포함")

    if " " in name:
        result["passed"] = False
        result["details"].append("파일명에 공백 포함")

    return result


def qa_check_single(
    file_path: str,
    expected_size: tuple = None,
    check_alpha: bool = True,
    check_naming_rule: bool = True,
) -> dict:
    """단일 파일 전체 QA 검증."""
    img = Image.open(file_path)
    results = {
        "file": str(file_path),
        "passed": True,
        "checks": [],
    }

    # 해상도
    res = check_resolution(img, expected_size)
    results["checks"].append(res)
    if not res["passed"]:
        results["passed"] = False

    # 알파 채널
    if check_alpha:
        alpha = check_alpha_channel(img)
        results["checks"].append(alpha)
        if not alpha["passed"]:
            results["passed"] = False

    # 색상 일관성
    color = check_color_consistency(img)
    results["checks"].append(color)
    if not color["passed"]:
        results["passed"] = False

    # 네이밍
    if check_naming_rule:
        naming = check_naming(file_path)
        results["checks"].append(naming)
        if not naming["passed"]:
            results["passed"] = False

    return results


def batch_qa_check(
    input_dir: str,
    output_dir: str = None,
    expected_size: tuple = None,
) -> list:
    """디렉터리 내 전체 파일 QA 검증."""
    path = Path(input_dir)
    files = sorted(path.glob("*.png"))
    results = []

    for i, f in enumerate(files, 1):
        print(f"  [{i}/{len(files)}] {f.name}", end="")
        result = qa_check_single(str(f), expected_size, check_naming_rule=False)
        results.append(result)

        if result["passed"]:
            print(" ✅")
            if output_dir:
                import shutil
                out = Path(output_dir)
                out.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, out / f.name)
        else:
            issues = [c for c in result["checks"] if not c["passed"]]
            print(f" ❌ ({len(issues)} issues)")

    return results


# ── CLI ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="에테르나 크로니클 — 에셋 QA 검증"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # check — 단일 파일
    p_check = sub.add_parser("check", help="단일 파일 QA 검증")
    p_check.add_argument("file", help="검증할 이미지 파일")
    p_check.add_argument("--expected-size", type=int, help="기대 프레임 크기 (정사각)")
    p_check.add_argument("--check-alpha", action="store_true", help="알파 채널 검증")
    p_check.add_argument("--check-naming", action="store_true", help="네이밍 규칙 검증")

    # batch — 디렉터리 배치
    p_batch = sub.add_parser("batch", help="디렉터리 배치 QA 검증")
    p_batch.add_argument("input_dir", help="검증할 이미지 디렉터리")
    p_batch.add_argument("--output-dir", help="통과 파일 복사 디렉터리")
    p_batch.add_argument("--expected-size", type=int, help="기대 프레임 크기")
    p_batch.add_argument("--report", help="리포트 JSON 출력 경로")

    # naming — 네이밍 검증
    p_naming = sub.add_parser("naming", help="네이밍 규칙 검증")
    p_naming.add_argument("input_dir", help="검증할 디렉터리")

    # frames — 프레임 정합
    p_frames = sub.add_parser("frames", help="프레임 정합 검증")
    p_frames.add_argument("frames_dir", help="프레임 디렉터리")
    p_frames.add_argument("--expected-count", type=int, default=0, help="기대 프레임 수")

    args = parser.parse_args()

    if args.command == "check":
        expected = (args.expected_size, args.expected_size) if args.expected_size else None
        result = qa_check_single(
            args.file, expected,
            check_alpha=args.check_alpha,
            check_naming_rule=args.check_naming,
        )
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        print(f"\n{status}: {args.file}")
        for c in result["checks"]:
            mark = "✅" if c["passed"] else "❌"
            print(f"  {mark} {c['check']}")
            for d in c.get("details", []):
                print(f"      {d}")

    elif args.command == "batch":
        expected = (args.expected_size, args.expected_size) if args.expected_size else None
        results = batch_qa_check(args.input_dir, args.output_dir, expected)
        passed = sum(1 for r in results if r["passed"])
        print(f"\n결과: {passed}/{len(results)} 통과")

        if args.report:
            Path(args.report).write_text(
                json.dumps(results, indent=2, ensure_ascii=False)
            )
            print(f"리포트: {args.report}")

    elif args.command == "naming":
        path = Path(args.input_dir)
        files = sorted(path.glob("*.png"))
        violations = 0
        for f in files:
            result = check_naming(str(f))
            if not result["passed"]:
                violations += 1
                print(f"  ❌ {f.name}")
                for d in result["details"]:
                    print(f"      {d}")
        print(f"\n네이밍 위반: {violations}/{len(files)}")

    elif args.command == "frames":
        result = check_frame_consistency(args.frames_dir, args.expected_count)
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        print(f"\n{status}")
        print(f"  프레임 수: {result.get('frame_count', 0)}")
        if "frame_size" in result:
            print(f"  프레임 크기: {result['frame_size']}")
        for d in result.get("details", []):
            print(f"  {d}")


if __name__ == "__main__":
    main()
