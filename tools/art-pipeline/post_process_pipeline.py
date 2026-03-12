#!/usr/bin/env python3
"""
에테르나 크로니클 — P15-03: 후처리 파이프라인 통합
remove_bg + color_correct + spritesheet_assembler 통합 배치
입력→최종 에셋 원스텝 파이프라인

사용법:
  python post_process_pipeline.py --input raw/ --output final/ --palette erebos
  python post_process_pipeline.py --input raw/ --output final/ --steps remove_bg,color_correct,assemble
  python post_process_pipeline.py --input raw/char.png --output final/ --sprite-spec character
  python post_process_pipeline.py --dry-run --input raw/ --output final/
"""

import argparse
import json
import os
import sys
import time
import shutil
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("post_process")

# ── 지역별 팔레트 정의 ────────────────────────────────────
REGION_PALETTES = {
    "erebos": {
        "name": "에레보스",
        "primary": ["#2D2D3F", "#3D3D4F", "#1D1D2F"],
        "accent": ["#89CFF0", "#A0A0FF", "#50FF50"],
        "shadow": "#0D0D1A",
        "highlight": "#89CFF0",
    },
    "sylvanheim": {
        "name": "실반헤임",
        "primary": ["#1B4332", "#2D6A4F", "#40916C"],
        "accent": ["#7DF9FF", "#90EE90", "#ADFF2F"],
        "shadow": "#0A1A10",
        "highlight": "#FFD700",
    },
    "solaris": {
        "name": "솔라리스",
        "primary": ["#C2956B", "#DEB887", "#A0764F"],
        "accent": ["#FFD700", "#FF6347"],
        "shadow": "#3A2510",
        "highlight": "#FFD700",
    },
    "argentium": {
        "name": "아르겐티움",
        "primary": ["#3D3D3D", "#555555", "#2A2A2A"],
        "accent": ["#FFD700", "#FFA500", "#FF4500"],
        "shadow": "#1A1A1A",
        "highlight": "#FFD700",
    },
    "frostland": {
        "name": "북방 영원빙원",
        "primary": ["#E8F4FD", "#D6EAF8", "#AED6F1"],
        "accent": ["#E0FFFF", "#00BFFF"],
        "shadow": "#2E5C8A",
        "highlight": "#E0FFFF",
    },
    "britalia": {
        "name": "브리탈리아",
        "primary": ["#2F4F4F", "#3F5F5F", "#1F3F3F"],
        "accent": ["#48D1CC", "#FFD700"],
        "shadow": "#0F2F2F",
        "highlight": "#48D1CC",
    },
    "mistsea": {
        "name": "안개해",
        "primary": ["#3C3C5C", "#4C4C6C", "#2C2C4C"],
        "accent": ["#DDA0DD", "#E6E6FA", "#BA55D3"],
        "shadow": "#1E1E3E",
        "highlight": "#DDA0DD",
    },
    "abyss": {
        "name": "기억의 심연",
        "primary": ["#0A0A2A", "#1A1A4A", "#050520"],
        "accent": ["#00FFFF", "#FF00FF", "#FFFFFF"],
        "shadow": "#000010",
        "highlight": "#00FFFF",
    },
    "oblivion": {
        "name": "망각의 고원",
        "primary": ["#1A0A0A", "#2A1A1A", "#0A0505"],
        "accent": ["#FF0000", "#00FF00"],
        "shadow": "#050000",
        "highlight": "#FF4444",
    },
}

# ── 스프라이트 시트 규격 ──────────────────────────────────
SPRITE_SPECS = {
    "character": {
        "frame_size": (64, 64),
        "directions": 5,
        "motions": {
            "idle": 4, "walk": 6, "attack_melee": 6,
            "attack_ranged": 6, "cast": 5, "hit": 3, "death": 5,
        },
        "padding": 2,
        "max_sheet_width": 2048,
    },
    "monster": {
        "frame_size": (64, 64),
        "directions": 3,
        "motions": {
            "idle": 4, "walk": 4, "attack": 5, "hit": 3, "death": 4,
        },
        "padding": 2,
        "max_sheet_width": 2048,
    },
    "monster_large": {
        "frame_size": (128, 128),
        "directions": 3,
        "motions": {
            "idle": 4, "walk": 4, "attack": 6, "hit": 3, "death": 5,
        },
        "padding": 2,
        "max_sheet_width": 4096,
    },
    "npc": {
        "frame_size": (64, 64),
        "directions": 4,
        "motions": {"idle": 4, "walk": 4, "talk": 3},
        "padding": 2,
        "max_sheet_width": 2048,
    },
}


@dataclass
class ProcessResult:
    step: str
    input_path: str
    output_path: str
    success: bool
    duration_ms: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)
    error: str = ""


