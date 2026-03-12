#!/usr/bin/env python3
"""
에테르나 크로니클 — P15-02: 프롬프트 배치 실행 엔진
SD WebUI API / DALL-E API / MJ API 통합 배치 실행

사용법:
  python batch_generator.py --engine sd --prompts assets/prompts/characters/class_main/
  python batch_generator.py --engine dalle --prompts prompt_file.json --output output/
  python batch_generator.py --engine mj --prompts prompt_file.json --dry-run
  python batch_generator.py --queue status
  python batch_generator.py --resume            # 중단된 큐 재개
"""

import argparse
import json
import os
import sys
import time
import hashlib
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin

# ── 설정 ────────────────────────────────────────────────
DEFAULT_CONFIG = {
    "sd": {
        "api_url": "http://127.0.0.1:7860",
        "default_params": {
            "sampler_name": "DPM++ 2M Karras",
            "steps": 35,
            "cfg_scale": 8,
            "width": 512,
            "height": 512,
            "clip_skip": 2,
            "seed": -1,
        },
        "batch_delay": 1.0,
        "max_retries": 3,
        "retry_delay": 5.0,
    },
    "dalle": {
        "api_url": "https://api.openai.com/v1/images/generations",
        "model": "dall-e-3",
        "size": "1024x1024",
        "quality": "hd",
        "style": "natural",
        "batch_delay": 2.0,
        "max_retries": 3,
        "retry_delay": 10.0,
    },
    "mj": {
        "api_url": "",  # Midjourney 프록시 API URL
        "batch_delay": 5.0,
        "max_retries": 2,
        "retry_delay": 30.0,
    }
}

CONFIG_PATH = Path("~/.config/aeterna/batch_generator.json").expanduser()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("batch_generator")


class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    SKIPPED = "skipped"


@dataclass
class GenerationJob:
    id: str
    engine: str
    prompt: str
    negative_prompt: str = ""
    params: Dict[str, Any] = field(default_factory=dict)
    output_path: str = ""
    status: str = JobStatus.PENDING.value
    attempts: int = 0
    max_retries: int = 3
    error: str = ""
    result_path: str = ""
    seed_used: int = -1
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = ""
    completed_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.id:
            self.id = hashlib.md5(
                f"{self.engine}:{self.prompt[:100]}:{self.created_at}".encode()
            ).hexdigest()[:12]


@dataclass
class BatchQueue:
    name: str
    engine: str
    jobs: List[GenerationJob] = field(default_factory=list)
    created_at: str = ""
    config: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    @property
    def stats(self) -> Dict[str, int]:
        counts = {}
        for j in self.jobs:
            counts[j.status] = counts.get(j.status, 0) + 1
        return counts

    def pending_jobs(self) -> List[GenerationJob]:
        return [j for j in self.jobs if j.status in (JobStatus.PENDING.value, JobStatus.RETRYING.value)]

    def save(self, path: Path):
        data = {
            "name": self.name,
            "engine": self.engine,
            "created_at": self.created_at,
            "config": self.config,
            "stats": self.stats,
            "jobs": [asdict(j) for j in self.jobs],
        }
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        logger.info(f"큐 저장: {path} ({len(self.jobs)} jobs)")

    @classmethod
    def load(cls, path: Path) -> "BatchQueue":
        data = json.loads(path.read_text())
        queue = cls(
            name=data["name"],
            engine=data["engine"],
            created_at=data.get("created_at", ""),
            config=data.get("config", {}),
        )
        for jd in data.get("jobs", []):
            queue.jobs.append(GenerationJob(**{
                k: v for k, v in jd.items()
                if k in GenerationJob.__dataclass_fields__
            }))
        return queue


# ── 엔진별 실행기 ────────────────────────────────────────

