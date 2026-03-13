#!/usr/bin/env python3
"""
P18-09~14: 통합 배치 이미지 생성 러너
ComfyUI API를 통해 몬스터, 환경, 아이콘 이미지를 순차 생성한다.

Usage:
  python p18_batch_runner.py --all              # 전체 생성
  python p18_batch_runner.py --monsters-normal   # 일반 몬스터만
  python p18_batch_runner.py --monsters-elite    # 엘리트/보스만
  python p18_batch_runner.py --monsters-raid     # 레이드 보스만
  python p18_batch_runner.py --environment       # 환경 타일+배경
  python p18_batch_runner.py --icons             # 아이콘 전체
  python p18_batch_runner.py --dry-run           # 실행 없이 목록만
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# 같은 디렉터리의 comfyui_engine 임포트
sys.path.insert(0, str(Path(__file__).parent))
from comfyui_engine import ComfyUIEngine, build_txt2img_workflow

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("p18_batch")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROMPTS_DIR = BASE_DIR / "assets" / "prompts"
GENERATED_DIR = BASE_DIR / "assets" / "generated"

DEFAULT_CHECKPOINT = "v1-5-pruned-emaonly.safetensors"
LORA_PATTERN = re.compile(r'<lora:[^>]+>')


@dataclass
class GenerationTask:
    """단일 이미지 생성 태스크"""
    asset_id: str
    prompt: str
    negative: str
    output_dir: str
    filename: str
    width: int = 512
    height: int = 512
    steps: int = 20
    cfg: float = 7.0
    sampler: str = "euler"
    category: str = ""


@dataclass
class BatchStats:
    total: int = 0
    success: int = 0
    failed: int = 0
    skipped: int = 0
    errors: List[str] = field(default_factory=list)


def clean_prompt(text: str) -> str:
    """LoRA 태그 제거 + 정리"""
    text = LORA_PATTERN.sub('', text)
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ── 몬스터 태스크 수집 ───────────────────────────────────
def collect_monster_normal_tasks() -> List[GenerationTask]:
    """일반 몬스터 120종 태스크"""
    tasks = []
    prompts_dir = PROMPTS_DIR / "monsters" / "normal"
    output_dir = str(GENERATED_DIR / "monsters" / "normal")
    
    for jf in sorted(prompts_dir.rglob("*.json")):
        data = json.loads(jf.read_text(encoding="utf-8"))
        asset_id = data.get("asset_id", jf.stem)
        sd = data.get("prompts", {}).get("sd", {})
        
        # sprite 뷰가 기본
        for view_key in ["sprite", "front", "idle"]:
            if view_key in sd:
                view_data = sd[view_key]
                params = view_data.get("params", {})
                tasks.append(GenerationTask(
                    asset_id=asset_id,
                    prompt=clean_prompt(view_data.get("prompt", "")),
                    negative=view_data.get("negative", ""),
                    output_dir=output_dir,
                    filename=asset_id,
                    width=params.get("width", 512),
                    height=params.get("height", 512),
                    steps=min(params.get("steps", 20), 20),  # cap at 20
                    cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                    category="monster_normal",
                ))
                break
    
    return tasks


def collect_monster_elite_tasks() -> List[GenerationTask]:
    """엘리트/보스 몬스터 62종 태스크 (phase1만)"""
    tasks = []
    prompts_dir = PROMPTS_DIR / "monsters" / "elite_boss"
    output_dir = str(GENERATED_DIR / "monsters" / "elite_boss")
    
    for jf in sorted(prompts_dir.rglob("*.json")):
        data = json.loads(jf.read_text(encoding="utf-8"))
        asset_id = data.get("asset_id", jf.stem)
        sd = data.get("prompts", {}).get("sd", {})
        
        # elite_boss: phase1 또는 sprite
        for view_key in ["phase1", "sprite", "illustration"]:
            if view_key in sd:
                view_data = sd[view_key]
                params = view_data.get("params", {})
                tasks.append(GenerationTask(
                    asset_id=asset_id,
                    prompt=clean_prompt(view_data.get("prompt", "")),
                    negative=view_data.get("negative", ""),
                    output_dir=output_dir,
                    filename=asset_id,
                    width=min(params.get("width", 512), 512),  # cap at 512
                    height=min(params.get("height", 512), 512),
                    steps=min(params.get("steps", 20), 20),
                    cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                    category="monster_elite",
                ))
                break
    
    return tasks


def collect_monster_raid_tasks() -> List[GenerationTask]:
    """레이드 보스 8종 × 4페이즈 = 32장"""
    tasks = []
    prompts_dir = PROMPTS_DIR / "monsters" / "raid_boss"
    output_dir = str(GENERATED_DIR / "monsters" / "raid_boss")
    
    for jf in sorted(prompts_dir.glob("*.json")):
        data = json.loads(jf.read_text(encoding="utf-8"))
        asset_id = data.get("asset_id", jf.stem)
        
        # phase_prompts 구조
        phase_prompts = data.get("phase_prompts", {})
        if not phase_prompts:
            # fallback: prompts.sd.phase*
            phase_prompts_alt = data.get("prompts", {}).get("sd", {})
            for key in sorted(phase_prompts_alt.keys()):
                if key.startswith("phase"):
                    phase_prompts[key] = {"sd": {"illustration": phase_prompts_alt[key]}}
        
        for phase_key in ["phase1", "phase2", "phase3", "phase4"]:
            phase = phase_prompts.get(phase_key, {})
            sd = phase.get("sd", {})
            
            for view_key in ["illustration", "sprite", "front"]:
                if view_key in sd:
                    view_data = sd[view_key]
                    params = view_data.get("params", {})
                    tasks.append(GenerationTask(
                        asset_id=asset_id,
                        prompt=clean_prompt(view_data.get("prompt", "")),
                        negative=view_data.get("negative", ""),
                        output_dir=output_dir,
                        filename=f"{asset_id}_{phase_key}",
                        width=min(params.get("width", 512), 512),
                        height=min(params.get("height", 512), 512),
                        steps=min(params.get("steps", 20), 20),
                        cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                        category="monster_raid",
                    ))
                    break
    
    return tasks


# ── 환경 태스크 수집 ─────────────────────────────────────
def collect_environment_tasks() -> List[GenerationTask]:
    """환경 타일셋 + 배경 태스크"""
    tasks = []
    target_regions = {"erebos", "sylvanheim", "solaris", "silvanhime"}
    
    # 타일셋
    tiles_dir = PROMPTS_DIR / "environment" / "tiles"
    for jf in sorted(tiles_dir.glob("*.json")):
        region = jf.stem
        data = json.loads(jf.read_text(encoding="utf-8"))
        region_en = data.get("region_en", region)
        output_dir = str(GENERATED_DIR / "environment" / "tiles")
        
        for i, tileset in enumerate(data.get("autotile_sets", [])):
            tile_id = tileset.get("id", f"{region}_tile_{i}")
            sd = tileset.get("prompts", {}).get("sd", {})
            prompt = sd.get("prompt", "")
            if not prompt:
                continue
            params = sd.get("params", {})
            
            # center piece 생성 (대표 타일)
            prompt_text = prompt.replace("{piece_description}", 
                tileset.get("pieces", {}).get("center", "center tile"))
            
            tasks.append(GenerationTask(
                asset_id=tile_id,
                prompt=clean_prompt(prompt_text),
                negative=sd.get("negative", ""),
                output_dir=output_dir,
                filename=tile_id,
                width=min(params.get("width", 512), 512),
                height=min(params.get("height", 512), 512),
                steps=min(params.get("steps", 20), 20),
                cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                category="env_tile",
            ))
    
    # 배경
    bg_dir = PROMPTS_DIR / "environment" / "backgrounds"
    for jf in sorted(bg_dir.glob("*.json")):
        region = jf.stem
        data = json.loads(jf.read_text(encoding="utf-8"))
        output_dir = str(GENERATED_DIR / "environment" / "backgrounds")
        
        for bg in data.get("backgrounds", []):
            bg_id = bg.get("id", f"{region}_bg")
            sd = bg.get("prompts", {}).get("sd", {})
            prompt = sd.get("prompt", "")
            if not prompt:
                continue
            params = sd.get("params", {})
            
            # 배경은 너비가 클 수 있으나 512로 제한
            tasks.append(GenerationTask(
                asset_id=bg_id,
                prompt=clean_prompt(prompt),
                negative=sd.get("negative", ""),
                output_dir=output_dir,
                filename=bg_id,
                width=512,
                height=512,
                steps=min(params.get("steps", 20), 20),
                cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                category="env_bg",
            ))
    
    return tasks


# ── 아이콘 태스크 수집 ───────────────────────────────────
def collect_icon_tasks() -> List[GenerationTask]:
    """아이템 100 + 스킬 150(+공통) + 상태이상 25 아이콘"""
    tasks = []
    
    # 아이템 아이콘
    items_file = PROMPTS_DIR / "ui" / "icons" / "items" / "all_items.json"
    if items_file.exists():
        data = json.loads(items_file.read_text(encoding="utf-8"))
        output_dir = str(GENERATED_DIR / "ui" / "icons" / "items")
        for item in data.get("items", []):
            asset_id = item.get("asset_id", "unknown")
            sd = item.get("prompts", {}).get("sd", {})
            prompt = sd.get("prompt", "")
            if not prompt:
                continue
            params = sd.get("params", {})
            tasks.append(GenerationTask(
                asset_id=asset_id,
                prompt=clean_prompt(prompt),
                negative=sd.get("negative", ""),
                output_dir=output_dir,
                filename=asset_id,
                width=min(params.get("width", 512), 512),
                height=min(params.get("height", 512), 512),
                steps=min(params.get("steps", 20), 20),
                cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                category="icon_item",
            ))
    
    # 스킬 아이콘 - 통합 파일
    skills_file = PROMPTS_DIR / "ui" / "icons" / "skills" / "all_skills.json"
    if skills_file.exists():
        data = json.loads(skills_file.read_text(encoding="utf-8"))
        output_dir = str(GENERATED_DIR / "ui" / "icons" / "skills")
        for skill in data.get("skills", []):
            asset_id = skill.get("asset_id", "unknown")
            sd = skill.get("prompts", {}).get("sd", {})
            prompt = sd.get("prompt", "")
            if not prompt:
                continue
            params = sd.get("params", {})
            tasks.append(GenerationTask(
                asset_id=asset_id,
                prompt=clean_prompt(prompt),
                negative=sd.get("negative", ""),
                output_dir=output_dir,
                filename=asset_id,
                width=min(params.get("width", 512), 512),
                height=min(params.get("height", 512), 512),
                steps=min(params.get("steps", 20), 20),
                cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                category="icon_skill",
            ))
    
    # 상태이상 아이콘
    status_file = PROMPTS_DIR / "ui" / "icons" / "status" / "all_status.json"
    if status_file.exists():
        data = json.loads(status_file.read_text(encoding="utf-8"))
        output_dir = str(GENERATED_DIR / "ui" / "icons" / "status")
        for status in data.get("statuses", []):
            asset_id = status.get("id", "unknown")
            sd = status.get("prompts", {}).get("sd", {})
            prompt = sd.get("prompt", "")
            if not prompt:
                continue
            params = sd.get("params", {})
            tasks.append(GenerationTask(
                asset_id=asset_id,
                prompt=clean_prompt(prompt),
                negative=sd.get("negative", ""),
                output_dir=output_dir,
                filename=asset_id,
                width=min(params.get("width", 512), 512),
                height=min(params.get("height", 512), 512),
                steps=min(params.get("steps", 20), 20),
                cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                category="icon_status",
            ))
    
    return tasks


# ── 배치 실행 ────────────────────────────────────────────
def run_tasks(engine: ComfyUIEngine, tasks: List[GenerationTask], 
              dry_run: bool = False) -> BatchStats:
    """태스크 리스트 순차 실행"""
    stats = BatchStats(total=len(tasks))
    
    for idx, task in enumerate(tasks, 1):
        save_path = os.path.join(task.output_dir, f"{task.filename}.png")
        
        if os.path.exists(save_path):
            log.info(f"[{idx}/{stats.total}] SKIP (exists): {task.filename}")
            stats.skipped += 1
            continue
        
        if dry_run:
            log.info(f"[{idx}/{stats.total}] DRY-RUN: {task.filename} ({task.category})")
            stats.skipped += 1
            continue
        
        log.info(f"[{idx}/{stats.total}] GEN: {task.filename} ({task.category})")
        
        workflow = build_txt2img_workflow(
            prompt=task.prompt,
            negative=task.negative,
            checkpoint=DEFAULT_CHECKPOINT,
            steps=task.steps,
            cfg=task.cfg,
            sampler_name=task.sampler,
            width=task.width,
            height=task.height,
        )
        
        for attempt in range(1, 4):
            try:
                saved = engine.generate_and_save(
                    workflow=workflow,
                    output_path=task.output_dir,
                    output_filename=task.filename,
                    timeout=300,
                )
                if saved:
                    stats.success += 1
                else:
                    stats.failed += 1
                    stats.errors.append(f"{task.filename}: no output")
                break
            except Exception as e:
                log.warning(f"  attempt {attempt}/3 failed: {e}")
                if attempt == 3:
                    stats.failed += 1
                    stats.errors.append(f"{task.filename}: {e}")
                else:
                    time.sleep(5)
        
        done = stats.success + stats.failed + stats.skipped
        pct = done / stats.total * 100
        if idx % 10 == 0 or idx == stats.total:
            log.info(f"  Progress: {pct:.0f}% ({done}/{stats.total}) "
                     f"ok={stats.success} fail={stats.failed} skip={stats.skipped}")
    
    return stats


# ── CLI ──────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="P18 통합 배치 이미지 생성")
    parser.add_argument("--url", default="http://127.0.0.1:8188")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--monsters-normal", action="store_true")
    parser.add_argument("--monsters-elite", action="store_true")
    parser.add_argument("--monsters-raid", action="store_true")
    parser.add_argument("--environment", action="store_true")
    parser.add_argument("--icons", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    
    if args.all:
        args.monsters_normal = True
        args.monsters_elite = True
        args.monsters_raid = True
        args.environment = True
        args.icons = True
    
    if not any([args.monsters_normal, args.monsters_elite, args.monsters_raid,
                args.environment, args.icons]):
        parser.print_help()
        sys.exit(1)
    
    # 태스크 수집
    all_tasks = []
    if args.monsters_normal:
        tasks = collect_monster_normal_tasks()
        log.info(f"몬스터(일반): {len(tasks)}건")
        all_tasks.extend(tasks)
    if args.monsters_elite:
        tasks = collect_monster_elite_tasks()
        log.info(f"몬스터(엘리트/보스): {len(tasks)}건")
        all_tasks.extend(tasks)
    if args.monsters_raid:
        tasks = collect_monster_raid_tasks()
        log.info(f"몬스터(레이드): {len(tasks)}건")
        all_tasks.extend(tasks)
    if args.environment:
        tasks = collect_environment_tasks()
        log.info(f"환경(타일+배경): {len(tasks)}건")
        all_tasks.extend(tasks)
    if args.icons:
        tasks = collect_icon_tasks()
        log.info(f"아이콘: {len(tasks)}건")
        all_tasks.extend(tasks)
    
    log.info(f"전체 태스크: {len(all_tasks)}건")
    
    if args.dry_run:
        stats = run_tasks(None, all_tasks, dry_run=True)
    else:
        engine = ComfyUIEngine(args.url)
        if not engine.test_connection():
            log.error("ComfyUI 연결 실패")
            sys.exit(1)
        stats = run_tasks(engine, all_tasks)
    
    # 결과 요약
    log.info(f"\n{'='*60}")
    log.info(f"배치 완료: 총 {stats.total}건")
    log.info(f"  성공: {stats.success}")
    log.info(f"  실패: {stats.failed}")
    log.info(f"  스킵: {stats.skipped}")
    if stats.errors:
        log.info(f"  에러 ({len(stats.errors)}건):")
        for err in stats.errors[:20]:
            log.info(f"    - {err}")
        if len(stats.errors) > 20:
            log.info(f"    ... 외 {len(stats.errors)-20}건")
    
    # 결과 JSON 저장
    result_path = BASE_DIR / "assets" / "generated" / "batch_result.json"
    os.makedirs(result_path.parent, exist_ok=True)
    result_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total": stats.total,
        "success": stats.success,
        "failed": stats.failed,
        "skipped": stats.skipped,
        "errors": stats.errors[:50],
    }
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(result_data, f, indent=2, ensure_ascii=False)
    log.info(f"결과 저장: {result_path}")


if __name__ == "__main__":
    main()
