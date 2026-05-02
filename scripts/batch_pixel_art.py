#!/usr/bin/env python3
"""
P36 — Pixel Art RPG Style Batch Generator
ComfyUI API를 통한 16비트 픽셀아트 스타일 이미지 재생성
레퍼런스: Chrono Trigger / Moonlighter / Chronicon
"""

import json
import requests
import time
import os
import sys
import uuid
import shutil
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
ASSETS_DIR = PROJECT_ROOT / "assets" / "generated"
BACKUP_DIR = PROJECT_ROOT / "assets" / "generated_backup_sd15"
OUTPUT_DIR = Path(os.environ.get("AETERNA_PIXEL_OUT", PROJECT_ROOT / "client" / "public" / "generated_pixel_art"))

# 픽셀아트 fine-tune checkpoint 단독 사용 — LoRA/Upscaler 의존성 옵셔널화
CHECKPOINT = os.environ.get("COMFYUI_CHECKPOINT", "pixel-art-style.ckpt")
# USE_LORA=1 일 때만 LoRA chain 활성화 (gated 모델 보유 시)
USE_LORA = os.environ.get("USE_LORA", "0") == "1"
LORA_NAME = os.environ.get("LORA_NAME", "pixel_art_style_v1.0.safetensors")
LORA_NAME_2 = os.environ.get("LORA_NAME_2", "PixelArtRedmond-sd15.safetensors")
UPSCALER = os.environ.get("UPSCALER", "4x-UltraSharp.pth")

# 생성 파라미터
# SD 1.5 native resolution = 512. 128px은 garbage 출력.
PIXEL_SIZE = 512
FINAL_SIZE = 512
STEPS = 30
# CFG 11 — T1-3a 튜닝 검증값 (CFG 8 대비 적격률 33%→100% on 3 샘플)
CFG = 11.0
SAMPLER = "euler_ancestral"
SCHEDULER = "normal"

# 공통 프롬프트 요소 — T1-3a 강화 적용 (single creature / full body / white background)
POSITIVE_BASE = "(pixel art:1.4), (16-bit rpg style:1.3), snes era, retro game sprite, (clean pixel edges:1.3), (limited color palette:1.2), fantasy rpg, chrono trigger style, moonlighter style, PixArFK, (pixelated:1.3), game asset, (sharp pixels:1.2), no anti-aliasing, (dithering shading:1.1), dark outline, (centered composition:1.3), (single creature:1.4), (full body:1.3), (full character visible:1.3), (white background:1.3)"
NEGATIVE_BASE = "(blurry:1.5), (realistic:1.5), photograph, (3d render:1.4), (smooth gradients:1.4), anti-aliasing, high resolution details, noise, watermark, text, modern, photorealistic, 3d, cgi, painting, oil painting, sketch, pencil, soft shading, multiple views, collage, grid, tiled, (abstract pattern:1.4), (texture only:1.3), (background scenery:1.3), (no character:1.4), (cropped:1.2)"


def build_workflow(positive_prompt: str, negative_prompt: str, width: int = PIXEL_SIZE, height: int = PIXEL_SIZE, seed: int = -1, use_upscale: bool = False) -> dict:
    """ComfyUI API 워크플로우 — txt2img + dual LoRA @ 512×512 native"""
    if seed == -1:
        seed = int.from_bytes(os.urandom(4), 'big') % (2**32)

    # USE_LORA=1 면 LoRA chain, 아니면 CheckpointLoader → CLIP 직결 (T1-1 패턴)
    if USE_LORA:
        workflow = {
            "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
            "5": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA_NAME_2, "strength_model": 0.7, "strength_clip": 0.7, "model": ["1", 0], "clip": ["1", 1]}},
            "4": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA_NAME, "strength_model": 0.8, "strength_clip": 0.8, "model": ["5", 0], "clip": ["5", 1]}},
            "2": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{POSITIVE_BASE}, {positive_prompt}", "clip": ["4", 1]}},
            "3": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{NEGATIVE_BASE}, {negative_prompt}", "clip": ["4", 1]}},
            "6": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
            "7": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 0], "seed": seed, "steps": STEPS, "cfg": CFG, "sampler_name": SAMPLER, "scheduler": SCHEDULER, "denoise": 1.0}},
            "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["1", 2]}},
            "12": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "pixel_art"}},
        }
    else:
        workflow = {
            "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
            "2": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{POSITIVE_BASE}, {positive_prompt}", "clip": ["1", 1]}},
            "3": {"class_type": "CLIPTextEncode", "inputs": {"text": f"{NEGATIVE_BASE}, {negative_prompt}", "clip": ["1", 1]}},
            "6": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
            "7": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 0], "seed": seed, "steps": STEPS, "cfg": CFG, "sampler_name": SAMPLER, "scheduler": SCHEDULER, "denoise": 1.0}},
            "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["1", 2]}},
            "12": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "pixel_art"}},
        }
    return workflow