class SDWebUIExecutor:
    """Stable Diffusion WebUI API 실행기"""

    def __init__(self, config: Dict):
        self.api_url = config.get("api_url", "http://127.0.0.1:7860")
        self.default_params = config.get("default_params", {})

    def generate(self, job: GenerationJob, output_dir: Path) -> bool:
        try:
            import requests
        except ImportError:
            logger.warning("requests 미설치 — 시뮬레이션 모드")
            return self._simulate(job, output_dir)

        url = f"{self.api_url}/sdapi/v1/txt2img"
        payload = {**self.default_params, **job.params}
        payload["prompt"] = job.prompt
        payload["negative_prompt"] = job.negative_prompt

        # ControlNet 포즈 적용
        if "controlnet_pose" in job.metadata:
            pose_path = job.metadata["controlnet_pose"]
            if Path(pose_path).exists():
                payload.setdefault("alwayson_scripts", {})
                payload["alwayson_scripts"]["controlnet"] = {
                    "args": [{
                        "input_image": "",  # base64 인코딩 필요
                        "module": "openpose",
                        "model": "control_v11p_sd15_openpose",
                        "weight": 0.9,
                        "guidance_start": 0.0,
                        "guidance_end": 0.8,
                    }]
                }

        try:
            resp = requests.post(url, json=payload, timeout=120)
            resp.raise_for_status()
            data = resp.json()

            images = data.get("images", [])
            if not images:
                job.error = "No images returned"
                return False

            import base64
            for i, img_b64 in enumerate(images):
                fname = f"{job.id}_{i}.png"
                fpath = output_dir / fname
                fpath.write_bytes(base64.b64decode(img_b64))
                if i == 0:
                    job.result_path = str(fpath)

            info = json.loads(data.get("info", "{}"))
            job.seed_used = info.get("seed", -1)
            job.metadata["info"] = {
                "seed": job.seed_used,
                "sampler": info.get("sampler_name"),
                "steps": info.get("steps"),
                "cfg_scale": info.get("cfg_scale"),
            }
            return True

        except Exception as e:
            job.error = str(e)
            return False

    def _simulate(self, job: GenerationJob, output_dir: Path) -> bool:
        """API 미연결 시 시뮬레이션"""
        import random
        fname = f"{job.id}_sim.json"
        fpath = output_dir / fname
        job.seed_used = random.randint(1, 999999)
        sim_result = {
            "simulated": True,
            "engine": "sd",
            "prompt": job.prompt[:200],
            "seed": job.seed_used,
            "params": job.params,
        }
        fpath.write_text(json.dumps(sim_result, indent=2, ensure_ascii=False))
        job.result_path = str(fpath)
        return True


class DALLEExecutor:
    """DALL-E API 실행기"""

    def __init__(self, config: Dict):
        self.config = config
        self.api_key = os.environ.get("OPENAI_API_KEY", "")

    def generate(self, job: GenerationJob, output_dir: Path) -> bool:
        if not self.api_key:
            logger.warning("OPENAI_API_KEY 미설정 — 시뮬레이션 모드")
            return self._simulate(job, output_dir)

        try:
            import requests
            resp = requests.post(
                self.config["api_url"],
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config["model"],
                    "prompt": job.prompt,
                    "n": 1,
                    "size": job.params.get("size", self.config["size"]),
                    "quality": job.params.get("quality", self.config["quality"]),
                    "style": job.params.get("style", self.config["style"]),
                },
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()

            img_url = data["data"][0]["url"]
            revised_prompt = data["data"][0].get("revised_prompt", "")

            img_resp = requests.get(img_url, timeout=60)
            fname = f"{job.id}.png"
            fpath = output_dir / fname
            fpath.write_bytes(img_resp.content)
            job.result_path = str(fpath)
            job.metadata["revised_prompt"] = revised_prompt
            return True

        except Exception as e:
            job.error = str(e)
            return False

    def _simulate(self, job: GenerationJob, output_dir: Path) -> bool:
        fname = f"{job.id}_sim.json"
        fpath = output_dir / fname
        sim_result = {
            "simulated": True,
            "engine": "dalle",
            "prompt": job.prompt[:200],
            "model": self.config["model"],
        }
        fpath.write_text(json.dumps(sim_result, indent=2, ensure_ascii=False))
        job.result_path = str(fpath)
        return True


