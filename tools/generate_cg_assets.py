#!/usr/bin/env python3
"""
CG 에셋 생성기 — 엔딩 CG 5장 + 챕터 타이틀 카드 5장
ComfyUI API (localhost:8188) + SD 1.5 체크포인트 사용
"""
import json
import os
import sys
import time
import uuid
import urllib.request
import urllib.error
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
COMFYUI_URL = "http://127.0.0.1:8188"
CHECKPOINT = "v1-5-pruned-emaonly.safetensors"
NEGATIVE = "nsfw, blurry, low quality, text, watermark, signature, ugly, deformed"

CG_DIR = BASE_DIR / "client" / "public" / "assets" / "cg"
CHAPTER_DIR = CG_DIR / "chapters"

# ── Asset definitions ────────────────────────────────────────────────

ENDINGS = [
    ("ending_a_guardian.png",
     "epic fantasy illustration, hero standing in golden light, memories restored, "
     "all companions alive, sunrise over healed world, ethereal particles, volumetric lighting, masterpiece"),
    ("ending_b_witness.png",
     "melancholic fantasy illustration, hero losing memories, silver energy flowing outward, "
     "companions watching sadly, bittersweet sunset, tears, masterpiece"),
    ("ending_c_oblivion.png",
     "dark fantasy illustration, hero and shadow god merged, fog consuming world, "
     "two figures sealed together, dramatic purple energy, masterpiece"),
    ("ending_d_return.png",
     "epic divine fantasy, twelve gods appearing in brilliant light, hero at center of magic circle, "
     "cosmic event, twelve colored lights, masterpiece"),
    ("defeat_oblivion.png",
     "dark apocalyptic fantasy, world consumed by white fog, empty city, all memory erased, "
     "haunting silence, desolate, masterpiece"),
]

CHAPTERS = [
    ("ch1_erebos.png",
     "dark abandoned gothic city ruins, fog, moonlight, pixel art style, RPG chapter title, text space at bottom"),
    ("ch2_sylvanheim.png",
     "enchanted glowing forest, bioluminescent, ancient trees, pixel art style, RPG chapter title"),
    ("ch3_solaris.png",
     "vast desert with glowing crystals at night, ruins in sand, pixel art style, RPG chapter title"),
    ("ch4_argentium.png",
     "golden imperial city with tall spire tower, steampunk, dystopia, pixel art style, RPG chapter title"),
    ("ch5_plateau.png",
     "barren windswept plateau, desolate highland, memory fog rising, pixel art style, RPG chapter title"),
]

# ── ComfyUI helpers ──────────────────────────────────────────────────

def build_workflow(prompt, negative=NEGATIVE, width=1216, height=832,
                   seed=-1, steps=30, cfg=7.0, prefix="cg_asset"):
    if seed == -1:
        seed = int.from_bytes(os.urandom(7), "big")
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed, "steps": steps, "cfg": cfg,
                "sampler_name": "euler", "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefix, "images": ["8", 0]}},
    }


def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow, "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt", data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  [ERROR] Queue failed: {e}")
        return None


def wait_for_result(prompt_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}", timeout=5)
            data = json.loads(resp.read())
            if prompt_id in data:
                outputs = data[prompt_id].get("outputs", {})
                for node_id, output in outputs.items():
                    if "images" in output:
                        return output["images"]
            time.sleep(3)
        except Exception:
            time.sleep(3)
    return None


def download_image(image_info, output_path):
    filename = image_info["filename"]
    subfolder = image_info.get("subfolder", "")
    url = f"{COMFYUI_URL}/view?filename={filename}&subfolder={subfolder}&type=output"
    try:
        urllib.request.urlretrieve(url, str(output_path))
        return True
    except Exception as e:
        print(f"  [ERROR] Download failed: {e}")
        return False


# ── Main generation loop ─────────────────────────────────────────────

def generate_batch(assets, output_dir, label):
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    total = len(assets)

    for idx, (filename, prompt) in enumerate(assets, 1):
        output_path = output_dir / filename
        print(f"\n[{label} {idx}/{total}] {filename}")
        print(f"  Prompt: {prompt[:80]}...")

        workflow = build_workflow(prompt, prefix=f"cg_{filename.replace('.png', '')}")
        resp = queue_prompt(workflow)
        if not resp or "prompt_id" not in resp:
            print(f"  [FAIL] Could not queue prompt")
            results.append((filename, False))
            continue

        prompt_id = resp["prompt_id"]
        print(f"  Queued: {prompt_id}")
        print(f"  Waiting for generation (timeout 300s)...")

        images = wait_for_result(prompt_id, timeout=300)
        if not images:
            print(f"  [FAIL] Timeout or no output")
            results.append((filename, False))
            continue

        if download_image(images[0], output_path):
            size = output_path.stat().st_size
            print(f"  [OK] Saved → {output_path.relative_to(BASE_DIR)} ({size:,} bytes)")
            results.append((filename, True))
        else:
            results.append((filename, False))

    return results


def main():
    # Verify ComfyUI is reachable
    try:
        urllib.request.urlopen(f"{COMFYUI_URL}/system_stats", timeout=5)
    except Exception:
        print("[ERROR] ComfyUI not reachable at", COMFYUI_URL)
        sys.exit(1)

    print("=" * 60)
    print("CG Asset Generator — Aeterna Chronicle")
    print(f"ComfyUI: {COMFYUI_URL}  |  Checkpoint: {CHECKPOINT}")
    print(f"Resolution: 1216×832  |  Steps: 30  |  CFG: 7")
    print("=" * 60)

    all_results = []

    # A) Ending CGs
    print("\n── ENDING CGs (5 images) ──")
    ending_results = generate_batch(ENDINGS, CG_DIR, "ENDING")
    all_results.extend(ending_results)

    # B) Chapter Title Cards
    print("\n── CHAPTER TITLE CARDS (5 images) ──")
    chapter_results = generate_batch(CHAPTERS, CHAPTER_DIR, "CHAPTER")
    all_results.extend(chapter_results)

    # Summary
    success = sum(1 for _, ok in all_results if ok)
    total = len(all_results)
    print("\n" + "=" * 60)
    print(f"RESULTS: {success}/{total} generated successfully")
    print("=" * 60)
    for filename, ok in all_results:
        status = "OK" if ok else "FAIL"
        print(f"  [{status}] {filename}")

    if success < total:
        sys.exit(1)


if __name__ == "__main__":
    main()