def queue_prompt(workflow: dict) -> str:
    """ComfyUI에 프롬프트 큐 추가, prompt_id 반환"""
    payload = {"prompt": workflow, "client_id": str(uuid.uuid4())}
    resp = requests.post(f"{COMFYUI_API}/prompt", json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"Queue failed: {resp.status_code} {resp.text[:200]}")
    return resp.json()["prompt_id"]


def wait_for_completion(prompt_id: str, timeout: int = 120) -> dict:
    """프롬프트 완료까지 대기"""
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"{COMFYUI_API}/history/{prompt_id}")
        if resp.status_code == 200:
            data = resp.json()
            if prompt_id in data:
                return data[prompt_id]
        time.sleep(2)
    raise TimeoutError(f"Prompt {prompt_id} timed out after {timeout}s")


def get_output_images(history: dict) -> list:
    """히스토리에서 출력 이미지 경로 추출"""
    images = []
    for node_id, node_output in history.get("outputs", {}).items():
        if "images" in node_output:
            for img in node_output["images"]:
                images.append(img)
    return images


def download_image(image_info: dict, save_path: Path):
    """ComfyUI 출력 이미지를 지정 경로에 저장"""
    filename = image_info["filename"]
    subfolder = image_info.get("subfolder", "")
    img_type = image_info.get("type", "output")
    resp = requests.get(f"{COMFYUI_API}/view", params={
        "filename": filename,
        "subfolder": subfolder,
        "type": img_type
    })
    if resp.status_code == 200:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(resp.content)
        return True
    return False


def generate_image(positive: str, negative: str, save_path: Path, width: int = PIXEL_SIZE, height: int = PIXEL_SIZE, seed: int = -1) -> bool:
    """단일 이미지 생성 + 저장"""
    try:
        workflow = build_workflow(positive, negative, width, height, seed)
        prompt_id = queue_prompt(workflow)
        history = wait_for_completion(prompt_id, timeout=180)

        if history.get("status", {}).get("status_str") == "error":
            print(f"  ❌ Generation error for {save_path.name}")
            return False

        images = get_output_images(history)
        if images:
            return download_image(images[0], save_path)
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


# ========== 에셋 정의 ==========

# A. 캐릭터 메인 일러스트 (18장)
CHARACTER_CLASSES = {
    "ether_knight": "ethereal armored knight, glowing blue sword, heavy plate armor, noble warrior, ethereal energy aura",
    "memory_weaver": "mystical mage, flowing robes, memory crystal staff, arcane symbols, luminous energy orbs",
    "shadow_weaver": "dark hooded assassin, shadow daggers, dark cloak, stealth, shadowy tendrils",
    "memory_breaker": "berserker warrior, fractured armor, memory shard gauntlets, fierce expression, cracked energy",
    "time_guardian": "temporal knight, clockwork armor, hourglass shield, time runes, golden mechanical details",
    "void_wanderer": "mysterious wanderer, cosmic cloak, void energy, dimensional rifts, starfield patterns",
}
DIRECTIONS = ["front", "back", "side"]

