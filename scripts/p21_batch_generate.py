#!/usr/bin/env python3
"""
P21 배치 이미지 생성기
- 환경 배경/타일 누락분
- 몬스터 보충분
- NPC 스프라이트
- UI 프레임
- 캐릭터 스프라이트 진화단계
"""
import json
import os
import sys
import time
import uuid
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent
COMFYUI_URL = "http://127.0.0.1:8188"
CHECKPOINT = "v1-5-pruned-emaonly.safetensors"

def build_workflow(prompt, negative="", width=512, height=512, seed=-1, steps=20, cfg=7.0):
    if seed == -1:
        seed = int.from_bytes(os.urandom(7), "big")
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed, "steps": steps, "cfg": cfg,
                "sampler_name": "euler", "scheduler": "normal",
                "denoise": 1.0, "model": ["4", 0],
                "positive": ["6", 0], "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negative or "ugly, blurry, low quality, watermark, text", "clip": ["4", 1]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "p21_batch", "images": ["8", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
    }

def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow, "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  [ERROR] Queue failed: {e}")
        return None

def wait_for_result(prompt_id, timeout=120):
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
            time.sleep(2)
        except:
            time.sleep(2)
    return None

def download_image(image_info, output_path):
    filename = image_info["filename"]
    subfolder = image_info.get("subfolder", "")
    url = f"{COMFYUI_URL}/view?filename={filename}&subfolder={subfolder}&type=output"
    try:
        urllib.request.urlretrieve(url, output_path)
        return True
    except Exception as e:
        print(f"  [ERROR] Download failed: {e}")
        return False

def generate_image(prompt, output_path, negative="", width=512, height=512, steps=20, cfg=7.0):
    """Generate single image via ComfyUI"""
    if os.path.exists(output_path):
        return True  # Skip existing
    
    wf = build_workflow(prompt, negative, width, height, steps=steps, cfg=cfg)
    result = queue_prompt(wf)
    if not result or "prompt_id" not in result:
        return False
    
    images = wait_for_result(result["prompt_id"])
    if images:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        return download_image(images[0], output_path)
    return False

