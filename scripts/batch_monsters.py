#!/usr/bin/env python3
"""
P36 — Monster Pixel Art Batch Generator
Normal (120) + Elite Boss (70) + Raid Boss (38) = 228 monsters
"""

import json
import requests
import time
import os
import sys
import uuid
from pathlib import Path

# Windows cp949 환경에서 emoji print 가능하도록 UTF-8 강제
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

COMFYUI_API = os.environ.get("COMFYUI_API", "http://127.0.0.1:8188")
# 환경변수 AETERNA_ROOT 로 override 가능. 기본은 repo root.
PROJECT_ROOT = Path(os.environ.get("AETERNA_ROOT", Path(__file__).resolve().parent.parent))
OUTPUT_DIR = Path(os.environ.get("AETERNA_PIXEL_OUT", PROJECT_ROOT / "client" / "public" / "generated_pixel_art"))

# 픽셀아트 fine-tune checkpoint 단독 사용 — LoRA 의존성 제거 (gated/오프라인 회피)
CHECKPOINT = os.environ.get("COMFYUI_CHECKPOINT", "pixel-art-style.ckpt")

POSITIVE_BASE = "(pixel art:1.4), (16-bit rpg style:1.3), snes era, retro game sprite, (clean pixel edges:1.3), (limited color palette:1.2), fantasy rpg, chrono trigger style, moonlighter style, PixArFK, (pixelated:1.3), game asset, (sharp pixels:1.2), no anti-aliasing, (dithering shading:1.1), dark outline, (centered composition:1.3), (monstrous creature:1.5), (non-humanoid beast:1.4), (animal anatomy:1.3), (full body:1.3), (white background:1.3)"
NEGATIVE_BASE = "(blurry:1.5), (realistic:1.5), photograph, (3d render:1.4), (smooth gradients:1.4), anti-aliasing, high resolution details, noise, watermark, text, modern, photorealistic, 3d, cgi, painting, oil painting, sketch, pencil, soft shading, multiple views, collage, grid, tiled, (abstract pattern:1.4), (texture only:1.3), (background scenery:1.3), (cropped:1.2), (humanoid:1.5), (human:1.4), (person:1.4), (warrior character:1.4), (ninja:1.3), (anthropomorphic:1.3), (two legs walking upright:1.3), (clothing:1.2), (armor with helmet:1.3)"

# Zone → element/atmosphere mapping
ZONE_STYLE = {
    "abyss": "void energy, dark purple, cosmic, dimensional rift, eldritch",
    "argentium": "steampunk, brass, copper, gears, steam, mechanical, industrial",
    "britalia": "ocean, nautical, coral, blue-green water, maritime, pirate",
    "erebos": "ruins, fog, dark stone, crumbling architecture, ghostly, ancient",
    "fog_sea": "foggy ocean, spectral mist, deep sea, ghostly ship, eerie blue",
    "northland": "ice, snow, frost, arctic, crystal blue, blizzard, tundra",
    "silvanhime": "forest, nature, green, moss, wood, leaves, enchanted grove",
    "solaris": "desert, sand, sun, heat, golden, molten, sandstone",
}


def build_workflow(positive: str, negative: str, seed: int = -1):
    """
    픽셀아트 fine-tune checkpoint 단독 워크플로 (LoRA 노드 제거).
    CheckpointLoader → CLIPText × 2 → KSampler → VAEDecode → SaveImage.
    """
    if seed == -1:
        seed = int.from_bytes(os.urandom(4), 'big') % (2**32)
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{POSITIVE_BASE}, {positive}", "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{NEGATIVE_BASE}, {negative}", "clip": ["1", 1]}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 512, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 0], "seed": seed, "steps": 30, "cfg": 11.0, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["1", 2]}},
        "12": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "pixel_art"}},
    }


