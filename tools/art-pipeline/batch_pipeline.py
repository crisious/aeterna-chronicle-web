#!/usr/bin/env python3
"""
에테르나 크로니클 — 전체 아트 파이프라인 배치 실행
티켓: P13-16
의존성: Pillow, numpy, rembg
사용법: python batch_pipeline.py input_dir/ output_dir/ --palette erebos --steps all
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

# 같은 디렉터리의 파이프라인 모듈 임포트
sys.path.insert(0, str(Path(__file__).parent))

from remove_bg import remove_background, batch_remove
from color_correct import color_correct, batch_correct, REGION_PALETTES
from spritesheet_assembler import assemble_spritesheet, SPRITE_SPECS


# ── 파이프라인 단계 정의 ──────────────────────────────────
PIPELINE_STEPS = [
    "remove_bg",       # 1) 배경 제거
    "color_correct",   # 2) 색보정
    "qa_check",        # 3) QA 검증
    "assemble_sheet",  # 4) 스프라이트 시트 조립
]


def run_pipeline(
    input_dir: str,
    output_dir: str,
    palette: str = "global",
    strength: float = 0.5,
    preset: str = None,
    steps: list = None,
    skip_existing: bool = True,
) -> dict:
    """
    전체 아트 에셋 파이프라인 실행.

    워크플로우:
      raw/ → 01_nobg/ → 02_color_corrected/ → 03_qa_passed/ → 04_spritesheet/

    Args:
        input_dir: 원본 이미지 디렉터리
        output_dir: 출력 루트 디렉터리
        palette: 지역 팔레트 이름
        strength: 색보정 강도
        preset: 스프라이트 시트 프리셋
        steps: 실행할 단계 리스트 (None=전체)
        skip_existing: 이미 처리된 파일 건너뛰기

    Returns:
        dict: 파이프라인 실행 결과
    """
    if steps is None:
        steps = PIPELINE_STEPS.copy()

    base = Path(output_dir)
    dirs = {
        "nobg": base / "01_nobg",
        "cc": base / "02_color_corrected",
        "qa": base / "03_qa_passed",
        "sheet": base / "04_spritesheet",
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    report = {
        "input_dir": str(input_dir),
        "output_dir": str(output_dir),
        "palette": palette,
        "steps": steps,
        "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "results": {},
    }

    # ── Step 1: 배경 제거 ──────────────────────────────────
    if "remove_bg" in steps:
        print("\n" + "=" * 60)
        print("  [Step 1/4] 배경 제거")
        print("=" * 60)
        try:
            results = batch_remove(input_dir, str(dirs["nobg"]))
            ok = sum(1 for r in results if r.get("status") == "ok")
            report["results"]["remove_bg"] = {
                "status": "ok",
                "total": len(results),
                "success": ok,
                "failed": len(results) - ok,
            }
            print(f"  → {ok}/{len(results)} 완료")
        except Exception as e:
            report["results"]["remove_bg"] = {"status": "error", "error": str(e)}
            print(f"  → 실패: {e}")

    # ── Step 2: 색보정 ─────────────────────────────────────
    if "color_correct" in steps:
        print("\n" + "=" * 60)
        print(f"  [Step 2/4] 색보정 (palette: {palette}, strength: {strength})")
        print("=" * 60)
        source = str(dirs["nobg"]) if "remove_bg" in steps else input_dir
        try:
            results = batch_correct(source, str(dirs["cc"]), palette, strength)
            ok = sum(1 for r in results if r.get("status") == "ok")
            report["results"]["color_correct"] = {
                "status": "ok",
                "total": len(results),
                "success": ok,
                "palette": palette,
                "strength": strength,
            }
            print(f"  → {ok}/{len(results)} 완료")
        except Exception as e:
            report["results"]["color_correct"] = {"status": "error", "error": str(e)}
            print(f"  → 실패: {e}")

    # ── Step 3: QA 검증 ────────────────────────────────────
    if "qa_check" in steps:
        print("\n" + "=" * 60)
        print("  [Step 3/4] QA 검증")
        print("=" * 60)
        try:
            # qa_checker가 있으면 import, 없으면 기본 검증
            from qa_checker import batch_qa_check
            source = str(dirs["cc"]) if "color_correct" in steps else str(dirs["nobg"])
            qa_results = batch_qa_check(source, str(dirs["qa"]))
            passed = sum(1 for r in qa_results if r.get("passed"))
            report["results"]["qa_check"] = {
                "status": "ok",
                "total": len(qa_results),
                "passed": passed,
                "failed": len(qa_results) - passed,
            }
            print(f"  → {passed}/{len(qa_results)} 통과")
        except ImportError:
            # QA 모듈 없으면 파일 복사로 대체
            import shutil
            source = dirs["cc"] if "color_correct" in steps else dirs["nobg"]
            files = list(source.glob("*.png"))
            for f in files:
                shutil.copy2(f, dirs["qa"] / f.name)
            report["results"]["qa_check"] = {
                "status": "skipped",
                "reason": "qa_checker 모듈 미설치, 전체 패스스루",
                "total": len(files),
            }
            print(f"  → QA 모듈 미설치. {len(files)}건 패스스루.")

    # ── Step 4: 스프라이트 시트 조립 ───────────────────────
    if "assemble_sheet" in steps:
        print("\n" + "=" * 60)
        print("  [Step 4/4] 스프라이트 시트 조립")
        print("=" * 60)
        source = str(dirs["qa"]) if "qa_check" in steps else str(dirs["cc"])
        sheet_path = str(dirs["sheet"] / "spritesheet.png")
        try:
            meta = assemble_spritesheet(
                source, sheet_path, preset=preset,
            )
            report["results"]["assemble_sheet"] = {
                "status": "ok",
                "sheet_path": sheet_path,
                "sheet_size": meta["sheet_size"],
                "total_frames": meta["total_frames"],
            }
            print(f"  → 시트: {meta['sheet_size'][0]}x{meta['sheet_size'][1]}, "
                  f"{meta['total_frames']} 프레임")
        except Exception as e:
            report["results"]["assemble_sheet"] = {"status": "error", "error": str(e)}
            print(f"  → 실패: {e}")

    # ── 최종 리포트 ────────────────────────────────────────
    report["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
    report_path = base / "pipeline_report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print("\n" + "=" * 60)
    print(f"  파이프라인 완료 — 리포트: {report_path}")
    print("=" * 60)

    return report


# ── CLI ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="에테르나 크로니클 — 전체 아트 파이프라인 배치 실행"
    )
    parser.add_argument("input_dir", help="원본 이미지 디렉터리")
    parser.add_argument("output_dir", help="출력 루트 디렉터리")
    parser.add_argument(
        "--palette", default="global",
        choices=list(REGION_PALETTES.keys()),
        help="지역 팔레트 (기본: global)"
    )
    parser.add_argument(
        "--strength", type=float, default=0.5,
        help="색보정 강도 (기본: 0.5)"
    )
    parser.add_argument(
        "--preset", choices=list(SPRITE_SPECS.keys()),
        help="스프라이트 시트 프리셋"
    )
    parser.add_argument(
        "--steps", nargs="+", default=None,
        choices=PIPELINE_STEPS + ["all"],
        help="실행할 단계 (기본: all)"
    )

    args = parser.parse_args()

    steps = None if args.steps is None or "all" in args.steps else args.steps

    run_pipeline(
        args.input_dir,
        args.output_dir,
        palette=args.palette,
        strength=args.strength,
        preset=args.preset,
        steps=steps,
    )


if __name__ == "__main__":
    main()