@dataclass
class PipelineReport:
    input_path: str
    output_path: str
    steps: List[ProcessResult] = field(default_factory=list)
    total_duration_ms: float = 0.0
    success: bool = True

    def to_dict(self) -> Dict:
        return {
            "input": self.input_path,
            "output": self.output_path,
            "success": self.success,
            "total_duration_ms": self.total_duration_ms,
            "steps": [
                {
                    "step": s.step,
                    "success": s.success,
                    "duration_ms": s.duration_ms,
                    "output": s.output_path,
                    "error": s.error,
                    "details": s.details,
                }
                for s in self.steps
            ],
        }


# ── 처리 단계 함수 ────────────────────────────────────────

def step_remove_bg(input_path: Path, output_dir: Path, **kwargs) -> ProcessResult:
    """배경 제거 (rembg 또는 알파 기반)"""
    t0 = time.time()
    out_path = output_dir / f"{input_path.stem}_nobg.png"

    try:
        try:
            from rembg import remove
            from PIL import Image
            img = Image.open(input_path)
            result = remove(img)
            result.save(out_path)
        except ImportError:
            # rembg 미설치: 기본 알파 처리 (흰색 배경 → 투명)
            try:
                from PIL import Image
                img = Image.open(input_path).convert("RGBA")
                pixels = img.load()
                w, h = img.size
                threshold = kwargs.get("bg_threshold", 240)
                for y in range(h):
                    for x in range(w):
                        r, g, b, a = pixels[x, y]
                        if r > threshold and g > threshold and b > threshold:
                            pixels[x, y] = (r, g, b, 0)
                img.save(out_path)
            except ImportError:
                # Pillow도 없으면 복사
                shutil.copy2(input_path, out_path)

        return ProcessResult(
            step="remove_bg",
            input_path=str(input_path),
            output_path=str(out_path),
            success=True,
            duration_ms=(time.time() - t0) * 1000,
            details={"method": "rembg" if "rembg" in sys.modules else "threshold"},
        )
    except Exception as e:
        return ProcessResult(
            step="remove_bg",
            input_path=str(input_path),
            output_path="",
            success=False,
            duration_ms=(time.time() - t0) * 1000,
            error=str(e),
        )


def step_color_correct(input_path: Path, output_dir: Path, **kwargs) -> ProcessResult:
    """지역 팔레트 기반 색보정"""
    t0 = time.time()
    palette_name = kwargs.get("palette", "erebos")
    palette = REGION_PALETTES.get(palette_name, REGION_PALETTES["erebos"])
    out_path = output_dir / f"{input_path.stem}_cc.png"

    try:
        from PIL import Image, ImageEnhance

        img = Image.open(input_path).convert("RGBA")

        # 1) 채도 조정 (다크 판타지: 약간 낮춤)
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(0.85)

        # 2) 명도 조정
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(0.9)

        # 3) 대비 강화
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)

        img.save(out_path)

        return ProcessResult(
            step="color_correct",
            input_path=str(input_path),
            output_path=str(out_path),
            success=True,
            duration_ms=(time.time() - t0) * 1000,
            details={"palette": palette_name, "region": palette["name"]},
        )
    except ImportError:
        # Pillow 미설치: 복사
        shutil.copy2(input_path, out_path)
        return ProcessResult(
            step="color_correct",
            input_path=str(input_path),
            output_path=str(out_path),
            success=True,
            duration_ms=(time.time() - t0) * 1000,
            details={"palette": palette_name, "fallback": "copy"},
        )
    except Exception as e:
        return ProcessResult(
            step="color_correct",
            input_path=str(input_path),
            output_path="",
            success=False,
            duration_ms=(time.time() - t0) * 1000,
            error=str(e),
        )


def step_assemble_sheet(input_dir: Path, output_dir: Path, **kwargs) -> ProcessResult:
    """스프라이트 시트 조립"""
    t0 = time.time()
    spec_name = kwargs.get("sprite_spec", "character")
    spec = SPRITE_SPECS.get(spec_name, SPRITE_SPECS["character"])
    out_path = output_dir / f"spritesheet_{spec_name}.png"

    try:
        from PIL import Image

        fw, fh = spec["frame_size"]
        pad = spec["padding"]
        motions = spec["motions"]
        dirs = spec["directions"]

        total_frames_per_row = sum(motions.values())
        sheet_w = total_frames_per_row * (fw + pad)
        sheet_h = dirs * (fh + pad)

        sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

        # 프레임 이미지 배치 (존재하는 것만)
        frames = sorted(input_dir.glob("*.png")) if input_dir.is_dir() else []
        frame_idx = 0
        for row in range(dirs):
            col = 0
            for motion_name, frame_count in motions.items():
                for f in range(frame_count):
                    x = col * (fw + pad)
                    y = row * (fh + pad)
                    if frame_idx < len(frames):
                        try:
                            frame_img = Image.open(frames[frame_idx]).resize((fw, fh))
                            sheet.paste(frame_img, (x, y))
                        except Exception:
                            pass
                    frame_idx += 1
                    col += 1

        sheet.save(out_path)

        return ProcessResult(
            step="assemble_sheet",
            input_path=str(input_dir),
            output_path=str(out_path),
            success=True,
            duration_ms=(time.time() - t0) * 1000,
            details={
                "spec": spec_name,
                "sheet_size": f"{sheet_w}×{sheet_h}",
                "frames_placed": min(frame_idx, len(frames)),
                "total_slots": total_frames_per_row * dirs,
            },
        )
    except ImportError:
        return ProcessResult(
            step="assemble_sheet",
            input_path=str(input_dir),
            output_path="",
            success=False,
            duration_ms=(time.time() - t0) * 1000,
            error="Pillow not installed",
        )
    except Exception as e:
        return ProcessResult(
            step="assemble_sheet",
            input_path=str(input_dir),
            output_path="",
            success=False,
            duration_ms=(time.time() - t0) * 1000,
            error=str(e),
        )


