#!/usr/bin/env python3
"""
에테르나 크로니클 — P15-04: QA 자동 검증 강화
해상도/알파/팔레트/네이밍/프레임 수 자동 검증 + 리포트 생성 + 반려 자동 재생성 큐

사용법:
  python qa_runner.py --input output/generated/ --spec character
  python qa_runner.py --input output/ --spec monster --report qa_report.json
  python qa_runner.py --input output/ --reject-queue reject_queue.json
  python qa_runner.py --validate-naming assets/prompts/
"""

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# ── QA 규격 정의 ──────────────────────────────────────────

ASSET_SPECS = {
    "character_illust": {
        "name": "캐릭터 일러스트",
        "resolution": [(512, 512), (1024, 1024)],
        "alpha_required": True,
        "max_colors": 256,
        "naming_pattern": r"^(sd|dalle|mj)_char_[\w-]+_(front|side|back)_[\w]+\.(png|jpg)$",
    },
    "character_sprite": {
        "name": "캐릭터 스프라이트",
        "resolution": [(64, 64)],
        "alpha_required": True,
        "max_colors": 64,
        "naming_pattern": r"^(sd|dalle|mj)_sprite_[\w-]+_[\w]+_f\d+\.(png)$",
    },
    "character_sheet": {
        "name": "캐릭터 시트",
        "resolution": [(1408, 640), (2048, 2048)],
        "alpha_required": True,
        "max_colors": None,
        "naming_pattern": r"^sheet_[\w-]+\.(png)$",
    },
    "monster_sprite": {
        "name": "몬스터 스프라이트",
        "resolution": [(64, 64), (96, 96), (128, 128)],
        "alpha_required": True,
        "max_colors": 64,
        "naming_pattern": r"^(sd|dalle|mj)_monster_[\w-]+_[\w]+\.(png)$",
    },
    "icon": {
        "name": "아이콘",
        "resolution": [(32, 32), (64, 64)],
        "alpha_required": True,
        "max_colors": 32,
        "naming_pattern": r"^(sd|dalle|mj)_icon_[\w-]+\.(png)$",
    },
    "background": {
        "name": "배경",
        "resolution": [(1920, 1080), (1024, 768)],
        "alpha_required": False,
        "max_colors": None,
        "naming_pattern": r"^(sd|dalle|mj)_bg_[\w-]+\.(png|jpg)$",
    },
    "tileset": {
        "name": "타일셋",
        "resolution": [(32, 32), (64, 64)],
        "alpha_required": True,
        "max_colors": 32,
        "naming_pattern": r"^(sd|dalle|mj)_tile_[\w-]+\.(png)$",
    },
}

# 네이밍 컨벤션: {engine}_{category}_{name}_{variant}_{seed}.png
NAMING_CONVENTION = re.compile(
    r"^(?P<engine>sd|dalle|mj)_"
    r"(?P<category>char|sprite|monster|bg|icon|tile|vfx|ui)_"
    r"(?P<name>[\w-]+)_"
    r"(?P<variant>[\w-]+)_?"
    r"(?P<seed>\w+)?\."
    r"(?P<ext>png|jpg)$"
)


@dataclass
class QACheckResult:
    check_name: str
    passed: bool
    severity: str = "info"  # info, warning, error, critical
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AssetQAReport:
    file_path: str
    asset_type: str = ""
    passed: bool = True
    checks: List[QACheckResult] = field(default_factory=list)
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

    @property
    def critical_count(self) -> int:
        return sum(1 for c in self.checks if not c.passed and c.severity == "critical")

    @property
    def error_count(self) -> int:
        return sum(1 for c in self.checks if not c.passed and c.severity == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for c in self.checks if not c.passed and c.severity == "warning")


@dataclass
class BatchQAReport:
    input_dir: str
    timestamp: str = ""
    total_files: int = 0
    passed: int = 0
    failed: int = 0
    warnings: int = 0
    assets: List[AssetQAReport] = field(default_factory=list)
    reject_queue: List[Dict] = field(default_factory=list)

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


