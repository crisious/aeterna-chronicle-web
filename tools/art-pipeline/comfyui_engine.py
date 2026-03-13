#!/usr/bin/env python3
"""
에테르나 크로니클 — P18-01: ComfyUI 엔진 클래스
ComfyUI REST API 연동 (prompt queue, history polling, 이미지 다운로드)
txt2img + ControlNet 워크플로우 JSON 빌더
batch_generator.py와 통합

사용법:
  python comfyui_engine.py --prompts assets/prompts/characters/class_main/ --output assets/generated/characters/class_main/
  python comfyui_engine.py --prompts prompt.json --output output/ --steps 20 --cfg 7.0
  python comfyui_engine.py --test  # ComfyUI 연결 테스트
"""

import argparse
import json
import logging
import os
import sys
import time
import uuid
import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlencode
import urllib.request
import urllib.error

# ── 로깅 ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("comfyui_engine")

# ── 설정 ────────────────────────────────────────────────
DEFAULT_COMFYUI_URL = "http://127.0.0.1:8188"
DEFAULT_CHECKPOINT = "v1-5-pruned-emaonly.safetensors"

DEFAULT_PARAMS = {
    "steps": 20,
    "cfg": 7.0,
    "sampler_name": "euler",
    "scheduler": "normal",
    "width": 512,
    "height": 512,
    "seed": -1,
    "denoise": 1.0,
}

MAX_RETRIES = 3
RETRY_DELAY = 5.0
POLL_INTERVAL = 2.0


# ── 워크플로우 빌더 ─────────────────────────────────────
def build_txt2img_workflow(
    prompt: str,
    negative: str = "",
    checkpoint: str = DEFAULT_CHECKPOINT,
    seed: int = -1,
    steps: int = 20,
    cfg: float = 7.0,
    sampler_name: str = "euler",
    scheduler: str = "normal",
    width: int = 512,
    height: int = 512,
    denoise: float = 1.0,
    clip_skip: int = 2,
    batch_size: int = 1,
) -> dict:
    """txt2img 워크플로우 JSON 생성"""
    if seed == -1:
        seed = int.from_bytes(os.urandom(7), "big")

    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": sampler_name,
                "scheduler": scheduler,
                "denoise": denoise,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": checkpoint},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": batch_size,
            },
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["4", 1],
            },
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negative,
                "clip": ["4", 1],
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2],
            },
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "comfyui_output",
                "images": ["8", 0],
            },
        },
    }
    return workflow


def build_img2img_workflow(
    prompt: str,
    negative: str = "",
    image_path: str = "",
    checkpoint: str = DEFAULT_CHECKPOINT,
    seed: int = -1,
    steps: int = 20,
    cfg: float = 7.0,
    sampler_name: str = "euler",
    scheduler: str = "normal",
    width: int = 512,
    height: int = 512,
    denoise: float = 0.75,
) -> dict:
    """img2img 워크플로우 JSON 생성"""
    if seed == -1:
        seed = int.from_bytes(os.urandom(7), "big")

    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": sampler_name,
                "scheduler": scheduler,
                "denoise": denoise,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["10", 0],
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": checkpoint},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["4", 1],
            },
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negative,
                "clip": ["4", 1],
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2],
            },
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "comfyui_output",
                "images": ["8", 0],
            },
        },
        "10": {
            "class_type": "VAEEncode",
            "inputs": {
                "pixels": ["11", 0],
                "vae": ["4", 2],
            },
        },
        "11": {
            "class_type": "LoadImage",
            "inputs": {
                "image": image_path,
            },
        },
    }
    return workflow