def generate_image(positive, negative, save_path):
    try:
        workflow = build_workflow(positive, negative)
        payload = {"prompt": workflow, "client_id": str(uuid.uuid4())}
        resp = requests.post(f"{COMFYUI_API}/prompt", json=payload)
        if resp.status_code != 200:
            return False
        prompt_id = resp.json()["prompt_id"]

        start = time.time()
        while time.time() - start < 180:
            resp = requests.get(f"{COMFYUI_API}/history/{prompt_id}")
            if resp.status_code == 200:
                data = resp.json()
                if prompt_id in data:
                    history = data[prompt_id]
                    if history.get("status", {}).get("status_str") == "error":
                        return False
                    for node_output in history.get("outputs", {}).values():
                        if "images" in node_output:
                            img = node_output["images"][0]
                            r = requests.get(f"{COMFYUI_API}/view", params={"filename": img["filename"], "subfolder": img.get("subfolder",""), "type": img.get("type","output")})
                            if r.status_code == 200:
                                save_path.parent.mkdir(parents=True, exist_ok=True)
                                with open(save_path, "wb") as f:
                                    f.write(r.content)
                                return True
                    return False
            time.sleep(2)
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def name_to_prompt(monster_name: str, tier: str = "normal") -> str:
    """몬스터 파일명에서 프롬프트 생성"""
    # Extract zone
    zone = None
    for z in ZONE_STYLE:
        if z in monster_name:
            zone = z
            break

    # Clean monster name
    clean = monster_name
    for prefix in ["mon_", "raid_boss_", "BOSS-"]:
        clean = clean.replace(prefix, "")
    for z in ZONE_STYLE:
        clean = clean.replace(f"{z}_", "")
    for suffix in ["_normal", "_elite", "_boss", "_phase1", "_phase2", "_phase3", "_phase4"]:
        clean = clean.replace(suffix, "")

    # Convert underscores to spaces
    clean = clean.replace("_", " ").strip()

    zone_desc = ZONE_STYLE.get(zone, "dark fantasy")

    if tier == "normal":
        return f"pixel art monster, ({clean}:1.4), {zone_desc}, fantasy rpg beast enemy, chrono trigger monster style, (creature with animal body shape:1.3), single beast, centered"
    elif tier == "elite":
        return f"pixel art boss beast, ({clean}:1.4), {zone_desc}, fantasy rpg boss creature, chrono trigger boss style, (large monstrous beast:1.4), single large creature, centered, menacing"
    else:  # raid
        return f"pixel art raid boss creature, ({clean}:1.4), {zone_desc}, fantasy rpg final boss beast, (massive monstrous form:1.4), single epic creature, centered"


def run_monster_batch(source_dir: str, tier: str, subfolder: str, limit: int = 0):
    """특정 tier의 몬스터 일괄 생성. limit>0 이면 그 수만큼만 (시범용)."""
    src = PROJECT_ROOT / "assets" / "generated" / "monsters" / source_dir
    if not src.exists():
        print(f"❌ source dir not found: {src}")
        return 0, 0
    files = sorted([f.replace(".png", "") for f in os.listdir(src) if f.endswith(".png")])
    if limit > 0:
        files = files[:limit]
    total = len(files)
    print(f"\n🎨 === {tier.upper()} Monsters ({total}장) ===")

    success, fail = 0, 0
    for i, mon_name in enumerate(files):
        filename = f"{mon_name}.png"
        save_path = OUTPUT_DIR / "monsters" / subfolder / filename
        positive = name_to_prompt(mon_name, tier)
        negative = "multiple creatures, background scene, human, text, realistic"
        print(f"  [{i+1}/{total}] {filename}...", end=" ", flush=True)
        ok = generate_image(positive, negative, save_path)
        if ok:
            success += 1
            print("✅")
        else:
            fail += 1
            print("❌")

    print(f"  {tier}: {success}✅ {fail}❌ / {total}")
    return success, fail


if __name__ == "__main__":
    tier = sys.argv[1] if len(sys.argv) > 1 else "normal"
    # 두 번째 인자는 limit (시범용 — 시간 절약). 0=무제한.
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 0

    try:
        resp = requests.get(f"{COMFYUI_API}/system_stats", timeout=5)
        print(f"✅ ComfyUI connected ({COMFYUI_API})")
        print(f"📁 source: {PROJECT_ROOT / 'assets' / 'generated' / 'monsters'}")
        print(f"📁 output: {OUTPUT_DIR}")
        print(f"🎨 checkpoint: {CHECKPOINT}")
    except Exception as e:
        print(f"❌ ComfyUI not running ({COMFYUI_API}): {e}")
        sys.exit(1)

    if tier == "smoke":
        # 최소 검증 — 1마리만 생성
        run_monster_batch("normal", "normal", "normal", limit=1)
    elif tier == "normal":
        run_monster_batch("normal", "normal", "normal", limit=limit)
    elif tier == "elite":
        run_monster_batch("elite_boss", "elite", "elite_boss", limit=limit)
    elif tier == "raid":
        run_monster_batch("raid_boss", "raid", "raid_boss", limit=limit)
    elif tier == "all":
        results = {}
        for t, src, sub in [("normal", "normal", "normal"), ("elite", "elite_boss", "elite_boss"), ("raid", "raid_boss", "raid_boss")]:
            s, f = run_monster_batch(src, t, sub, limit=limit)
            results[t] = (s, f)
        print("\n📊 === 몬스터 전체 결과 ===")
        for t, (s, f) in results.items():
            print(f"  {t}: {s}✅ {f}❌")
    else:
        print(f"Usage: {sys.argv[0]} [smoke|normal|elite|raid|all] [limit]")