class MidjourneyExecutor:
    """Midjourney 프록시 API 실행기"""

    def __init__(self, config: Dict):
        self.config = config
        self.api_url = config.get("api_url", "")

    def generate(self, job: GenerationJob, output_dir: Path) -> bool:
        if not self.api_url:
            logger.warning("MJ API URL 미설정 — 시뮬레이션 모드")
            return self._simulate(job, output_dir)

        try:
            import requests
            # MJ 프록시 API (midjourney-proxy 등)
            resp = requests.post(
                f"{self.api_url}/mj/submit/imagine",
                json={"prompt": job.prompt},
                timeout=30,
            )
            resp.raise_for_status()
            task_id = resp.json().get("result")

            # 폴링 대기
            for _ in range(60):
                time.sleep(10)
                status_resp = requests.get(f"{self.api_url}/mj/task/{task_id}/fetch")
                status_data = status_resp.json()
                if status_data.get("status") == "SUCCESS":
                    img_url = status_data["imageUrl"]
                    img_resp = requests.get(img_url, timeout=60)
                    fname = f"{job.id}.png"
                    fpath = output_dir / fname
                    fpath.write_bytes(img_resp.content)
                    job.result_path = str(fpath)
                    return True
                elif status_data.get("status") == "FAILURE":
                    job.error = status_data.get("failReason", "Unknown")
                    return False

            job.error = "Timeout waiting for MJ result"
            return False

        except Exception as e:
            job.error = str(e)
            return False

    def _simulate(self, job: GenerationJob, output_dir: Path) -> bool:
        fname = f"{job.id}_sim.json"
        fpath = output_dir / fname
        sim_result = {
            "simulated": True,
            "engine": "mj",
            "prompt": job.prompt[:200],
        }
        fpath.write_text(json.dumps(sim_result, indent=2, ensure_ascii=False))
        job.result_path = str(fpath)
        return True


EXECUTORS = {
    "sd": SDWebUIExecutor,
    "dalle": DALLEExecutor,
    "mj": MidjourneyExecutor,
}


# ── 프롬프트 로더 ────────────────────────────────────────

def load_prompts(path: Path, engine: str) -> List[GenerationJob]:
    """프롬프트 파일/디렉터리에서 Job 목록 로드"""
    jobs = []

    if path.is_file():
        data = json.loads(path.read_text())
        if isinstance(data, list):
            for item in data:
                jobs.append(_prompt_to_job(item, engine))
        elif isinstance(data, dict):
            jobs.append(_prompt_to_job(data, engine))
    elif path.is_dir():
        for f in sorted(path.rglob("*.json")):
            try:
                data = json.loads(f.read_text())
                if isinstance(data, dict) and "prompts" in data:
                    # 다중 엔진 프롬프트 파일
                    engine_prompts = data["prompts"].get(engine, {})
                    if engine_prompts:
                        job = GenerationJob(
                            id="",
                            engine=engine,
                            prompt=engine_prompts.get("prompt", ""),
                            negative_prompt=engine_prompts.get("negative", ""),
                            params=engine_prompts.get("params", {}),
                            metadata={
                                "source_file": str(f),
                                "asset_id": data.get("asset_id", ""),
                                "category": data.get("category", ""),
                            }
                        )
                        jobs.append(job)
                elif isinstance(data, dict) and "prompt" in data:
                    jobs.append(_prompt_to_job(data, engine))
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"스킵: {f} ({e})")

    logger.info(f"프롬프트 로드: {len(jobs)}개 ({path})")
    return jobs


def _prompt_to_job(data: Dict, engine: str) -> GenerationJob:
    return GenerationJob(
        id="",
        engine=engine,
        prompt=data.get("prompt", ""),
        negative_prompt=data.get("negative_prompt", data.get("negative", "")),
        params=data.get("params", {}),
        metadata=data.get("metadata", {}),
    )


# ── 배치 실행 ────────────────────────────────────────────

