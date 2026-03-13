#!/usr/bin/env python3
"""
SFX Batch Runner — P19-08~14: 전투/UI/시스템/환경/기억 SFX 일괄 생성
AudioGen으로 생성 후 .wav → .ogg 변환
"""

import os
import sys
import json
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# ─── 프로젝트 루트 ───────────────────────────────────────────────
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS_BASE = os.path.join(PROJECT_ROOT, 'assets', 'generated', 'audio')

# ─── SFX 정의: (파일명, 프롬프트, 초) ────────────────────────────

# P19-09: 전투 SFX (물리) 13개
COMBAT_PHYSICAL = [
    ("sword_slash_1", "sword slash swinging blade through air, sharp metallic", 2),
    ("sword_slash_2", "quick sword strike metal clang, combat hit", 2),
    ("sword_slash_3", "heavy sword swing cutting through air, whoosh blade", 2),
    ("heavy_strike", "heavy hammer strike impact, powerful thud crushing blow", 2),
    ("arrow_shoot", "bow arrow release twang, projectile launch whoosh", 2),
    ("arrow_hit", "arrow hitting target thud impact, projectile landing", 1),
    ("guard_block", "shield blocking sword attack, metal clank defensive", 2),
    ("guard_break", "shield breaking shatter, defensive barrier destroyed crack", 2),
    ("dodge_roll", "quick dodge roll movement, swoosh fabric rustling evasion", 2),
    ("hit_flesh", "blunt impact on body, punch hit flesh thud", 1),
    ("hit_metal", "weapon hitting metal armor, clang impact metallic", 1),
    ("hit_magic", "magical energy impact, sparkle burst ethereal hit", 2),
    ("critical_hit", "powerful critical strike, explosive impact devastating blow", 2),
]

# P19-10: 전투 SFX (마법+스킬) 12개
COMBAT_MAGIC = [
    ("magic_fire", "fire spell casting, flames erupting whoosh crackling", 3),
    ("magic_ice", "ice spell freezing, crystalline shatter frost crackle", 3),
    ("magic_lightning", "lightning bolt thunder strike, electric zap crackling energy", 2),
    ("magic_heal", "healing magic warm glow, gentle chime restoration sparkle", 3),
    ("magic_dark", "dark magic shadow energy, ominous rumble void power", 3),
    ("skill_activate", "skill activation magical power up, energy gathering burst", 2),
    ("skill_ultimate", "ultimate skill massive energy explosion, epic power unleash", 3),
    ("buff_apply", "positive buff applied, shimmering magical enhancement chime", 2),
    ("debuff_apply", "negative debuff curse applied, dark draining energy", 2),
    ("enemy_death", "enemy defeated death cry, creature collapsing dissolve", 2),
    ("player_death", "player character death, dramatic fall collapse", 3),
    ("revive", "resurrection revive, magical rebirth rising energy chime", 3),
]

# P19-11: UI SFX 15개
UI_SFX = [
    ("click", "UI button click, clean digital interface tap", 0.5),
    ("hover", "UI hover soft blip, subtle interface highlight", 0.3),
    ("open", "menu window opening, interface panel slide open", 1),
    ("close", "menu window closing, interface panel slide shut", 0.8),
    ("confirm", "confirmation positive chime, success accept ding", 1),
    ("cancel", "cancel button press, negative soft tone back", 0.8),
    ("error", "error warning buzz, negative alert tone beep", 1),
    ("level_up", "level up fanfare, triumphant ascending chime celebration", 3),
    ("achievement", "achievement unlocked, glorious medal reward fanfare", 3),
    ("quest_accept", "quest accepted, scroll unrolling adventure chime", 2),
    ("quest_complete", "quest completed, triumphant completion fanfare reward", 2),
    ("item_pickup", "item pickup collect, light grab sound loot chime", 1),
    ("item_equip", "equipment equip gear, metallic click attach armor", 1),
    ("gold_gain", "gold coins collected, jingling money chime", 1),
    ("notification", "notification alert ping, gentle attention bell", 1),
]

# P19-12: 시스템 SFX 10개
SYSTEM_SFX = [
    ("login", "system login welcome, digital interface startup chime", 2),
    ("logout", "system logout, gentle farewell shutdown tone", 2),
    ("mail_arrive", "new mail notification, letter envelope arriving alert", 1),
    ("party_invite", "party invitation, social gathering notification chime", 2),
    ("party_join", "party joined, group welcome confirmation tone", 1),
    ("guild_notice", "guild announcement, banner horn notification", 2),
    ("trade_request", "trade request, merchant transaction bell notification", 1),
    ("chat_whisper", "whisper message, soft subtle private notification", 1),
    ("screenshot", "camera shutter screenshot, photo capture click", 1),
    ("server_message", "server broadcast announcement, system wide notification", 2),
]

