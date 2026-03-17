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

COMFYUI_API = "http://127.0.0.1:8188"
PROJECT_ROOT = Path("/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클")
OUTPUT_DIR = PROJECT_ROOT / "assets" / "generated_pixel_art"

LORA_NAME = "pixel_art_style_v1.0.safetensors"
LORA_NAME_2 = "PixelArtRedmond-sd15.safetensors"
CHECKPOINT = "v1-5-pruned-emaonly.safetensors"

POSITIVE_BASE = "(pixel art:1.4), (16-bit rpg style:1.3), snes era, retro game sprite, (clean pixel edges:1.3), (limited color palette:1.2), fantasy rpg, chrono trigger style, moonlighter style, PixArFK, (pixelated:1.3), game asset, (sharp pixels:1.2), no anti-aliasing, (dithering shading:1.1), dark outline, centered composition"
NEGATIVE_BASE = "(blurry:1.5), (realistic:1.5), photograph, (3d render:1.4), (smooth gradients:1.4), anti-aliasing, high resolution details, noise, watermark, text, modern, photorealistic, 3d, cgi, painting, oil painting, sketch, pencil, soft shading, multiple views, collage, grid, tiled"

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
    if seed == -1:
        seed = int.from_bytes(os.urandom(4), 'big') % (2**32)
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA_NAME_2, "strength_model": 0.7, "strength_clip": 0.7, "model": ["1", 0], "clip": ["1", 1]}},
        "4": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA_NAME, "strength_model": 0.8, "strength_clip": 0.8, "model": ["5", 0], "clip": ["5", 1]}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{POSITIVE_BASE}, {positive}", "clip": ["4", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{NEGATIVE_BASE}, {negative}", "clip": ["4", 1]}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 512, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 0], "seed": seed, "steps": 30, "cfg": 8.0, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1.0}},
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
        return f"pixel art monster sprite, {clean}, {zone_desc}, fantasy rpg enemy, chrono trigger monster style, single creature, centered, small enemy"
    elif tier == "elite":
        return f"pixel art boss monster, {clean}, {zone_desc}, fantasy rpg boss enemy, chrono trigger boss style, single large creature, centered, powerful, menacing, elite monster, imposing"
    else:  # raid
        return f"pixel art raid boss, {clean}, {zone_desc}, fantasy rpg final boss, epic monster, massive creature, centered, devastating power, ultimate enemy"


def run_monster_batch(source_dir: str, tier: str, subfolder: str):
    """특정 tier의 몬스터 일괄 생성"""
    src = PROJECT_ROOT / "assets" / "generated" / "monsters" / source_dir
    files = sorted([f.replace(".png", "") for f in os.listdir(src) if f.endswith(".png")])
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

    try:
        resp = requests.get(f"{COMFYUI_API}/system_stats", timeout=5)
        print("✅ ComfyUI connected")
    except:
        print("❌ ComfyUI not running")
        sys.exit(1)

    if tier == "normal":
        run_monster_batch("normal", "normal", "normal")
    elif tier == "elite":
        run_monster_batch("elite_boss", "elite", "elite_boss")
    elif tier == "raid":
        run_monster_batch("raid_boss", "raid", "raid_boss")
    elif tier == "all":
        results = {}
        for t, src, sub in [("normal", "normal", "normal"), ("elite", "elite_boss", "elite_boss"), ("raid", "raid_boss", "raid_boss")]:
            s, f = run_monster_batch(src, t, sub)
            results[t] = (s, f)
        print("\n📊 === 몬스터 전체 결과 ===")
        for t, (s, f) in results.items():
            print(f"  {t}: {s}✅ {f}❌")
    else:
        print(f"Usage: {sys.argv[0]} [normal|elite|raid|all]")