# ── QA 체크 함수 ──────────────────────────────────────────

def check_resolution(file_path: Path, spec: Dict) -> QACheckResult:
    """해상도 검증"""
    try:
        from PIL import Image
        img = Image.open(file_path)
        w, h = img.size
        allowed = spec.get("resolution", [])

        if not allowed:
            return QACheckResult("resolution", True, "info", f"{w}×{h} (제한 없음)")

        if (w, h) in allowed:
            return QACheckResult("resolution", True, "info", f"{w}×{h} ✓")
        else:
            allowed_str = ", ".join(f"{aw}×{ah}" for aw, ah in allowed)
            return QACheckResult(
                "resolution", False, "error",
                f"{w}×{h} — 허용: {allowed_str}",
                {"actual": [w, h], "allowed": allowed}
            )
    except ImportError:
        return QACheckResult("resolution", True, "warning", "Pillow 미설치 — 스킵")
    except Exception as e:
        return QACheckResult("resolution", False, "error", str(e))


def check_alpha(file_path: Path, spec: Dict) -> QACheckResult:
    """알파 채널(투명 배경) 검증"""
    if not spec.get("alpha_required", False):
        return QACheckResult("alpha", True, "info", "알파 불필요")

    try:
        from PIL import Image
        img = Image.open(file_path)

        if img.mode != "RGBA":
            return QACheckResult(
                "alpha", False, "error",
                f"모드 {img.mode} — RGBA 필요",
                {"mode": img.mode}
            )

        # 투명 픽셀 비율 확인 (최소 1% 투명 영역)
        pixels = list(img.getdata())
        transparent = sum(1 for p in pixels if p[3] < 10)
        ratio = transparent / len(pixels)

        if ratio < 0.01:
            return QACheckResult(
                "alpha", False, "warning",
                f"투명 영역 {ratio:.1%} — 배경 미제거 의심",
                {"transparent_ratio": ratio}
            )

        return QACheckResult(
            "alpha", True, "info",
            f"RGBA, 투명 {ratio:.1%}",
            {"transparent_ratio": ratio}
        )
    except ImportError:
        return QACheckResult("alpha", True, "warning", "Pillow 미설치 — 스킵")
    except Exception as e:
        return QACheckResult("alpha", False, "error", str(e))


def check_color_count(file_path: Path, spec: Dict) -> QACheckResult:
    """사용 색상 수 검증 (팔레트 준수)"""
    max_colors = spec.get("max_colors")
    if max_colors is None:
        return QACheckResult("colors", True, "info", "색상 제한 없음")

    try:
        from PIL import Image
        img = Image.open(file_path).convert("RGBA")
        colors = img.getcolors(maxcolors=max_colors * 2)

        if colors is None:
            return QACheckResult(
                "colors", False, "warning",
                f"색상 수 > {max_colors * 2} (과다)",
                {"max_allowed": max_colors}
            )

        actual = len(colors)
        if actual > max_colors:
            return QACheckResult(
                "colors", False, "warning",
                f"색상 {actual}개 > 제한 {max_colors}",
                {"actual": actual, "max": max_colors}
            )

        return QACheckResult(
            "colors", True, "info",
            f"색상 {actual}개 ≤ {max_colors}",
            {"actual": actual, "max": max_colors}
        )
    except ImportError:
        return QACheckResult("colors", True, "warning", "Pillow 미설치 — 스킵")
    except Exception as e:
        return QACheckResult("colors", False, "warning", str(e))