# B. NPC 초상화 (30장) — 기존 파일명에서 이름 추출
NPC_LIST = [
    ("01_cryo", "ice mage, cold blue eyes, frost crystals, silver hair"),
    ("02_eris", "chaos sorceress, wild red hair, dark magic aura"),
    ("03_lumina", "light priestess, golden robes, healing aura, gentle face"),
    ("04_mateus", "veteran commander, scarred face, heavy armor, stern expression"),
    ("05_seraphine", "angelic healer, white wings, divine light, compassionate"),
    ("06_urgrom", "orc blacksmith, muscular, forge hammer, leather apron"),
    ("07_naila", "elven archer, green cloak, pointed ears, nature energy"),
    ("08_ifrita", "fire elemental spirit, flame hair, burning eyes, ember particles"),
    ("09_milena", "scholar librarian, glasses, ancient books, ink stains"),
    ("10_torga", "dwarf merchant, thick beard, coin purse, jovial"),
    ("11_kobal", "goblin tinkerer, goggles, mechanical gadgets, mischievous"),
    ("12_memoria", "memory spirit, translucent form, glowing runes, ethereal"),
    ("13_hashir", "desert nomad, wrapped face, curved blade, sand magic"),
    ("14_lunaria", "moon witch, crescent staff, night sky robes, mystical"),
    ("15_veltus", "old sage, long white beard, crystal ball, wise eyes"),
    ("16_okia", "young apprentice, messy hair, spell book, eager expression"),
    ("17_siren", "sea enchantress, aqua scales, coral crown, wave magic"),
    ("18_memory_fragment", "crystalline entity, fragmented form, prismatic light"),
    ("19_kalen", "shadow thief, dark mask, daggers, street smart"),
    ("20_mira", "fortune teller, tarot cards, mystic veil, third eye"),
    ("21_grove", "treant guardian, bark skin, mossy crown, ancient wood"),
    ("22_fenris", "wolf shapeshifter, feral eyes, silver fur accents, wild"),
    ("23_cipher", "code mage, runic tattoos, data streams, matrix patterns"),
    ("24_aurora", "dawn knight, sunrise armor, golden lance, radiant"),
    ("25_nyx", "shadow dancer, obsidian jewelry, night veil, graceful"),
    ("26_bolt", "thunder engineer, spark gauntlets, blue lightning, energetic"),
    ("27_gaia", "earth mother, stone skin, flowering vines, nurturing"),
    ("28_echo", "memory echo, semi-transparent, duplicating form, melancholy"),
    ("29_rune", "inscription master, floating letters, ancient script, focused"),
    ("30_vale", "rift watcher, dimensional scars, void telescope, contemplative"),
]

def run_characters(output_base: Path):
    """A. 캐릭터 메인 일러스트 18장"""
    print("\n🎨 === Phase A: 캐릭터 메인 일러스트 (18장) ===")
    success, fail = 0, 0
    for class_id, desc in CHARACTER_CLASSES.items():
        for direction in DIRECTIONS:
            filename = f"char_illust_{class_id}_{direction}.png"
            save_path = output_base / "characters" / "class_main" / filename
            positive = f"pixel art character portrait, {desc}, {direction} view, full body, fantasy rpg hero, detailed pixel art, 16-bit style, game character"
            negative = "multiple characters, text, UI elements, frame border"
            print(f"  → {filename}...", end=" ", flush=True)
            ok = generate_image(positive, negative, save_path)
            if ok:
                success += 1
                print("✅")
            else:
                fail += 1
                print("❌")
    print(f"  캐릭터: {success}✅ {fail}❌")
    return success, fail


def run_npcs(output_base: Path):
    """B. NPC 초상화 30장"""
    print("\n🎨 === Phase B: NPC 초상화 (30장) ===")
    success, fail = 0, 0
    for npc_id, desc in NPC_LIST:
        filename = f"npc_portrait_{npc_id}_portrait.png"
        save_path = output_base / "characters" / "npc" / filename
        positive = f"pixel art npc portrait, {desc}, fantasy village, 16-bit rpg, bust portrait, detailed face"
        negative = "full body, multiple characters, text, modern, realistic"
        print(f"  → {filename}...", end=" ", flush=True)
        ok = generate_image(positive, negative, save_path)
        if ok:
            success += 1
            print("✅")
        else:
            fail += 1
            print("❌")
    print(f"  NPC: {success}✅ {fail}❌")
    return success, fail