# P19-13: 환경음 15개 (10~30초 루프용)
AMBIENT_SFX = [
    ("forest_day", "forest daytime birds chirping, leaves rustling gentle wind nature", 15),
    ("forest_night", "forest nighttime crickets owl hooting, gentle wind dark ambient", 15),
    ("ocean_waves", "ocean waves crashing shore, sea water flowing beach ambient", 20),
    ("river_stream", "river stream flowing water, gentle creek bubbling nature", 15),
    ("cave_drip", "cave water dripping echoing, underground cavern hollow ambient", 15),
    ("cave_wind", "cave wind howling through tunnels, underground hollow breeze eerie", 15),
    ("rain_light", "light rain drizzle falling, gentle precipitation patter", 15),
    ("rain_heavy", "heavy rain downpour storm, intense rainfall thunderstorm", 20),
    ("snow_wind", "blizzard snowstorm howling wind, frozen tundra arctic cold", 15),
    ("volcano_rumble", "volcano rumbling lava bubbling, deep earth tremor fire ambient", 15),
    ("city_crowd", "medieval city crowd murmuring, people walking market town", 15),
    ("market_bustle", "busy marketplace vendors calling, trade bazaar crowd noise", 15),
    ("dungeon_eerie", "dark dungeon eerie ambient, dripping chains rattling distant moans", 15),
    ("ether_hum", "ethereal magical humming energy, mystical resonance crystal vibration", 15),
    ("clockwork_tick", "clockwork mechanism ticking gears, mechanical rhythmic precise", 15),
]

# P19-14: 기억 메카닉 SFX 9개
MEMORY_SFX = [
    ("fragment_detect", "magical detection pulse, mystical radar ping discovery shimmer", 2),
    ("fragment_collect", "memory fragment collected, crystal absorb ethereal energy gather", 2),
    ("resonance_trigger", "resonance activation harmonic vibration, tuning fork crystal chime deep", 3),
    ("memory_restore", "memory restoration, knowledge flowing warm light ascending revelation", 3),
    ("memory_dissolve", "memory dissolving fading away, dissipating ethereal whisper vanish", 3),
    ("oblivion_fog", "fog of oblivion creeping mist, ominous encroaching haze darkness", 3),
    ("memory_summon", "summoning memory entity, spectral manifestation apparition appear", 3),
    ("oblivion_arrow", "oblivion arrow projectile, dark void energy missile launch impact", 2),
    ("memory_explosion", "memory explosion burst, massive ethereal energy detonation shockwave", 3),
]


def generate_all_sfx(engine, categories, skip_existing=True):
    """Generate all SFX for given categories"""
    results = {"success": 0, "fail": 0, "skip": 0, "details": []}

    for cat_name, sfx_list, output_dir in categories:
        logger.info(f"\n{'='*60}\n  Category: {cat_name} ({len(sfx_list)} files)\n{'='*60}")
        os.makedirs(output_dir, exist_ok=True)

        for filename, prompt, duration in sfx_list:
            ogg_path = os.path.join(output_dir, f"{filename}.ogg")
            wav_path = os.path.join(output_dir, f"{filename}.wav")

            if skip_existing and os.path.exists(ogg_path):
                logger.info(f"SKIP (exists): {ogg_path}")
                results["skip"] += 1
                results["details"].append({"file": filename, "status": "skip"})
                continue

            ok = engine.generate(prompt, duration, wav_path)
            if ok:
                ogg_ok = engine.wav_to_ogg(wav_path, ogg_path)
                if ogg_ok:
                    # Remove intermediate WAV
                    try:
                        os.remove(wav_path)
                    except:
                        pass
                    results["success"] += 1
                    results["details"].append({"file": filename, "status": "ok", "path": ogg_path})
                else:
                    results["fail"] += 1
                    results["details"].append({"file": filename, "status": "ogg_fail"})
            else:
                results["fail"] += 1
                results["details"].append({"file": filename, "status": "gen_fail"})

    return results


def main():
    from audiogen_engine import AudioGenEngine

    engine = AudioGenEngine('facebook/audiogen-medium')

    categories = [
        ("P19-09 전투(물리)", COMBAT_PHYSICAL, os.path.join(ASSETS_BASE, 'sfx', 'combat')),
        ("P19-10 전투(마법)", COMBAT_MAGIC, os.path.join(ASSETS_BASE, 'sfx', 'combat')),
        ("P19-11 UI", UI_SFX, os.path.join(ASSETS_BASE, 'sfx', 'ui')),
        ("P19-12 시스템", SYSTEM_SFX, os.path.join(ASSETS_BASE, 'sfx', 'system')),
        ("P19-13 환경음", AMBIENT_SFX, os.path.join(ASSETS_BASE, 'sfx', 'ambient')),
        ("P19-14 기억메카닉", MEMORY_SFX, os.path.join(ASSETS_BASE, 'sfx', 'memory')),
    ]

    logger.info("Starting SFX batch generation...")
    start = time.time()
    results = generate_all_sfx(engine, categories)
    elapsed = time.time() - start

    # Save log
    log_path = os.path.join(ASSETS_BASE, 'sfx', 'generation_log.json')
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, 'w') as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "elapsed_sec": round(elapsed, 1),
            "summary": {k: v for k, v in results.items() if k != "details"},
            "details": results["details"]
        }, f, indent=2, ensure_ascii=False)

    logger.info(f"\n{'='*60}")
    logger.info(f"  DONE: {results['success']} ok / {results['fail']} fail / {results['skip']} skip")
    logger.info(f"  Time: {elapsed/60:.1f} minutes")
    logger.info(f"  Log: {log_path}")
    logger.info(f"{'='*60}")

    return results['fail'] == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