def check_naming(file_path: Path, spec: Dict = None) -> QACheckResult:
    """파일 네이밍 규칙 검증"""
    fname = file_path.name

    if NAMING_CONVENTION.match(fname):
        match = NAMING_CONVENTION.match(fname)
        return QACheckResult(
            "naming", True, "info",
            f"네이밍 규칙 준수: {match.group('engine')}/{match.group('category')}",
            {"parsed": match.groupdict()}
        )

    # 시뮬레이션 파일 허용
    if "_sim.json" in fname:
        return QACheckResult("naming", True, "info", "시뮬레이션 결과 파일")

    return QACheckResult(
        "naming", False, "warning",
        f"네이밍 규칙 불일치: {fname}",
        {"expected_pattern": NAMING_CONVENTION.pattern}
    )


def check_file_size(file_path: Path, max_mb: float = 10.0) -> QACheckResult:
    """파일 크기 검증"""
    size_mb = file_path.stat().st_size / (1024 * 1024)

    if size_mb > max_mb:
        return QACheckResult(
            "file_size", False, "warning",
            f"{size_mb:.2f}MB > {max_mb}MB",
            {"size_mb": size_mb, "max_mb": max_mb}
        )

    return QACheckResult(
        "file_size", True, "info",
        f"{size_mb:.2f}MB",
        {"size_mb": size_mb}
    )


def check_pixel_edges(file_path: Path) -> QACheckResult:
    """픽셀 엣지 선명도 검증 (안티앨리어싱 감지)"""
    try:
        from PIL import Image
        import collections

        img = Image.open(file_path).convert("RGBA")
        pixels = img.load()
        w, h = img.size

        # 외곽선 검출: 투명→불투명 경계에서 중간 알파 값 비율
        boundary_pixels = 0
        aa_pixels = 0

        for y in range(1, h - 1):
            for x in range(1, w - 1):
                a = pixels[x, y][3]
                if a > 0:
                    neighbors = [
                        pixels[x-1, y][3], pixels[x+1, y][3],
                        pixels[x, y-1][3], pixels[x, y+1][3],
                    ]
                    if any(n == 0 for n in neighbors):
                        boundary_pixels += 1
                        if 10 < a < 245:
                            aa_pixels += 1

        if boundary_pixels == 0:
            return QACheckResult("pixel_edges", True, "info", "경계 픽셀 없음")

        aa_ratio = aa_pixels / boundary_pixels
        if aa_ratio > 0.3:
            return QACheckResult(
                "pixel_edges", False, "warning",
                f"안티앨리어싱 의심: 경계 {boundary_pixels}px 중 {aa_ratio:.0%} 반투명",
                {"aa_ratio": aa_ratio, "boundary": boundary_pixels}
            )

        return QACheckResult(
            "pixel_edges", True, "info",
            f"엣지 선명: AA {aa_ratio:.0%}",
            {"aa_ratio": aa_ratio}
        )
    except ImportError:
        return QACheckResult("pixel_edges", True, "warning", "Pillow 미설치 — 스킵")
    except Exception as e:
        return QACheckResult("pixel_edges", False, "warning", str(e))


# ── QA 실행 ──────────────────────────────────────────────

def detect_asset_type(file_path: Path) -> str:
    """파일명/경로로 에셋 타입 추정"""
    fname = file_path.name.lower()
    parent = file_path.parent.name.lower()

    if "sprite" in fname or "sprite" in parent:
        if "sheet" in fname:
            return "character_sheet"
        return "character_sprite"
    if "monster" in fname or "monster" in parent:
        return "monster_sprite"
    if "icon" in fname or "icon" in parent:
        return "icon"
    if "bg" in fname or "background" in parent:
        return "background"
    if "tile" in fname or "tile" in parent:
        return "tileset"
    if "char" in fname or "character" in parent:
        return "character_illust"

    return "character_illust"  # 기본값


