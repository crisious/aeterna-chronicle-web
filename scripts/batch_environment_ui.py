#!/usr/bin/env python3
"""
P36 — Environment + UI Pixel Art Batch Generator
Backgrounds (114) + UI Icons (items 100, skills 210, status, frames)
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

POSITIVE_BASE = "(pixel art:1.4), (16-bit rpg style:1.3), snes era, (clean pixel edges:1.3), (limited color palette:1.2), fantasy rpg, chrono trigger style, moonlighter style, PixArFK, (pixelated:1.3), game asset, (sharp pixels:1.2), (dithering shading:1.1)"
NEGATIVE_BASE = "(blurry:1.5), (realistic:1.5), photograph, (3d render:1.4), (smooth gradients:1.4), anti-aliasing, noise, watermark, text, modern, photorealistic, cgi, painting, oil painting, sketch, soft shading"

# Zone descriptions for backgrounds
ZONE_DESC = {
    "ABY": ("Abyss", "void dimension, dark purple cosmic space, dimensional rifts, eldritch geometry, floating debris"),
    "ARG": ("Argentium", "steampunk city, brass machinery, gears, steam pipes, industrial, copper towers"),
    "BRI": ("Britalia", "ocean port, nautical harbor, coral reefs, blue-green water, maritime"),
    "ERB": ("Erebos", "ancient ruins, fog, dark stone, crumbling temples, ghostly atmosphere"),
    "FOG": ("Fog Sea", "foggy ocean, spectral mist, ghost ships, eerie blue, deep sea"),
    "NOR": ("Northland", "arctic tundra, ice caves, snow mountains, frost crystals, blizzard"),
    "SYL": ("Silvanhime", "enchanted forest, giant trees, moss, glowing mushrooms, nature magic"),
    "SOL": ("Solaris", "desert wasteland, sand dunes, ancient pyramids, golden sun, heat haze"),
    "TMP": ("Temporal Rift", "time distortion, clock fragments, dimensional tears, chrono energy"),
    "TEM": ("Temporal Rift", "time distortion, clock fragments, dimensional tears, chrono energy, purple energy"),
    "OBL": ("Oblivion", "void realm, absolute darkness, shattered reality, cosmic debris, entropy"),
}

LAYER_DESC = {
    "SKY": "distant sky, clouds, atmospheric",
    "FAR": "far background, distant landscape, hazy",
    "MID": "middle ground, terrain features, structures",
    "NEAR": "near foreground, vegetation, rocks, detailed",
}

TIME_DESC = {
    "DAY": "bright daylight, vivid colors, clear sky",
    "DUSK": "sunset, warm orange glow, twilight, long shadows",
    "NIGHT": "dark night, moonlight, stars, cool blue tones",
}


def build_workflow(positive, negative, width=512, height=512, seed=-1):
    if seed == -1:
        seed = int.from_bytes(os.urandom(4), 'big') % (2**32)
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA_NAME_2, "strength_model": 0.7, "strength_clip": 0.7, "model": ["1", 0], "clip": ["1", 1]}},
        "4": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA_NAME, "strength_model": 0.8, "strength_clip": 0.8, "model": ["5", 0], "clip": ["5", 1]}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{POSITIVE_BASE}, {positive}", "clip": ["4", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{NEGATIVE_BASE}, {negative}", "clip": ["4", 1]}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 0], "seed": seed, "steps": 30, "cfg": 8.0, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["1", 2]}},
        "12": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "pixel_art"}},
    }


def generate_image(positive, negative, save_path, width=512, height=512):
    try:
        workflow = build_workflow(positive, negative, width, height)
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
                            r = requests.get(f"{COMFYUI_API}/view", params={"filename": img["filename"], "subfolder": img.get("subfolder", ""), "type": img.get("type", "output")})
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


def run_backgrounds():
    """환경 배경 114장"""
    src = PROJECT_ROOT / "assets" / "generated" / "environment" / "backgrounds"
    files = sorted([f for f in os.listdir(src) if f.endswith(".png")])
    total = len(files)
    print(f"\n🎨 === Environment Backgrounds ({total}장) ===")

    success, fail = 0, 0
    for i, filename in enumerate(files):
        name = filename.replace(".png", "")
        parts = name.split("-")
        # Format: ZONE-BG-LAYER-TIME (e.g., ABY-BG-FAR-DAY)
        zone_code = parts[0] if len(parts) >= 1 else "UNK"
        layer = parts[2] if len(parts) >= 3 else "MID"
        time_code = parts[3] if len(parts) >= 4 else "DAY"

        zone_name, zone_desc = ZONE_DESC.get(zone_code, ("Unknown", "fantasy landscape"))
        layer_desc = LAYER_DESC.get(layer, "background terrain")
        time_desc = TIME_DESC.get(time_code, "daylight")

        positive = f"pixel art landscape, {zone_desc}, {layer_desc}, {time_desc}, fantasy rpg background, parallax layer, wide scenic view, game background"
        negative = "characters, monsters, UI elements, text, frame"

        save_path = OUTPUT_DIR / "environment" / "backgrounds" / filename
        print(f"  [{i+1}/{total}] {filename}...", end=" ", flush=True)
        ok = generate_image(positive, negative, save_path, width=512, height=512)
        if ok:
            success += 1
            print("✅")
        else:
            fail += 1
            print("❌")

    print(f"  배경: {success}✅ {fail}❌ / {total}")
    return success, fail


def run_ui_icons(subfolder: str):
    """UI 아이콘 생성"""
    src = PROJECT_ROOT / "assets" / "generated" / "ui" / "icons" / subfolder
    if not src.exists():
        print(f"  ⚠️ {src} not found")
        return 0, 0

    files = sorted([f for f in os.listdir(src) if f.endswith(".png")])
    total = len(files)
    print(f"\n🎨 === UI Icons/{subfolder} ({total}장) ===")

    icon_prompts = {
        "items": "pixel art game icon, rpg inventory item, 16-bit style icon, clean edges, single item, centered, game UI",
        "skills": "pixel art skill icon, rpg ability icon, 16-bit style, magical effect, game UI, ability badge",
        "status": "pixel art status icon, rpg buff debuff icon, 16-bit style, small icon, game UI element",
    }
    base_prompt = icon_prompts.get(subfolder, "pixel art game icon, rpg icon, 16-bit style")

    # Map icon prefixes to descriptions
    ITEM_CATEGORIES = {
        "ITM-WPN": "weapon, sword blade axe",
        "ITM-ARM": "armor, chestplate shield",
        "ITM-ACC": "accessory, ring amulet necklace",
        "ITM-CON": "consumable, potion flask",
        "ITM-MAT": "crafting material, gem crystal ore",
        "ITM-KEY": "key item, quest item, special artifact",
        "SKL-ETH": "ether skill, blue energy, ethereal power",
        "SKL-MEM": "memory skill, purple crystal, mind power",
        "SKL-SHD": "shadow skill, dark energy, stealth",
        "SKL-BRK": "breaker skill, red force, shatter",
        "SKL-TIM": "time skill, golden clock, temporal",
        "SKL-VOI": "void skill, cosmic energy, dimensional",
    }

    success, fail = 0, 0
    for i, filename in enumerate(files):
        name = filename.replace(".png", "")
        # Try to find matching category
        cat_desc = ""
        for prefix, desc in ITEM_CATEGORIES.items():
            if name.startswith(prefix):
                cat_desc = desc
                break
        if not cat_desc:
            cat_desc = name.replace("-", " ").replace("_", " ")

        positive = f"{base_prompt}, {cat_desc}"
        negative = "text, label, number, background scene, character, realistic"

        save_path = OUTPUT_DIR / "ui" / "icons" / subfolder / filename
        print(f"  [{i+1}/{total}] {filename}...", end=" ", flush=True)
        ok = generate_image(positive, negative, save_path, width=512, height=512)
        if ok:
            success += 1
            print("✅")
        else:
            fail += 1
            print("❌")

    print(f"  icons/{subfolder}: {success}✅ {fail}❌ / {total}")
    return success, fail


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "backgrounds"

    try:
        requests.get(f"{COMFYUI_API}/system_stats", timeout=5)
        print("✅ ComfyUI connected")
    except:
        print("❌ ComfyUI not running")
        sys.exit(1)

    if mode == "backgrounds":
        run_backgrounds()
    elif mode == "items":
        run_ui_icons("items")
    elif mode == "skills":
        run_ui_icons("skills")
    elif mode == "status":
        run_ui_icons("status")
    elif mode == "all_ui":
        for sub in ["items", "skills", "status"]:
            run_ui_icons(sub)
    elif mode == "all":
        run_backgrounds()
        for sub in ["items", "skills", "status"]:
            run_ui_icons(sub)
    else:
        print(f"Usage: {sys.argv[0]} [backgrounds|items|skills|status|all_ui|all]")