def build_controlnet_workflow(
    prompt: str,
    negative: str = "",
    control_image_path: str = "",
    controlnet_model: str = "control_v11p_sd15_openpose.pth",
    checkpoint: str = DEFAULT_CHECKPOINT,
    seed: int = -1,
    steps: int = 20,
    cfg: float = 7.0,
    sampler_name: str = "euler",
    scheduler: str = "normal",
    width: int = 512,
    height: int = 512,
    controlnet_strength: float = 1.0,
) -> dict:
    """ControlNet OpenPose 워크플로우 JSON 생성"""
    if seed == -1:
        seed = int.from_bytes(os.urandom(7), "big")

    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": sampler_name,
                "scheduler": scheduler,
                "denoise": 1.0,
                "model": ["12", 0],
                "positive": ["13", 0],
                "negative": ["13", 1],
                "latent_image": ["5", 0],
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": checkpoint},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1,
            },
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["4", 1],
            },
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negative,
                "clip": ["4", 1],
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2],
            },
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "comfyui_output",
                "images": ["8", 0],
            },
        },
        "11": {
            "class_type": "LoadImage",
            "inputs": {
                "image": control_image_path,
            },
        },
        "12": {
            "class_type": "ControlNetLoader",
            "inputs": {
                "control_net_name": controlnet_model,
            },
        },
        "13": {
            "class_type": "ControlNetApply",
            "inputs": {
                "conditioning": ["6", 0],
                "control_net": ["12", 0],
                "image": ["11", 0],
                "strength": controlnet_strength,
            },
        },
    }
    return workflow