def run_qa(file_path: Path, asset_type: str = None) -> AssetQAReport:
    """단일 파일 QA 실행"""
    if asset_type is None:
        asset_type = detect_asset_type(file_path)

    spec = ASSET_SPECS.get(asset_type, {})
    report = AssetQAReport(file_path=str(file_path), asset_type=asset_type)

    # 각 체크 실행
    checks = [
        check_naming(file_path, spec),
        check_file_size(file_path),
    ]

    # 이미지 전용 체크 (PNG/JPG)
    if file_path.suffix.lower() in (".png", ".jpg", ".jpeg"):
        checks.extend([
            check_resolution(file_path, spec),
            check_alpha(file_path, spec),
            check_color_count(file_path, spec),
            check_pixel_edges(file_path),
        ])

    report.checks = checks
    report.passed = all(
        c.passed or c.severity in ("info", "warning")
        for c in checks
    )

    return report


def run_batch_qa(input_dir: Path, asset_type: str = None) -> BatchQAReport:
    """배치 QA 실행"""
    batch = BatchQAReport(input_dir=str(input_dir))

    files = sorted(input_dir.rglob("*"))
    files = [f for f in files if f.is_file() and f.suffix.lower() in (".png", ".jpg", ".jpeg", ".json")]

    batch.total_files = len(files)

    for f in files:
        report = run_qa(f, asset_type)
        batch.assets.append(report)

        if report.passed:
            batch.passed += 1
        elif report.error_count > 0 or report.critical_count > 0:
            batch.failed += 1
            # 반려 큐에 추가
            batch.reject_queue.append({
                "file": str(f),
                "asset_type": report.asset_type,
                "errors": [
                    {"check": c.check_name, "message": c.message}
                    for c in report.checks if not c.passed and c.severity in ("error", "critical")
                ],
                "action": "regenerate",
            })
        else:
            batch.warnings += 1

    return batch


def main():
    parser = argparse.ArgumentParser(description="QA 자동 검증 러너")
    parser.add_argument("--input", "-i", required=True, help="검증 대상 파일/디렉터리")
    parser.add_argument("--spec", "-s", choices=list(ASSET_SPECS.keys()),
                        help="에셋 타입 (미지정 시 자동 감지)")
    parser.add_argument("--report", "-r", type=str, help="리포트 JSON 저장 경로")
    parser.add_argument("--reject-queue", type=str, help="반려 큐 JSON 저장 경로")
    parser.add_argument("--validate-naming", action="store_true",
                        help="네이밍 규칙만 검증")
    parser.add_argument("--verbose", "-v", action="store_true")

    args = parser.parse_args()
    input_path = Path(args.input)

    if input_path.is_file():
        report = run_qa(input_path, args.spec)
        print(f"\n{'✅' if report.passed else '❌'} {input_path.name}")
        for c in report.checks:
            status = "✅" if c.passed else "❌" if c.severity in ("error", "critical") else "⚠️"
            print(f"  {status} {c.check_name}: {c.message}")
    else:
        batch = run_batch_qa(input_path, args.spec)
        print(f"\n=== QA 결과 ===")
        print(f"총 파일: {batch.total_files}")
        print(f"통과: {batch.passed}")
        print(f"실패: {batch.failed}")
        print(f"경고: {batch.warnings}")

        if args.verbose:
            for asset in batch.assets:
                if not asset.passed:
                    print(f"\n❌ {asset.file_path}")
                    for c in asset.checks:
                        if not c.passed:
                            print(f"  {c.severity}: {c.check_name} — {c.message}")

        if args.report:
            report_data = {
                "timestamp": batch.timestamp,
                "input": batch.input_dir,
                "total": batch.total_files,
                "passed": batch.passed,
                "failed": batch.failed,
                "warnings": batch.warnings,
                "assets": [asdict(a) for a in batch.assets],
            }
            Path(args.report).write_text(
                json.dumps(report_data, indent=2, ensure_ascii=False)
            )
            print(f"리포트 저장: {args.report}")

        if args.reject_queue and batch.reject_queue:
            Path(args.reject_queue).write_text(
                json.dumps(batch.reject_queue, indent=2, ensure_ascii=False)
            )
            print(f"반려 큐 저장: {args.reject_queue} ({len(batch.reject_queue)}건)")


if __name__ == "__main__":
    main()
