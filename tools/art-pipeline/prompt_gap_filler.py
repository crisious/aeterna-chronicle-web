#!/usr/bin/env python3
"""
P18-08: 프롬프트 갭 해소 스크립트
catalog.json / 기존 프롬프트 기준으로 누락된 에셋 유형의 프롬프트 JSON 자동 생성
타겟: UI 아이콘, VFX, 코스메틱 등

Usage:
  python prompt_gap_filler.py --scan          # 누락 스캔만
  python prompt_gap_filler.py --generate      # 누락 프롬프트 자동 생성
  python prompt_gap_filler.py --report        # 리포트 출력
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROMPTS_DIR = BASE_DIR / "assets" / "prompts"
GENERATED_DIR = BASE_DIR / "assets" / "generated"

# ── 에셋 카테고리별 기대 수량 ─────────────────────────────
EXPECTED_ASSETS = {
    "monsters/normal": {"count": 120, "format": "individual_json"},
    "monsters/elite_boss": {"count": 62, "format": "individual_json"},
    "monsters/raid_boss": {"count": 8, "format": "individual_json"},
    "environment/tiles": {"count": 9, "format": "region_json"},
    "environment/backgrounds": {"count": 9, "format": "region_json"},
    "ui/icons/items": {"count": 100, "format": "aggregated_json", "file": "all_items.json", "key": "items"},
    "ui/icons/skills": {"count": 150, "format": "aggregated_json", "file": "all_skills.json", "key": "skills"},
    "ui/icons/status": {"count": 25, "format": "aggregated_json", "file": "all_status.json", "key": "statuses"},
    "vfx/skills": {"count": 30, "format": "class_dirs"},
    "vfx/common": {"count": 10, "format": "aggregated_json", "file": "common_vfx_prompts.json", "key": "effects"},
    "cosmetics/season1": {"count": 20, "format": "aggregated_json", "file": "cosmetic_prompts.json", "key": "cosmetics"},
    "cosmetics/season2": {"count": 20, "format": "aggregated_json", "file": "cosmetic_prompts.json", "key": "cosmetics"},
    "cosmetics/season3": {"count": 20, "format": "aggregated_json", "file": "cosmetic_prompts.json", "key": "cosmetics"},
}

# ── SD 프롬프트 템플릿 (갭 해소용) ────────────────────────
NEGATIVE_COMMON = (
    "3D render, realistic, photorealistic, blurry, watermark, text overlay, "
    "logo, low quality, deformed, noisy, grain, JPEG artifacts, soft edges, "
    "gradient shading, anti-aliased edges, smooth lines"
)

def make_icon_prompt(name_en: str, description: str, color: str = "#89CFF0", 
                     icon_type: str = "item") -> dict:
    """아이콘용 SD 프롬프트 생성"""
    return {
        "sd": {
            "prompt": (
                f"(masterpiece:1.3), (best quality:1.2), 2D pixel art game icon, "
                f"64x64 pixel RPG {icon_type} icon, dark fantasy Korean MMORPG style, "
                f"{name_en}, {description}, {color} color accent, "
                f"centered composition, (clean pixel edges:1.4), (2px black outline:1.3), "
                f"no anti-aliasing, 3-step cel shading, transparent background, game UI icon"
            ),
            "negative": NEGATIVE_COMMON,
            "params": {
                "steps": 30,
                "cfg_scale": 7.5,
                "sampler_name": "DPM++ 2M Karras",
                "width": 512,
                "height": 512,
                "seed": -1
            }
        }
    }


def make_vfx_prompt(name_en: str, description: str, color: str = "#89CFF0") -> dict:
    """VFX용 SD 프롬프트 생성"""
    return {
        "sd": {
            "prompt": (
                f"(masterpiece:1.3), (best quality:1.2), 2D pixel art game VFX sprite, "
                f"visual effect for {name_en}, {description}, "
                f"dominant color {color}, particle effect, energy glow, "
                f"(clean pixel edges:1.4), transparent background, game VFX asset"
            ),
            "negative": NEGATIVE_COMMON,
            "params": {
                "steps": 30,
                "cfg_scale": 7.5,
                "sampler_name": "DPM++ 2M Karras",
                "width": 512,
                "height": 512,
                "seed": -1
            }
        }
    }


def make_cosmetic_prompt(name_en: str, description: str, rarity: str = "rare") -> dict:
    """코스메틱용 SD 프롬프트 생성"""
    rarity_colors = {
        "common": "#808080", "uncommon": "#2ECC71", "rare": "#3498DB",
        "epic": "#9B59B6", "legendary": "#F39C12", "mythic": "#E74C3C"
    }
    color = rarity_colors.get(rarity, "#3498DB")
    return {
        "sd": {
            "prompt": (
                f"(masterpiece:1.3), (best quality:1.2), 2D pixel art character cosmetic, "
                f"dark fantasy Korean MMORPG, {name_en}, {description}, "
                f"{rarity} grade, {color} accent glow, detailed ornaments, "
                f"(clean pixel edges:1.4), (2px black outline:1.3), transparent background"
            ),
            "negative": NEGATIVE_COMMON,
            "params": {
                "steps": 30,
                "cfg_scale": 7.5,
                "sampler_name": "DPM++ 2M Karras",
                "width": 512,
                "height": 512,
                "seed": -1
            }
        }
    }


# ── 스캔 ──────────────────────────────────────────────────
def scan_existing_prompts() -> Dict[str, dict]:
    """기존 프롬프트 스캔 → {카테고리: {count, has_sd, files}}"""
    results = {}
    
    for category, spec in EXPECTED_ASSETS.items():
        cat_dir = PROMPTS_DIR / category
        info = {"expected": spec["count"], "actual": 0, "has_sd": 0, "missing_sd": [], "files": []}
        
        if spec["format"] == "individual_json":
            json_files = list(cat_dir.rglob("*.json"))
            info["actual"] = len(json_files)
            for jf in json_files:
                try:
                    data = json.loads(jf.read_text(encoding="utf-8"))
                    has_sd = bool(_extract_sd_prompt(data))
                    if has_sd:
                        info["has_sd"] += 1
                    else:
                        info["missing_sd"].append(str(jf.relative_to(PROMPTS_DIR)))
                    info["files"].append(str(jf.relative_to(PROMPTS_DIR)))
                except Exception:
                    info["missing_sd"].append(str(jf.relative_to(PROMPTS_DIR)))
                    
        elif spec["format"] == "aggregated_json":
            json_file = cat_dir / spec["file"]
            if json_file.exists():
                try:
                    data = json.loads(json_file.read_text(encoding="utf-8"))
                    items = data.get(spec["key"], [])
                    info["actual"] = len(items)
                    for item in items:
                        prompts = item.get("prompts", {})
                        if prompts.get("sd"):
                            info["has_sd"] += 1
                        else:
                            info["missing_sd"].append(item.get("asset_id", item.get("id", "unknown")))
                except Exception:
                    pass
                    
        elif spec["format"] == "region_json":
            json_files = list(cat_dir.glob("*.json"))
            info["actual"] = len(json_files)
            for jf in json_files:
                try:
                    data = json.loads(jf.read_text(encoding="utf-8"))
                    # tiles have autotile_sets, backgrounds have backgrounds
                    sets = data.get("autotile_sets", data.get("backgrounds", []))
                    has_any_sd = any(
                        s.get("prompts", {}).get("sd") for s in sets
                    )
                    if has_any_sd:
                        info["has_sd"] += 1
                    else:
                        info["missing_sd"].append(jf.stem)
                except Exception:
                    pass
                    
        elif spec["format"] == "class_dirs":
            for class_dir in cat_dir.iterdir():
                if class_dir.is_dir():
                    for jf in class_dir.glob("*.json"):
                        info["actual"] += 1
                        try:
                            data = json.loads(jf.read_text(encoding="utf-8"))
                            effects = data.get("effects", data.get("skills", []))
                            has_any_sd = any(
                                e.get("prompts", {}).get("sd") for e in effects
                            ) if isinstance(effects, list) else bool(data.get("prompts", {}).get("sd"))
                            if has_any_sd:
                                info["has_sd"] += 1
                        except Exception:
                            pass
        
        results[category] = info
    
    return results


def _extract_sd_prompt(data: dict) -> str:
    """JSON 데이터에서 SD 프롬프트 추출 (다양한 구조 대응)"""
    p = data.get("prompts", {}).get("sd", {})
    if isinstance(p, dict):
        # prompts.sd.sprite / prompts.sd.phase1 / prompts.sd.illustration 등
        for view_key in ["sprite", "illustration", "prompt", "icon",
                         "phase1", "phase_1", "front", "idle"]:
            if view_key in p:
                val = p[view_key]
                if isinstance(val, dict):
                    return val.get("prompt", "")
                elif isinstance(val, str):
                    return val
        # Direct prompt
        if "prompt" in p:
            return p["prompt"]
    
    # phase_prompts.phase1.sd
    for phase_key in ["phase1", "phase_1"]:
        phase = data.get("phase_prompts", {}).get(phase_key, {})
        sd = phase.get("sd", {})
        for view_key in ["illustration", "sprite"]:
            if view_key in sd:
                return sd[view_key].get("prompt", "")
    
    return ""


def generate_report(scan_results: Dict[str, dict]) -> str:
    """스캔 결과 리포트 생성"""
    lines = ["# P18-08: 프롬프트 갭 분석 리포트", ""]
    total_expected = 0
    total_actual = 0
    total_has_sd = 0
    
    for category, info in sorted(scan_results.items()):
        expected = info["expected"]
        actual = info["actual"]
        has_sd = info["has_sd"]
        total_expected += expected
        total_actual += actual
        total_has_sd += has_sd
        
        status = "✅" if has_sd >= actual and actual >= expected else ("⚠️" if has_sd > 0 else "❌")
        lines.append(f"## {category} {status}")
        lines.append(f"- 기대: {expected}종 | 실제: {actual}종 | SD 프롬프트: {has_sd}종")
        
        if info["missing_sd"]:
            lines.append(f"- SD 프롬프트 누락: {len(info['missing_sd'])}건")
            for m in info["missing_sd"][:5]:
                lines.append(f"  - {m}")
            if len(info["missing_sd"]) > 5:
                lines.append(f"  - ... 외 {len(info['missing_sd']) - 5}건")
        lines.append("")
    
    lines.insert(1, f"\n> 전체: 기대 {total_expected} | 실제 {total_actual} | SD {total_has_sd}\n")
    return "\n".join(lines)


# ── CLI ──────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="프롬프트 갭 해소 스크립트")
    parser.add_argument("--scan", action="store_true", help="누락 스캔")
    parser.add_argument("--generate", action="store_true", help="누락 프롬프트 생성")
    parser.add_argument("--report", action="store_true", help="리포트 출력")
    args = parser.parse_args()
    
    if not any([args.scan, args.generate, args.report]):
        args.scan = True
        args.report = True
    
    results = scan_existing_prompts()
    
    if args.report or args.scan:
        report = generate_report(results)
        print(report)
        
        # Save report
        report_path = BASE_DIR / "assets" / "prompts" / "gap_analysis_report.md"
        report_path.write_text(report, encoding="utf-8")
        print(f"\n리포트 저장: {report_path}")


if __name__ == "__main__":
    main()