# ── ComfyUI API 클라이언트 ──────────────────────────────
class ComfyUIEngine:
    """ComfyUI REST API 클라이언트"""

    def __init__(self, base_url: str = DEFAULT_COMFYUI_URL):
        self.base_url = base_url.rstrip("/")
        self.client_id = str(uuid.uuid4())

    def _request(self, method: str, path: str, data: Optional[bytes] = None,
                 headers: Optional[dict] = None) -> Any:
        """HTTP 요청"""
        url = f"{self.base_url}{path}"
        h = headers or {}
        if data and "Content-Type" not in h:
            h["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=h, method=method)
        with urllib.request.urlopen(req, timeout=300) as resp:
            if resp.headers.get("Content-Type", "").startswith("image"):
                return resp.read()
            return json.loads(resp.read())

    def test_connection(self) -> bool:
        """ComfyUI 연결 테스트"""
        try:
            info = self._request("GET", "/system_stats")
            ver = info.get("system", {}).get("comfyui_version", "unknown")
            devices = info.get("devices", [])
            dev_name = devices[0]["name"] if devices else "unknown"
            log.info(f"ComfyUI {ver} 연결 성공 (device: {dev_name})")
            return True
        except Exception as e:
            log.error(f"ComfyUI 연결 실패: {e}")
            return False

    def queue_prompt(self, workflow: dict) -> str:
        """프롬프트 큐에 워크플로우 제출, prompt_id 반환"""
        payload = json.dumps({
            "prompt": workflow,
            "client_id": self.client_id,
        }).encode()
        result = self._request("POST", "/prompt", data=payload)
        prompt_id = result.get("prompt_id", "")
        if not prompt_id:
            raise RuntimeError(f"prompt_id 미반환: {result}")
        log.info(f"큐 제출 완료: {prompt_id[:12]}...")
        return prompt_id

    def get_history(self, prompt_id: str) -> Optional[dict]:
        """히스토리 조회 — 완료 시 결과 반환, 미완료 시 None"""
        try:
            history = self._request("GET", f"/history/{prompt_id}")
            if prompt_id in history:
                return history[prompt_id]
        except Exception:
            pass
        return None

    def poll_completion(self, prompt_id: str, timeout: float = 600) -> dict:
        """완료까지 폴링 (timeout초)"""
        start = time.time()
        while time.time() - start < timeout:
            hist = self.get_history(prompt_id)
            if hist is not None:
                status = hist.get("status", {})
                if status.get("completed", False) or status.get("status_str") == "success":
                    return hist
                # Check for errors
                msgs = status.get("messages", [])
                for msg in msgs:
                    if isinstance(msg, list) and len(msg) >= 2:
                        if msg[0] == "execution_error":
                            raise RuntimeError(f"실행 에러: {msg[1]}")
                # Also check if outputs exist (some versions don't set completed flag)
                if hist.get("outputs"):
                    return hist
            time.sleep(POLL_INTERVAL)
        raise TimeoutError(f"타임아웃 ({timeout}초): {prompt_id}")

    def download_image(self, filename: str, subfolder: str = "",
                       folder_type: str = "output") -> bytes:
        """생성된 이미지 다운로드"""
        params = urlencode({
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type,
        })
        return self._request("GET", f"/view?{params}")

    def get_output_images(self, history: dict) -> List[Tuple[str, str, str]]:
        """히스토리에서 출력 이미지 정보 추출 → [(filename, subfolder, type), ...]"""
        images = []
        outputs = history.get("outputs", {})
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                for img in node_output["images"]:
                    images.append((
                        img.get("filename", ""),
                        img.get("subfolder", ""),
                        img.get("type", "output"),
                    ))
        return images

    def generate_and_save(
        self,
        workflow: dict,
        output_path: str,
        output_filename: str,
        timeout: float = 600,
    ) -> Optional[str]:
        """워크플로우 실행 → 이미지 저장 → 저장 경로 반환"""
        prompt_id = self.queue_prompt(workflow)
        history = self.poll_completion(prompt_id, timeout)
        images = self.get_output_images(history)

        if not images:
            log.warning(f"출력 이미지 없음: {prompt_id}")
            return None

        # 첫 번째 이미지 저장
        filename, subfolder, ftype = images[0]
        img_data = self.download_image(filename, subfolder, ftype)

        os.makedirs(output_path, exist_ok=True)
        ext = Path(filename).suffix or ".png"
        save_path = os.path.join(output_path, f"{output_filename}{ext}")
        with open(save_path, "wb") as f:
            f.write(img_data)

        size_kb = len(img_data) / 1024
        log.info(f"저장: {save_path} ({size_kb:.0f}KB)")
        return save_path


# ── 프롬프트 JSON 로더 ──────────────────────────────────
def load_prompt_json(json_path: str) -> dict:
    """프롬프트 JSON 파일 로드"""
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_sd_prompts(prompt_data: dict) -> List[dict]:
    """프롬프트 JSON에서 SD 프롬프트 정보 추출
    Returns: [{"view": "front", "prompt": "...", "negative": "...", "params": {...}}, ...]
    """
    prompts_section = prompt_data.get("prompts", {})
    sd_section = prompts_section.get("sd", {})

    results = []
    for view, view_data in sd_section.items():
        results.append({
            "view": view,
            "prompt": view_data.get("prompt", ""),
            "negative": view_data.get("negative", ""),
            "params": view_data.get("params", {}),
        })
    return results


# ── 배치 실행 ────────────────────────────────────────────
@dataclass
class BatchResult:
    total: int = 0
    success: int = 0
    failed: int = 0
    skipped: int = 0
    errors: List[str] = field(default_factory=list)
    generated_files: List[str] = field(default_factory=list)


def run_batch(
    engine: ComfyUIEngine,
    prompts_dir: str,
    output_dir: str,
    steps: int = 20,
    cfg: float = 7.0,
    sampler: str = "euler",
    checkpoint: str = DEFAULT_CHECKPOINT,
    views: Optional[List[str]] = None,
    max_retries: int = MAX_RETRIES,
) -> BatchResult:
    """프롬프트 디렉터리 내 모든 JSON → ComfyUI 배치 실행

    Args:
        views: 생성할 뷰 리스트 (None이면 전체). 예: ["front", "side", "back"]
    """
    result = BatchResult()
    prompts_path = Path(prompts_dir)

    json_files = sorted(prompts_path.glob("*.json"))
    if not json_files:
        log.warning(f"프롬프트 JSON 없음: {prompts_dir}")
        return result

    # 총 생성 수량 계산
    all_tasks = []
    for jf in json_files:
        data = load_prompt_json(str(jf))
        sd_prompts = extract_sd_prompts(data)
        asset_id = data.get("asset_id", jf.stem)
        for sp in sd_prompts:
            if views and sp["view"] not in views:
                continue
            all_tasks.append((jf, data, asset_id, sp))

    result.total = len(all_tasks)
    log.info(f"배치 시작: {result.total}건 ({prompts_dir})")

    for idx, (jf, data, asset_id, sp) in enumerate(all_tasks, 1):
        view = sp["view"]
        filename = f"{asset_id}_{view}"
        save_path = os.path.join(output_dir, f"{filename}.png")

        # 이미 존재하면 스킵
        if os.path.exists(save_path):
            log.info(f"[{idx}/{result.total}] 스킵 (이미 존재): {filename}")
            result.skipped += 1
            continue

        log.info(f"[{idx}/{result.total}] 생성 중: {filename}")

        # 프롬프트에서 lora 태그 제거 (ComfyUI는 별도 노드 사용)
        prompt_text = sp["prompt"]
        # Remove <lora:...> tags
        import re
        prompt_text = re.sub(r'<lora:[^>]+>', '', prompt_text).strip()
        prompt_text = re.sub(r',\s*,', ',', prompt_text)

        negative_text = sp.get("negative", "")

        # 워크플로우 생성
        workflow = build_txt2img_workflow(
            prompt=prompt_text,
            negative=negative_text,
            checkpoint=checkpoint,
            steps=steps,
            cfg=cfg,
            sampler_name=sampler,
            width=sp.get("params", {}).get("width", 512),
            height=sp.get("params", {}).get("height", 512),
        )

        # 재시도 루프
        for attempt in range(1, max_retries + 1):
            try:
                saved = engine.generate_and_save(
                    workflow=workflow,
                    output_path=output_dir,
                    output_filename=filename,
                    timeout=300,
                )
                if saved:
                    result.success += 1
                    result.generated_files.append(saved)
                else:
                    result.failed += 1
                    result.errors.append(f"{filename}: 이미지 없음")
                break
            except Exception as e:
                log.warning(f"  시도 {attempt}/{max_retries} 실패: {e}")
                if attempt == max_retries:
                    result.failed += 1
                    result.errors.append(f"{filename}: {e}")
                else:
                    time.sleep(RETRY_DELAY)

        # 진행률
        done = result.success + result.failed + result.skipped
        pct = done / result.total * 100
        log.info(f"  진행률: {pct:.0f}% ({done}/{result.total}) — "
                 f"성공:{result.success} 실패:{result.failed} 스킵:{result.skipped}")

    return result


# ── CLI ──────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="ComfyUI 이미지 생성 엔진")
    parser.add_argument("--url", default=DEFAULT_COMFYUI_URL, help="ComfyUI URL")
    parser.add_argument("--test", action="store_true", help="연결 테스트")
    parser.add_argument("--prompts", help="프롬프트 JSON 디렉터리")
    parser.add_argument("--output", help="출력 디렉터리")
    parser.add_argument("--steps", type=int, default=20)
    parser.add_argument("--cfg", type=float, default=7.0)
    parser.add_argument("--sampler", default="euler")
    parser.add_argument("--checkpoint", default=DEFAULT_CHECKPOINT)
    parser.add_argument("--views", nargs="*", help="생성할 뷰 (front side back)")

    args = parser.parse_args()
    engine = ComfyUIEngine(args.url)

    if args.test:
        ok = engine.test_connection()
        sys.exit(0 if ok else 1)

    if not args.prompts or not args.output:
        parser.print_help()
        sys.exit(1)

    if not engine.test_connection():
        log.error("ComfyUI 연결 불가 — 종료")
        sys.exit(1)

    result = run_batch(
        engine=engine,
        prompts_dir=args.prompts,
        output_dir=args.output,
        steps=args.steps,
        cfg=args.cfg,
        sampler=args.sampler,
        checkpoint=args.checkpoint,
        views=args.views,
    )

    log.info(f"\n{'='*50}")
    log.info(f"배치 완료: 총 {result.total}건")
    log.info(f"  성공: {result.success}")
    log.info(f"  실패: {result.failed}")
    log.info(f"  스킵: {result.skipped}")
    if result.errors:
        log.info(f"  에러 목록:")
        for err in result.errors:
            log.info(f"    - {err}")


if __name__ == "__main__":
    main()