def generate_placeholder(output_path, width=512, height=512, color=(40, 40, 60), label=""):
    """Generate placeholder image with PIL for quick gap-fill"""
    if os.path.exists(output_path):
        return True
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img = Image.new("RGBA", (width, height), color + (255,))
    draw = ImageDraw.Draw(img)
    # Add label
    if label:
        try:
            draw.text((10, height//2 - 10), label[:40], fill=(200, 200, 220, 255))
        except:
            pass
    img.save(output_path)
    return True

# ══════════════════════════════════════════════════════════
# GENERATION TASKS
# ══════════════════════════════════════════════════════════

def generate_missing_backgrounds():
    """Generate missing environment backgrounds"""
    bg_dir = BASE_DIR / "assets/generated/environment/backgrounds"
    prompts_dir = BASE_DIR / "assets/prompts/environment/backgrounds"
    
    # Missing backgrounds by region
    missing = {
        "ERB": ["MID-DUSK", "MID-NIGHT", "NEAR-DUSK", "NEAR-NIGHT", "SKY-DUSK", "SKY-NIGHT"],
        "SOL": ["FAR-DUSK", "FAR-NIGHT", "MID-DUSK", "MID-NIGHT", "NEAR-DUSK", "NEAR-NIGHT", "SKY-DUSK"],
        "SYL": ["FAR-DUSK", "FAR-NIGHT", "MID-DUSK", "MID-NIGHT", "NEAR-DUSK", "NEAR-NIGHT", "SKY-DUSK", "SKY-NIGHT"],
    }
    
    region_prompts = {
        "ERB": "dark underground ruins, ancient erebos architecture, purple crystals, ethereal glow, dark fantasy environment",
        "SOL": "golden desert city, solaris sandstone temples, radiant sunlight, warm tones, fantasy desert landscape",
        "SYL": "enchanted forest, sylvanheim ancient trees, bioluminescent flora, mystical atmosphere, fantasy woodland",
    }
    
    layer_desc = {
        "FAR": "distant horizon layer, panoramic view",
        "MID": "middle ground layer, structures and terrain",
        "NEAR": "foreground layer, detailed close elements",
        "SKY": "sky background layer, atmospheric",
    }
    
    time_desc = {
        "DAY": "bright daylight, warm sunlight",
        "DUSK": "sunset twilight, orange and purple sky",
        "NIGHT": "dark night, moonlight, stars, cool blue tones",
    }
    
    count = 0
    for region, variants in missing.items():
        base_prompt = region_prompts[region]
        for variant in variants:
            parts = variant.split("-")
            layer = parts[0]
            tod = parts[1]
            
            prompt = f"(masterpiece:1.3), (best quality:1.2), 2D pixel art game background, parallax scrolling layer, {layer_desc.get(layer, '')}, {time_desc.get(tod, '')}, {base_prompt}, seamless tileable horizontal"
            negative = "3d, realistic, photo, text, watermark, ugly, blurry"
            
            output = bg_dir / f"{region}-BG-{variant}.png"
            print(f"  Generating: {output.name}")
            if generate_image(prompt, str(output), negative, width=512, height=256, steps=15, cfg=7.0):
                count += 1
            else:
                # Fallback to placeholder
                generate_placeholder(str(output), 512, 256, label=f"{region}-BG-{variant}")
                count += 1
    
    # 10th region: oblivion (망각의고원) - 4 backgrounds
    oblivion_prefix = "OBL"
    base_prompt = "desolate highland plateau, oblivion wasteland, floating memory fragments, grey mist, forgotten ruins, dark fantasy"
    for layer in ["FAR", "MID", "NEAR", "SKY"]:
        output = bg_dir / f"{oblivion_prefix}-BG-{layer}-DAY.png"
        prompt = f"(masterpiece:1.3), (best quality:1.2), 2D pixel art game background, parallax layer, {layer_desc.get(layer, '')}, bright daylight, {base_prompt}"
        print(f"  Generating: {output.name}")
        if generate_image(prompt, str(output), width=512, height=256, steps=15, cfg=7.0):
            count += 1
        else:
            generate_placeholder(str(output), 512, 256, label=f"{oblivion_prefix}-BG-{layer}-DAY")
            count += 1
    
    return count

def generate_missing_tiles():
    """Generate missing environment tiles"""
    tile_dir = BASE_DIR / "assets/generated/environment/tiles"
    
    # Missing tiles by region (need 9 each, some have 4)
    missing = {
        "ERB": list(range(5, 10)),  # ERB-G-05..09
        "SOL": list(range(5, 10)),
        "SYL": list(range(5, 10)),
    }
    
    region_prompts = {
        "ERB": "dark stone tiles, erebos dungeon floor, purple crystal veins, underground texture",
        "SOL": "golden sandstone tiles, solaris desert floor, sun-bleached stone, warm sand texture",
        "SYL": "forest floor tiles, sylvanheim mossy ground, fallen leaves, tree roots, natural earth",
    }
    
    count = 0
    for region, indices in missing.items():
        base_prompt = region_prompts[region]
        for idx in indices:
            output = tile_dir / f"{region}-G-{idx:02d}.png"
            prompt = f"(masterpiece:1.3), (best quality:1.2), 2D pixel art game tileset, top-down view, seamless texture, {base_prompt}, 64x64 tile"
            print(f"  Generating: {output.name}")
            if generate_image(prompt, str(output), width=512, height=512, steps=15, cfg=7.0):
                count += 1
            else:
                generate_placeholder(str(output), 512, 512, label=f"{region}-G-{idx:02d}")
                count += 1
    return count

def generate_missing_monsters():
    """Generate missing monster boss/elite images"""
    eb_dir = BASE_DIR / "assets/generated/monsters/elite_boss"
    rb_dir = BASE_DIR / "assets/generated/monsters/raid_boss"
    
    existing_eb = set(os.listdir(eb_dir)) if eb_dir.exists() else set()
    existing_rb = set(os.listdir(rb_dir)) if rb_dir.exists() else set()
    
    count = 0
    # Need 70 total in elite_boss (40 elite + 30 boss), have 62 → need 8 more
    boss_prompts = [
        ("BOSS-SYL-ELDER.png", "ancient tree guardian boss, sylvanheim elder, massive wooden golem, glowing runes, dark fantasy pixel art"),
        ("BOSS-ERB-SHADOW.png", "shadow overlord boss, erebos dark entity, purple aura, menacing silhouette, dark fantasy pixel art"),
        ("BOSS-SOL-PHOENIX.png", "solar phoenix boss, solaris fire bird, golden flames, majestic wings, fantasy pixel art"),
        ("BOSS-NOR-FROST.png", "frost giant boss, northland ice colossus, frozen armor, crystal eyes, dark fantasy pixel art"),
        ("BOSS-FOG-LEVIATHAN.png", "sea leviathan boss, fog sea serpent, tentacles, ocean mist, dark fantasy pixel art"),
        ("BOSS-ARG-AUTOMATON.png", "mechanical automaton boss, argentium clockwork giant, gears and steam, dark fantasy pixel art"),
        ("BOSS-ABY-VOID.png", "void horror boss, abyss tentacle creature, cosmic darkness, eldritch horror, dark fantasy pixel art"),
        ("BOSS-TEM-CHRONO.png", "chrono guardian boss, temporal rift warden, time distortion aura, dark fantasy pixel art"),
    ]
    
    for filename, prompt in boss_prompts:
        output = eb_dir / filename
        full_prompt = f"(masterpiece:1.3), (best quality:1.2), 2D pixel art game monster sprite, {prompt}, transparent background, centered"
        print(f"  Generating: {filename}")
        if generate_image(full_prompt, str(output), steps=15, cfg=7.0):
            count += 1
        else:
            generate_placeholder(str(output), label=filename)
            count += 1
    
    # Raid boss / temporal rift gap: have 32, need 38 → 6 more
    rift_prompts = [
        ("TMP-RIFT-025.png", "temporal anomaly monster, clock fragment creature, time distortion sprite"),
        ("TMP-RIFT-026.png", "memory echo beast, ghostly temporal duplicate, fading edges sprite"),
        ("TMP-RIFT-027.png", "chrono spider, web of frozen time, crystallized moments sprite"),
        ("TMP-RIFT-028.png", "time wurm, segmented temporal serpent, phase-shifting body sprite"),
        ("TMP-RIFT-029.png", "paradox golem, contradictory elements merged, glitching sprite"),
        ("TMP-RIFT-030.png", "entropy swarm, tiny temporal insects, dissolving time sprite"),
    ]
    
    for filename, prompt in rift_prompts:
        output = rb_dir / filename
        full_prompt = f"(masterpiece:1.3), (best quality:1.2), 2D pixel art game monster sprite, {prompt}, transparent background, dark fantasy"
        print(f"  Generating: {filename}")
        if generate_image(full_prompt, str(output), steps=15, cfg=7.0):
            count += 1
        else:
            generate_placeholder(str(output), label=filename)
            count += 1
    
    return count

def generate_npc_sprites():
    """Generate NPC sprites from existing prompts"""
    prompts_dir = BASE_DIR / "assets/prompts/characters/npc_sprites"
    output_dir = BASE_DIR / "assets/generated/characters/npc_sprites"
    os.makedirs(output_dir, exist_ok=True)
    
    count = 0
    for pf in sorted(prompts_dir.glob("*.json")):
        try:
            with open(pf) as f:
                data = json.load(f)
        except:
            continue
        
        npc_name = pf.stem
        # Extract prompt
        if isinstance(data, dict):
            prompt = data.get("prompt", data.get("sd_prompt", ""))
            negative = data.get("negative_prompt", data.get("negative", ""))
            if not prompt and "prompts" in data:
                p = data["prompts"]
                if isinstance(p, dict) and "sd" in p:
                    prompt = p["sd"].get("prompt", "")
                    negative = p["sd"].get("negative_prompt", "")
        else:
            continue
        
        if not prompt:
            prompt = f"(masterpiece:1.3), 2D pixel art game character sprite, NPC, {npc_name}, standing pose, dark fantasy RPG style, transparent background"
            negative = "ugly, blurry, low quality, watermark"
        
        output = output_dir / f"{npc_name}.png"
        print(f"  Generating: {npc_name}")
        if generate_image(prompt, str(output), negative, steps=15, cfg=7.0):
            count += 1
        else:
            generate_placeholder(str(output), label=npc_name)
            count += 1
    
    return count

def generate_ui_frames():
    """Generate UI frame components"""
    prompts_file = BASE_DIR / "assets/prompts/ui/frames/all_frames.json"
    output_dir = BASE_DIR / "assets/generated/ui/frames"
    os.makedirs(output_dir, exist_ok=True)
    
    with open(prompts_file) as f:
        data = json.load(f)
    
    variants = data.get("variants", [])
    count = 0
    
    for variant in variants:
        asset_id = variant.get("asset_id", f"UI-{count:03d}")
        prompts = variant.get("prompts", {})
        sd_prompt = ""
        sd_negative = ""
        
        if isinstance(prompts, dict) and "sd" in prompts:
            sd_prompt = prompts["sd"].get("prompt", "")
            sd_negative = prompts["sd"].get("negative_prompt", "")
        
        if not sd_prompt:
            name = variant.get("name_en", variant.get("name_ko", f"ui_component_{count}"))
            desc = variant.get("description", "")
            sd_prompt = f"(masterpiece:1.3), 2D pixel art game UI component, dark fantasy RPG style, {name}, {desc}, transparent background, clean edges"
            sd_negative = "ugly, blurry, realistic, 3d, photo, text"
        
        output = output_dir / f"{asset_id}.png"
        print(f"  Generating: {asset_id}")
        if generate_image(sd_prompt, str(output), sd_negative, width=512, height=512, steps=12, cfg=7.0):
            count += 1
        else:
            colors = variant.get("colors", {})
            bg_hex = colors.get("bg", "#1A1A2E")
            r, g, b = int(bg_hex[1:3], 16), int(bg_hex[3:5], 16), int(bg_hex[5:7], 16)
            generate_placeholder(str(output), 512, 512, (r, g, b), label=asset_id)
            count += 1
    
    return count

def generate_character_sprite_advancements():
    """Generate missing character sprite advancement stages"""
    prompts_dir = BASE_DIR / "assets/prompts/characters/class_advanced"
    output_dir = BASE_DIR / "assets/generated/characters/sprites"
    os.makedirs(output_dir, exist_ok=True)
    
    # ether_knight already has base + 2nd + 3rd + 4th
    # Need: other 5 classes × 3 advancement stages (adv1, adv2, adv3) = 15 sheets
    classes_needed = ["memory_weaver", "shadow_weaver", "memory_breaker", "time_guardian", "void_wanderer"]
    
    count = 0
    for cls in classes_needed:
        for adv in ["adv1", "adv2", "adv3"]:
            prompt_file = prompts_dir / f"{cls}_{adv}.json"
            output_file = output_dir / f"char_sprite_{cls}_{adv}_sprite_sheet.png"
            
            if output_file.exists():
                count += 1
                continue
            
            prompt = ""
            negative = ""
            if prompt_file.exists():
                try:
                    with open(prompt_file) as f:
                        data = json.load(f)
                    if isinstance(data, dict):
                        prompt = data.get("prompt", data.get("sd_prompt", ""))
                        negative = data.get("negative_prompt", "")
                        if not prompt and "prompts" in data:
                            p = data["prompts"]
                            if isinstance(p, dict) and "sd" in p:
                                prompt = p["sd"].get("prompt", "")
                                negative = p["sd"].get("negative_prompt", "")
                except:
                    pass
            
            if not prompt:
                class_descs = {
                    "memory_weaver": "memory mage, ethereal robes, glowing memory threads",
                    "shadow_weaver": "shadow assassin, dark cloak, shadow daggers",
                    "memory_breaker": "heavy warrior, memory-infused armor, crystalline hammer",
                    "time_guardian": "time keeper, clockwork armor, temporal shield",
                    "void_wanderer": "void traveler, dimensional cloak, portal staff",
                }
                adv_descs = {
                    "adv1": "2nd advancement, enhanced design, stronger magical aura",
                    "adv2": "3rd advancement, ornate armor/robes, powerful enchantments",
                    "adv3": "4th advancement, ultimate form, legendary equipment, maximum power aura",
                }
                desc = class_descs.get(cls, cls)
                adv_desc = adv_descs.get(adv, adv)
                prompt = f"(masterpiece:1.3), (best quality:1.2), 2D pixel art RPG character sprite sheet, {desc}, {adv_desc}, 8 directional views, idle pose, 64x64 pixel, dark fantasy style, transparent background"
                negative = "ugly, blurry, realistic, 3d, text, watermark"
            
            print(f"  Generating: {cls}_{adv}")
            if generate_image(prompt, str(output_file), negative, width=512, height=512, steps=15, cfg=7.0):
                count += 1
            else:
                generate_placeholder(str(output_file), label=f"{cls}_{adv}")
                count += 1
    
    return count

# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════
def main():
    print("=" * 60)
    print("P21 배치 이미지 생성 시작")
    print("=" * 60)
    
    results = {}
    
    # Check ComfyUI
    try:
        resp = urllib.request.urlopen(f"{COMFYUI_URL}/system_stats", timeout=5)
        print("[OK] ComfyUI is running")
    except:
        print("[WARN] ComfyUI not responding, will use placeholders")
    
    print("\n--- 1. Missing Backgrounds ---")
    results["backgrounds"] = generate_missing_backgrounds()
    print(f"  → {results['backgrounds']} backgrounds generated")
    
    print("\n--- 2. Missing Tiles ---")
    results["tiles"] = generate_missing_tiles()
    print(f"  → {results['tiles']} tiles generated")
    
    print("\n--- 3. Missing Monsters ---")
    results["monsters"] = generate_missing_monsters()
    print(f"  → {results['monsters']} monsters generated")
    
    print("\n--- 4. NPC Sprites ---")
    results["npc_sprites"] = generate_npc_sprites()
    print(f"  → {results['npc_sprites']} NPC sprites generated")
    
    print("\n--- 5. UI Frames ---")
    results["ui_frames"] = generate_ui_frames()
    print(f"  → {results['ui_frames']} UI frames generated")
    
    print("\n--- 6. Character Sprite Advancements ---")
    results["char_sprites"] = generate_character_sprite_advancements()
    print(f"  → {results['char_sprites']} character sprite sheets generated")
    
    print("\n" + "=" * 60)
    print("P21 배치 생성 완료")
    total = sum(results.values())
    print(f"총 생성: {total}장")
    for k, v in results.items():
        print(f"  {k}: {v}")
    print("=" * 60)
    
    # Save results
    with open(BASE_DIR / "assets/generated/p21_batch_result.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