# ── 파이프라인 ────────────────────────────────────────────

STEP_FUNCTIONS = {
    "remove_bg": step_remove_bg,
    "color_correct": step_color_correct,
    "assemble": step_assemble_sheet,
}

DEFAULT_STEPS = ["remove_bg", "color_correct"]


def run_pipeline(input_path: Path, output_dir: Path,
                 steps: List[str] = None, **kwargs) -> PipelineReport:
    """전체 파이프라인 실행"""
    steps = steps or DEFAULT_STEPS
    output_dir.mkdir(parents=True, exist_ok=True)
    report = PipelineReport(input_path=str(input_path), output_path=str(output_dir))

    current_input = input_path
    t_total = time.time()

    for step_name in steps:
        if step_name not in STEP_FUNCTIONS:
            logger.warning(f"알 수 없는 단계: {step_name}")
            continue

        logger.info(f"[{step_name}] 실행 중...")
        step_fn = STEP_FUNCTIONS[step_name]

        if step_name == "assemble":
            # 조립은 디렉터리 입력
            result = step_fn(current_input if current_input.is_dir() else current_input.parent,
                           output_dir, **kwargs)
        else:
            if current_input.is_dir():
                # 디렉터리 내 모든 이미지 처리
                images = sorted(current_input.glob("*.png"))
                step_dir = output_dir / step_name
                step_dir.mkdir(exist_ok=True)
                all_ok = True
                for img in images:
                    r = step_fn(img, step_dir, **kwargs)
                    if not r.success:
                        all_ok = False
                result = ProcessResult(
                    step=step_name,
                    input_path=str(current_input),
                    output_path=str(step_dir),
                    success=all_ok,
                    details={"files_processed": len(images)},
                )
                current_input = step_dir
            else:
                step_dir = output_dir / step_name
                step_dir.mkdir(exist_ok=True)
                result = step_fn(current_input, step_dir, **kwargs)
                if result.success and result.output_path:
                    current_input = Path(result.output_path)

        report.steps.append(result)

        if not result.success:
            logger.error(f"[{step_name}] 실패: {result.error}")
            report.success = False
            break

        logger.info(f"[{step_name}] ✅ 완료 ({result.duration_ms:.0f}ms)")

    report.total_duration_ms = (time.time() - t_total) * 1000
    return report


def main():
    parser = argparse.ArgumentParser(description="후처리 파이프라인 통합")
    parser.add_argument("--input", "-i", required=True, help="입력 이미지/디렉터리")
    parser.add_argument("--output", "-o", default="output/processed/", help="출력 디렉터리")
    parser.add_argument("--steps", "-s", default="remove_bg,color_correct",
                        help="실행 단계 (쉼표 구분)")
    parser.add_argument("--palette", "-p", default="erebos",
                        choices=list(REGION_PALETTES.keys()), help="지역 팔레트")
    parser.add_argument("--sprite-spec", default="character",
                        choices=list(SPRITE_SPECS.keys()), help="스프라이트 규격")
    parser.add_argument("--dry-run", action="store_true", help="시뮬레이션 모드")
    parser.add_argument("--report", type=str, help="리포트 JSON 저장 경로")

    args = parser.parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output)
    steps = [s.strip() for s in args.steps.split(",")]

    if args.dry_run:
        print(f"[DRY-RUN] 입력: {input_path}")
        print(f"[DRY-RUN] 출력: {output_dir}")
        print(f"[DRY-RUN] 단계: {steps}")
        print(f"[DRY-RUN] 팔레트: {args.palette}")
        return

    report = run_pipeline(
        input_path, output_dir,
        steps=steps,
        palette=args.palette,
        sprite_spec=args.sprite_spec,
    )

    # 리포트 출력
    print(f"\n=== 파이프라인 결과 ===")
    print(f"성공: {report.success}")
    print(f"총 소요시간: {report.total_duration_ms:.0f}ms")
    for s in report.steps:
        status = "✅" if s.success else "❌"
        print(f"  {status} {s.step}: {s.duration_ms:.0f}ms")
        if s.error:
            print(f"     오류: {s.error}")

    if args.report:
        Path(args.report).write_text(
            json.dumps(report.to_dict(), indent=2, ensure_ascii=False)
        )
        print(f"리포트 저장: {args.report}")


if __name__ == "__main__":
    main()