def run_batch(queue: BatchQueue, output_dir: Path, dry_run: bool = False) -> Dict[str, int]:
    """배치 큐 실행"""
    engine_config = DEFAULT_CONFIG.get(queue.engine, {})
    executor = EXECUTORS[queue.engine](engine_config)
    output_dir.mkdir(parents=True, exist_ok=True)

    batch_delay = engine_config.get("batch_delay", 2.0)
    max_retries = engine_config.get("max_retries", 3)
    retry_delay = engine_config.get("retry_delay", 5.0)

    results = {"success": 0, "failed": 0, "skipped": 0}
    pending = queue.pending_jobs()
    total = len(pending)

    logger.info(f"배치 실행 시작: {total}개 작업, 엔진: {queue.engine}")

    for i, job in enumerate(pending):
        logger.info(f"[{i+1}/{total}] {job.id} — {job.prompt[:60]}...")

        if dry_run:
            logger.info(f"  [DRY-RUN] 스킵")
            job.status = JobStatus.SKIPPED.value
            results["skipped"] += 1
            continue

        job.status = JobStatus.RUNNING.value
        job.attempts += 1

        success = executor.generate(job, output_dir)

        if success:
            job.status = JobStatus.SUCCESS.value
            job.completed_at = datetime.now().isoformat()
            results["success"] += 1
            logger.info(f"  ✅ 성공 → {job.result_path}")
        else:
            if job.attempts < max_retries:
                job.status = JobStatus.RETRYING.value
                logger.warning(f"  ⚠️ 실패 (시도 {job.attempts}/{max_retries}): {job.error}")
                time.sleep(retry_delay)
                # 재시도
                job.attempts += 1
                success = executor.generate(job, output_dir)
                if success:
                    job.status = JobStatus.SUCCESS.value
                    job.completed_at = datetime.now().isoformat()
                    results["success"] += 1
                    logger.info(f"  ✅ 재시도 성공")
                else:
                    job.status = JobStatus.FAILED.value
                    results["failed"] += 1
                    logger.error(f"  ❌ 최종 실패: {job.error}")
            else:
                job.status = JobStatus.FAILED.value
                results["failed"] += 1
                logger.error(f"  ❌ 실패: {job.error}")

        if i < total - 1:
            time.sleep(batch_delay)

    return results


def main():
    parser = argparse.ArgumentParser(description="프롬프트 배치 실행 엔진")
    parser.add_argument("--engine", "-e", choices=["sd", "dalle", "mj"],
                        default="sd", help="AI 엔진")
    parser.add_argument("--prompts", "-p", type=str, help="프롬프트 파일/디렉터리")
    parser.add_argument("--output", "-o", type=str, default="output/generated/",
                        help="출력 디렉터리")
    parser.add_argument("--queue", "-q", type=str, help="큐 파일 (status/resume)")
    parser.add_argument("--resume", action="store_true", help="중단된 큐 재개")
    parser.add_argument("--dry-run", action="store_true", help="실행 없이 시뮬레이션")
    parser.add_argument("--save-queue", type=str, help="큐를 파일로 저장")

    args = parser.parse_args()
    output_dir = Path(args.output)

    if args.queue == "status":
        # 큐 상태 출력
        for qf in sorted(Path(".").glob("*.queue.json")):
            q = BatchQueue.load(qf)
            print(f"{qf.name}: {q.engine} — {q.stats}")
        return

    if args.resume:
        # 큐 파일에서 재개
        queue_files = sorted(Path(".").glob("*.queue.json"))
        if not queue_files:
            print("재개할 큐 파일 없음")
            return
        queue = BatchQueue.load(queue_files[-1])
    elif args.prompts:
        prompt_path = Path(args.prompts)
        jobs = load_prompts(prompt_path, args.engine)
        queue = BatchQueue(
            name=f"batch_{args.engine}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            engine=args.engine,
            jobs=jobs,
        )
    else:
        parser.print_help()
        return

    # 실행
    results = run_batch(queue, output_dir, dry_run=args.dry_run)

    # 큐 저장
    queue_path = Path(args.save_queue) if args.save_queue else Path(f"{queue.name}.queue.json")
    queue.save(queue_path)

    print(f"\n=== 배치 완료 ===")
    print(f"성공: {results['success']}, 실패: {results['failed']}, 스킵: {results['skipped']}")
    print(f"큐 저장: {queue_path}")


if __name__ == "__main__":
    main()
