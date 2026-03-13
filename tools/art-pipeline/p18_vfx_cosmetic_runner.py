#!/usr/bin/env python3
"""
P18-15~16: VFX 이펙트 210종 + 코스메틱 150종 배치 생성 러너
ComfyUI API를 통해 순차 생성한다.

Usage:
  python p18_vfx_cosmetic_runner.py --all
  python p18_vfx_cosmetic_runner.py --vfx
  python p18_vfx_cosmetic_runner.py --cosmetics
  python p18_vfx_cosmetic_runner.py --dry-run --all
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
from typing import List

sys.path.insert(0, str(Path(__file__).parent))
from comfyui_engine import ComfyUIEngine, build_txt2img_workflow

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("p18_vfx_cos")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROMPTS_DIR = BASE_DIR / "assets" / "prompts"
GENERATED_DIR = BASE_DIR / "assets" / "generated"

DEFAULT_CHECKPOINT = "v1-5-pruned-emaonly.safetensors"
LORA_PATTERN = re.compile(r'<lora:[^>]+>')

CLASSES = [
    "ether_knight", "memory_weaver", "shadow_weaver",
    "memory_breaker", "time_guardian", "void_wanderer",
]


@dataclass
class GenerationTask:
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
    text = LORA_PATTERN.sub('', text)
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ── VFX 태스크 수집 ──────────────────────────────────────
def collect_vfx_skill_tasks() -> List[GenerationTask]:
    """6클래스 × 30 = 180 스킬 VFX"""
    tasks = []
    for cls in CLASSES:
        jf = PROMPTS_DIR / "vfx" / "skills" / cls / "vfx_prompts.json"
        if not jf.exists():
            log.warning(f"VFX prompt not found: {jf}")
            continue
        data = json.loads(jf.read_text(encoding="utf-8"))
        output_dir = str(GENERATED_DIR / "vfx" / "skills" / cls)
        for effect in data.get("effects", []):
            asset_id = effect.get("asset_id", "unknown")
            sd = effect.get("prompts", {}).get("sd", {})
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
                height=min(params.get("height", 64), 512),
                steps=min(params.get("steps", 20), 20),
                cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
                sampler="euler",
                category=f"vfx_skill_{cls}",
            ))
    return tasks


def collect_vfx_common_tasks() -> List[GenerationTask]:
    """공통 VFX 30종"""
    tasks = []
    jf = PROMPTS_DIR / "vfx" / "common" / "common_vfx_prompts.json"
    if not jf.exists():
        log.warning(f"Common VFX not found: {jf}")
        return tasks
    data = json.loads(jf.read_text(encoding="utf-8"))
    output_dir = str(GENERATED_DIR / "vfx" / "common")
    for effect in data.get("effects", []):
        asset_id = effect.get("asset_id", "unknown")
        sd = effect.get("prompts", {}).get("sd", {})
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
            height=min(params.get("height", 64), 512),
            steps=min(params.get("steps", 20), 20),
            cfg=min(params.get("cfg_scale", params.get("cfg", 7.0)), 7.0),
            sampler="euler",
            category="vfx_common",
        ))
    return tasks


# ── 코스메틱 태스크 수집 ─────────────────────────────────
def collect_cosmetic_tasks() -> List[GenerationTask]:
    """시즌1~3 코스메틱 총 150종"""
    tasks = []
    for season in ["season1", "season2", "season3"]:
        jf = PROMPTS_DIR / "cosmetics" / season / "cosmetic_prompts.json"
        if not jf.exists():
            log.warning(f"Cosmetic prompts not found: {jf}")
            continue
        data = json.loads(jf.read_text(encoding="utf-8"))
        output_dir = str(GENERATED_DIR / "cosmetics" / season)
        for item in data.get("cosmetics", []):
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
                sampler="euler",
                category=f"cosmetic_{season}",
            ))
    return tasks


# ── 배치 실행 ────────────────────────────────────────────
def run_tasks(engine, tasks: List[GenerationTask],
              dry_run: bool = False) -> BatchStats:
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
        if idx % 10 == 0 or idx == stats.total:
            pct = done / stats.total * 100
            log.info(f"  Progress: {pct:.0f}% ({done}/{stats.total}) "
                     f"ok={stats.success} fail={stats.failed} skip={stats.skipped}")
    return stats


def main():
    parser = argparse.ArgumentParser(description="P18-15~16 VFX+코스메틱 배치 생성")
    parser.add_argument("--url", default="http://127.0.0.1:8188")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--vfx", action="store_true")
    parser.add_argument("--cosmetics", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.all:
        args.vfx = True
        args.cosmetics = True

    if not any([args.vfx, args.cosmetics]):
        parser.print_help()
        sys.exit(1)

    all_tasks = []
    if args.vfx:
        skill_tasks = collect_vfx_skill_tasks()
        log.info(f"VFX 스킬: {len(skill_tasks)}건")
        all_tasks.extend(skill_tasks)
        common_tasks = collect_vfx_common_tasks()
        log.info(f"VFX 공통: {len(common_tasks)}건")
        all_tasks.extend(common_tasks)
    if args.cosmetics:
        cos_tasks = collect_cosmetic_tasks()
        log.info(f"코스메틱: {len(cos_tasks)}건")
        all_tasks.extend(cos_tasks)

    log.info(f"전체 태스크: {len(all_tasks)}건")

    if args.dry_run:
        stats = run_tasks(None, all_tasks, dry_run=True)
    else:
        engine = ComfyUIEngine(args.url)
        if not engine.test_connection():
            log.error("ComfyUI 연결 실패")
            sys.exit(1)
        stats = run_tasks(engine, all_tasks)

    log.info(f"\n{'='*60}")
    log.info(f"배치 완료: 총 {stats.total}건")
    log.info(f"  성공: {stats.success}")
    log.info(f"  실패: {stats.failed}")
    log.info(f"  스킵: {stats.skipped}")
    if stats.errors:
        log.info(f"  에러 ({len(stats.errors)}건):")
        for err in stats.errors[:20]:
            log.info(f"    - {err}")

    result_path = GENERATED_DIR / "vfx_cosmetic_batch_result.json"
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