def run_monsters_sample(output_base: Path, count: int = 5):
    """C. 몬스터 샘플 (테스트용)"""
    print(f"\n🎨 === Phase C-test: 몬스터 샘플 ({count}장) ===")
    MONSTER_SAMPLES = [
        ("mon_abyss_echo_phantom_normal", "spectral ghost, echo phantom, ethereal wisps, dark abyss, floating, glowing eyes"),
        ("mon_abyss_ether_serpent_normal", "ethereal serpent, dragon-like, luminous scales, coiled, abyss environment"),
        ("mon_abyss_glitch_spider_normal", "glitch spider, mechanical arachnid, data corruption, digital distortion"),
        ("mon_abyss_memory_bloom_normal", "memory bloom, crystalline flower monster, prismatic petals, memory energy"),
        ("mon_abyss_fracture_elemental_normal", "fracture elemental, cracked stone body, energy leaking, unstable form"),
    ]
    success, fail = 0, 0
    for mon_id, desc in MONSTER_SAMPLES[:count]:
        filename = f"{mon_id}.png"
        save_path = output_base / "monsters" / "normal" / filename
        positive = f"pixel art monster sprite, {desc}, fantasy rpg enemy, chrono trigger monster style, game enemy, single creature, centered"
        negative = "multiple creatures, background scene, text, realistic, human"
        print(f"  → {filename}...", end=" ", flush=True)
        ok = generate_image(positive, negative, save_path)
        if ok:
            success += 1
            print("✅")
        else:
            fail += 1
            print("❌")
    print(f"  몬스터 샘플: {success}✅ {fail}❌")
    return success, fail


def run_test_batch(output_base: Path):
    """테스트 배치: 5장 (캐릭터 3 + 몬스터 2)"""
    print("\n🧪 === TEST BATCH (5장) ===")
    output_base.mkdir(parents=True, exist_ok=True)
    total_s, total_f = 0, 0

    # 캐릭터 테스트 3장 (에테르 기사 front/back/side)
    for direction in DIRECTIONS:
        filename = f"TEST_ether_knight_{direction}.png"
        save_path = output_base / filename
        positive = f"pixel art character portrait, ethereal armored knight, glowing blue sword, heavy plate armor, noble warrior, ethereal energy aura, {direction} view, full body, fantasy rpg hero, detailed pixel art, 16-bit style"
        negative = "multiple characters, text, UI elements, frame border, realistic, blurry"
        print(f"  → {filename}...", end=" ", flush=True)
        ok = generate_image(positive, negative, save_path)
        if ok:
            total_s += 1
            print("✅")
        else:
            total_f += 1
            print("❌")

    # 몬스터 테스트 2장
    monsters_test = [
        ("TEST_echo_phantom", "spectral ghost, echo phantom, ethereal wisps, dark abyss, floating, glowing eyes"),
        ("TEST_ether_serpent", "ethereal serpent, dragon-like, luminous scales, coiled, abyss environment"),
    ]
    for mon_id, desc in monsters_test:
        filename = f"{mon_id}.png"
        save_path = output_base / filename
        positive = f"pixel art monster sprite, {desc}, fantasy rpg enemy, chrono trigger monster style, game enemy, single creature, centered"
        negative = "multiple creatures, background scene, text, realistic, human"
        print(f"  → {filename}...", end=" ", flush=True)
        ok = generate_image(positive, negative, save_path)
        if ok:
            total_s += 1
            print("✅")
        else:
            total_f += 1
            print("❌")

    print(f"\n🧪 TEST 결과: {total_s}✅ {total_f}❌ / 5")
    return total_s, total_f


def run_full_batch():
    """전체 배치 실행"""
    output_base = OUTPUT_DIR
    output_base.mkdir(parents=True, exist_ok=True)

    results = {}
    s, f = run_characters(output_base)
    results["characters"] = (s, f)

    s, f = run_npcs(output_base)
    results["npcs"] = (s, f)

    # 몬스터 전체는 별도
    print("\n📊 === 배치 결과 ===")
    total_s = sum(r[0] for r in results.values())
    total_f = sum(r[1] for r in results.values())
    for cat, (s, f) in results.items():
        print(f"  {cat}: {s}✅ {f}❌")
    print(f"  합계: {total_s}✅ {total_f}❌")
    return results


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"

    # ComfyUI 연결 확인
    try:
        resp = requests.get(f"{COMFYUI_API}/system_stats", timeout=5)
        if resp.status_code != 200:
            print("❌ ComfyUI not responding")
            sys.exit(1)
        print("✅ ComfyUI connected")
    except Exception:
        print("❌ ComfyUI not running at", COMFYUI_API)
        sys.exit(1)

    if mode == "test":
        test_dir = OUTPUT_DIR / "_test"
        run_test_batch(test_dir)
    elif mode == "characters":
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        run_characters(OUTPUT_DIR)
    elif mode == "npcs":
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        run_npcs(OUTPUT_DIR)
    elif mode == "monsters_sample":
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        run_monsters_sample(OUTPUT_DIR)
    elif mode == "full":
        run_full_batch()
    else:
        print(f"Usage: {sys.argv[0]} [test|characters|npcs|monsters_sample|full]")
