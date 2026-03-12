#!/usr/bin/env python3
"""
P15-08~13 프롬프트 일괄 생성 스크립트
에테르나 크로니클 — 캐릭터 완성 + 몬스터 기반
"""

import json, os, pathlib

BASE = pathlib.Path("/Users/crisious_mini/Library/CloudStorage/SynologyDrive-Obsidian/게임기획/에테르나크로니클")

# ── Style constants ──
STYLE_PREFIX = "2D pixel art, dark fantasy RPG, hand-painted style, consistent art direction, top-left 45-degree lighting, 3-step shading, 2px black outline, no anti-aliasing, clean pixel edges, transparent background (PNG), game asset ready"
NEGATIVE_BASE = "3D render, realistic, photorealistic, blurry, watermark, text overlay, logo, low quality, deformed, extra limbs, Western cartoon, chibi, noisy, grain, JPEG artifacts, soft edges, gradient shading, anti-aliased edges, smooth lines"
NEGATIVE_MONSTER = NEGATIVE_BASE + ", cute, friendly-looking, human anatomy, modern elements"
SD_PARAMS = {"steps": 35, "cfg_scale": 8, "sampler_name": "DPM++ 2M Karras", "clip_skip": 2, "seed": -1}
DALLE_PARAMS = {"model": "dall-e-3", "size": "1024x1024", "quality": "hd", "style": "natural"}
MJ_PARAMS_1x1 = {"version": "6.1", "stylize": 200, "aspect": "1:1"}

# ── Region palettes ──
REGION_PALETTES = {
    "erebos": {"name": "에레보스", "en": "Erebos", "theme": "ruins, fog, spectral", "primary": "#2D2D3F", "secondary": "#5C4A72", "glow": "#89CFF0", "accent": "#A0A0FF"},
    "silvanhime": {"name": "실반헤임", "en": "Silvanhime", "theme": "ancient forest, spores, old growth", "primary": "#1B4332", "secondary": "#6B4423", "glow": "#7DF9FF", "accent": "#ADFF2F"},
    "solaris": {"name": "솔라리스", "en": "Solaris", "theme": "burning desert, glass, flame", "primary": "#C2956B", "secondary": "#8B4513", "glow": "#FFD700", "accent": "#FF6347"},
    "northland": {"name": "북방 영원빙원", "en": "Northern Permafrost", "theme": "ice, aurora, frozen", "primary": "#E8F4FD", "secondary": "#4682B4", "glow": "#00FF7F", "accent": "#00BFFF"},
    "argentium": {"name": "아르겐티움", "en": "Argentium", "theme": "machine city, steam, clockwork", "primary": "#3D3D3D", "secondary": "#B8860B", "glow": "#FFD700", "accent": "#FFA500"},
    "britalia": {"name": "브리탈리아", "en": "Britalia", "theme": "harbor, ocean, pirate", "primary": "#2F4F4F", "secondary": "#8B4513", "glow": "#48D1CC", "accent": "#FFD700"},
    "fog_sea": {"name": "안개해", "en": "Fog Sea", "theme": "fog, ghost ships, deep sea", "primary": "#3C3C5C", "secondary": "#696969", "glow": "#DDA0DD", "accent": "#BA55D3"},
    "abyss": {"name": "기억의 심연", "en": "Memory Abyss", "theme": "memory, ether, distortion", "primary": "#0A0A1E", "secondary": "#1A1A3E", "glow": "#89CFF0", "accent": "#FF00FF"},
    "hidden": {"name": "히든", "en": "Hidden", "theme": "secret, shadow, time", "primary": "#1A1A2E", "secondary": "#2A2A3E", "glow": "#FFD700", "accent": "#9B59B6"},
}

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def mk_sd_prompt(base_text):
    return f"(masterpiece:1.3), (best quality:1.2), {base_text}, <lora:pixel-art-style-v2:0.7>, <lora:custom-aeterna-v1:0.8>, aeterna_style"

def mk_dalle_prompt(base_text):
    return f"Create a {base_text}. Art style: pixel art with clean sharp pixel edges, 2px black outline, no anti-aliasing. Transparent background. Top-left 45-degree lighting with 3-step cel shading. Dark fantasy atmosphere with subtle glowing elements. DO NOT include text, watermarks, or 3D effects."

def mk_mj_prompt(base_text):
    return f"{base_text}::2, dark fantasy Korean MMORPG::1.5, 2px black outline clean pixel edges::2, transparent background, masterpiece quality --v 6.1 --s 200 --no 3d render photo realistic blurry watermark text modern sci-fi"

# ═══════════════════════════════════════════════════════════════
# P15-08: NPC 30명 초상화 프롬프트
# ═══════════════════════════════════════════════════════════════
NPC_DATA = [
    # (id, name_en, name_kr, region, role_en, personality_vibe, appearance, clothing, items, special, palette)
    ("01_cryo", "Cryo", "크리오", "erebos", "mentor mage, memory restoration guide",
     "calm and wise with a hint of playfulness",
     "tall figure, long silver-white hair reaching waist, violet glowing eyes, aged but dignified face",
     "deep navy grand robe with gold trim, large memory crystal brooch on chest, layered mystical robes",
     "3 floating ancient tomes, memory crystal necklace",
     "faint ether glow from eyes, memory sigil glowing dimly beneath feet",
     {"primary": "#16213E", "secondary": "#FFD700", "glow": "#89CFF0", "hair": "#E8E8E8"}),

    ("02_eris", "Eris", "에리스", "erebos", "combat instructor, defense captain",
     "fierce and disciplined with warm undertone",
     "medium height, short red hair, sharp green eyes, vertical scar over right eye",
     "light plate armor with reddish-brown cloak, Erebos crest on shoulder pauldron",
     "one-handed longsword, 2 daggers at waist",
     "ether tattoo on right arm that glows, eyes glow in combat",
     {"primary": "#8B2500", "secondary": "#71797E", "glow": "#89CFF0", "accent": "#B8860B"}),

    ("03_lumina", "Lumina", "루미나", "erebos", "healer and herb shop keeper",
     "warm and gentle, motherly aura",
     "petite build, golden wavy hair to shoulders, warm brown eyes, gentle smile",
     "white and green healer robe, herb pouch at waist, flower hair accessory",
     "healing staff with glowing crystal tip, herb basket",
     "faint green healing particles floating around her",
     {"primary": "#FFFFFF", "secondary": "#2ECC71", "glow": "#2ECC71", "hair": "#F0E68C"}),

    ("04_mateus", "Mateus", "마테우스", "erebos", "blacksmith, equipment forger",
     "boisterous and hearty",
     "large muscular build, bald with braided brown beard, burn scars on arms",
     "leather apron over sleeveless shirt, blacksmith gloves, tool belt at waist",
     "large forging hammer, tool belt",
     "mechanical left arm prosthetic (Argentium-made) with steam vents",
     {"primary": "#8B4513", "secondary": "#71797E", "glow": "#FF4500", "accent": "#B8860B"}),

    ("05_seraphine", "Seraphine", "세라핀", "silvanhime", "forest sage and guide",
     "mystical and contemplative",
     "elf-like pointed ears, long green hair to back, emerald eyes, serene expression",
     "robe woven from leaves and vines, moss decorations, bare feet",
     "living wooden staff with sprouting leaves, bioluminescent spore pouch",
     "tree-pattern tattoos on skin, fireflies hovering around",
     {"primary": "#228B22", "secondary": "#6B4423", "glow": "#7DF9FF", "accent": "#90EE90"}),

    ("06_urgrom", "Urgrom", "우르그롬", "silvanhime", "forest guardian warrior, patrol captain",
     "wild and stoic, fiercely loyal",
     "massive build 1.5x normal NPCs, dark brown skin, short black hair, war paint on jaw",
     "bone and leather armor, animal hide over shoulders, tribal war paint",
     "massive wooden club embedded with memory crystals, throwing axes on back",
     "protruding left tusk, bioluminescent spore markings on arms",
     {"primary": "#4B2413", "secondary": "#F5F5DC", "glow": "#ADFF2F", "accent": "#8B0000"}),

    ("07_naila", "Naila", "나일라", "silvanhime", "spore researcher, potion crafter",
     "curious and talkative scholar",
     "small petite build, brown bob-cut hair, large round spectacles",
     "research coat with forest spore collection bag, test tube belt at waist",
     "multiple glowing spore glass bottles, small notebook",
     "tiny mushrooms growing from hair (symbiotic), green-stained fingertips",
     {"primary": "#8B6943", "secondary": "#ADFF2F", "glow": "#E0FFFF", "accent": "#F0F0F0"}),

    ("08_ifrita", "Ifrita", "이프리타", "solaris", "desert warrior instructor, fire specialist",
     "proud and dignified, strong self-esteem",
     "tall, reddish-brown long hair with flame-like tips, golden eyes, confident expression",
     "desert warrior light armor with gold ornaments, red scarf",
     "dual flame scimitars",
     "hair tips with micro-flames, heat shimmer from hands",
     {"primary": "#FF4500", "secondary": "#FFD700", "glow": "#FFD700", "accent": "#2C2C2C"}),

    ("09_milena", "Milena", "밀레나", "solaris", "trade merchant, rare item shop",
     "shrewd but honest",
     "medium height, brown skin, black curly hair under headscarf, one gold tooth",
     "ornate desert merchant clothing, headscarf, gold coin necklace",
     "large merchandise bundle, golden balance scale",
     "small desert lizard pet on shoulder",
     {"primary": "#6A0572", "secondary": "#FFD700", "glow": "#DEB887", "accent": "#8B1A1A"}),

    ("10_torga", "Torga", "토르가", "northland", "frost chieftain, tribal leader",
     "stoic and authoritative with quiet wisdom",
     "massive build, platinum blonde long hair with braided beard, grey eyes, weathered face",
     "white bear fur cloak over frost-encrusted armor, aurora sigil on shoulder",
     "large frost-encrusted battle axe",
     "aurora glow in left eye, visible breath always",
     {"primary": "#E8F4FD", "secondary": "#4682B4", "glow": "#00FF7F", "accent": "#C0C0C0"}),

    ("11_kobal", "Kobal", "코발", "northland", "frost alchemist, enchantment specialist",
     "obsessive researcher, eccentric",
     "small build, wild white hair, thick goggles with blue lenses, hunched posture",
     "thick insulated research coat with apron, always holding experimental tools",
     "frost crystal alchemy kit, frozen test tubes",
     "icicles always on beard, cold mist from mouth when speaking",
     {"primary": "#F0F0F0", "secondary": "#00BFFF", "glow": "#00BFFF", "accent": "#B8860B"}),

    ("12_memoria", "Memoria", "메모리아", "argentium", "memory archivist, lore keeper",
     "coldly logical, analytical",
     "medium height, silver bob-cut hair, expressionless face, one golden mechanical eye prosthetic",
     "machine city scholar robe with gear ornaments, memory storage device on chest",
     "3 floating memory recording panels, mechanical pen",
     "scan beam from mechanical eye, small gears floating around",
     {"primary": "#C0C0C0", "secondary": "#FFD700", "glow": "#89CFF0", "accent": "#8B7355"}),

    ("13_hashir", "Hashir", "하쉬르", "argentium", "machine technician, equipment repair",
     "creative and experimental, hearty laugh",
     "large build, brown skin, bald with mechanical goggles, wide warm smile",
     "work overalls with leather apron, tool belt overflowing, partial mechanical arm",
     "spanners, wrenches, soldering tools",
     "small steam engine on back for power tools, always covered in grease",
     {"primary": "#5C4033", "secondary": "#B8860B", "glow": "#F5F5F5", "accent": "#696969"}),

    ("14_lunaria", "Lunaria", "루나리아", "britalia", "ocean mage, navigator",
     "mystical yet approachable, moon-obsessed",
     "tall, silver-blue long wavy hair, violet eyes, ethereal beauty",
     "ocean mage robe with wave patterns, pearl necklace, moon brooch",
     "coral staff, floating water droplets",
     "hair moves like waves even without wind, moonlight reflected in eyes",
     {"primary": "#006994", "secondary": "#C0C0C0", "glow": "#FFFACD", "accent": "#FF7F50"}),

    ("15_veltus", "Veltus", "벨투스", "britalia", "retired pirate king, adventure quest giver",
     "boastful but experienced",
     "middle-aged, black curly hair with beard, left eye patch, sturdy build",
     "faded pirate coat with tricorn hat, gold earring, worn boots",
     "old cutlass, decorative flintlock at waist",
     "treasure map tattoo on left arm, mechanical parrot instead of real one",
     {"primary": "#2F4F4F", "secondary": "#8B0000", "glow": "#FFD700", "accent": "#6B4423"}),

    ("16_okia", "Okia", "오키아", "britalia", "seafood chef, food buff provider",
     "jovial and insistently generous",
     "plump build, brown skin, black hair in bun, wide cheerful grin",
     "chef apron with headband, ladle and knife at waist",
     "large pot (always steaming), fish basket",
     "apron always stained, constant steam rising",
     {"primary": "#F5F5F5", "secondary": "#FF8C00", "glow": "#4682B4", "accent": "#D2691E"}),

    ("17_siren", "Siren", "세이렌", "fog_sea", "fog singer, memory fragment collector",
     "enigmatic and melancholic, communicates through song",
     "semi-transparent skin like fog, silver-purple long hair floating in air, purple eyes",
     "fog-woven robe that dissolves into mist at the hem, memory fragment crown",
     "memory lyre instrument, memory fragment glass bottles",
     "lower body dissolves into fog (ghostly), surrounding fog reacts to singing",
     {"primary": "#9370DB", "secondary": "#F8F8FF", "glow": "#89CFF0", "accent": "#4B0082"}),

    ("18_memory_fragment", "Memory Fragment", "기억의 파편", "abyss", "ancient AI guide, final area information",
     "mechanical and detached, emotionless information relay",
     "humanoid hologram, semi-transparent cyan-white, ambiguous gender, geometric pattern body",
     "no clothing — body itself is composed of memory data streams and geometric patterns",
     "5 floating data nodes",
     "visual noise and glitch effects, occasionally transforms into other NPC forms",
     {"primary": "#89CFF0", "secondary": "#FFFFFF", "glow": "#89CFF0", "accent": "#FF0000"}),

    ("19_kalen", "Kalen", "칼렌", "erebos", "innkeeper, rest and save point",
     "warm and friendly",
     "stocky build, ruddy cheeks, brown beard, balding",
     "simple innkeeper vest and rolled sleeves, beer mug motif apron",
     "beer mug, inn keys",
     "always rosy-cheeked, hearty laugh lines",
     {"primary": "#8B4513", "secondary": "#DEB887", "glow": "#FFD700", "accent": "#CD853F"}),

    ("20_mira", "Mira", "미라", "erebos", "general goods merchant",
     "friendly and eager young merchant",
     "young girl, brown braided hair, freckles, bright blue eyes",
     "simple merchant dress with large apron, coin pouch at side",
     "small abacus, wrapped goods",
     "always counting coins, enthusiastic gestures",
     {"primary": "#DEB887", "secondary": "#8B4513", "glow": "#FFD700", "accent": "#87CEEB"}),

    ("21_drakun", "Drakun", "드라쿤", "silvanhime", "hunter guild master",
     "wild and primal",
     "scarred face and arms, green hood, piercing amber eyes, lean muscular build",
     "forest ranger leather armor, green hooded cloak, quiver on back",
     "compound bow, hunting knife at thigh",
     "multiple claw scars across face, wolf fang necklace",
     {"primary": "#2D6A4F", "secondary": "#6B4423", "glow": "#90EE90", "accent": "#8B0000"}),

    ("22_yonika", "Yonika", "요니카", "solaris", "dancer and information broker",
     "seductive and dangerous, hidden depth",
     "lithe build, dark eyes visible above ornate veil, gold jewelry, graceful posture",
     "elaborate dancer outfit with veils and silks, gold bangles and anklets",
     "hidden daggers in sleeves, information scrolls",
     "jingling jewelry, mesmerizing eye contact",
     {"primary": "#6A0572", "secondary": "#FFD700", "glow": "#FF1493", "accent": "#8B1A1A"}),

    ("23_alba", "Alba", "북풍의 알바", "northland", "aurora diviner, fortune teller",
     "ancient and mystical",
     "elderly woman, long silver hair, eyes that shimmer with aurora colors, hunched but dignified",
     "fur-lined mystic shawl, aurora-thread embroidered robe, bone charms",
     "aurora crystal ball, rune bones",
     "eyes constantly shift colors like aurora borealis",
     {"primary": "#E8F4FD", "secondary": "#9370DB", "glow": "#00FF7F", "accent": "#FF69B4"}),

    ("24_gears", "Gears", "기어스", "argentium", "automaton shopkeeper",
     "mechanical but polite, uncanny valley",
     "full mechanical body, humanoid shape, brass and copper, glass eye lenses, articulated joints",
     "no clothing — body is the design, brass plating with visible gears and pistons",
     "built-in measuring tools, inventory display screen on chest",
     "whirring and clicking sounds, steam vents at joints, slightly jerky movements",
     {"primary": "#B8860B", "secondary": "#696969", "glow": "#FFD700", "accent": "#CD853F"}),

    ("25_fiona", "Fiona", "피오나", "britalia", "shipyard master",
     "tough and practical, no-nonsense",
     "muscular woman, tied-back auburn hair, strong jaw, calloused hands",
     "shipwright work clothes, leather tool belt, rolled-up sleeves showing tattoos",
     "large shipwright hammer, blueprint scroll",
     "always has sawdust in hair, oil-stained hands, nautical tattoos",
     {"primary": "#2F4F4F", "secondary": "#8B4513", "glow": "#48D1CC", "accent": "#B8860B"}),

    ("26_fog_elder", "Fog Elder", "안개 노인", "fog_sea", "drifter sage",
     "ominous and wise, speaks in riddles",
     "elderly figure, no visible eyes (empty sockets or fog-filled), long fog-like beard, gaunt",
     "tattered drifter robes soaked with sea mist, barnacle-encrusted staff",
     "fog-filled lantern, ancient sea charts",
     "eyeless face with fog constantly seeping from sockets, beard moves like living fog",
     {"primary": "#696969", "secondary": "#4B0082", "glow": "#DDA0DD", "accent": "#E6E6FA"}),

    ("27_echo", "Echo", "에코", "abyss", "memory warden, multi-personality guide",
     "shifting and unstable, multiple personalities",
     "appearance constantly shifts — sometimes young, sometimes old, sometimes male/female",
     "flowing robe that changes pattern and color with personality shifts, memory crystals orbiting",
     "floating memory shards that rearrange",
     "face flickers between different people, voice changes mid-sentence",
     {"primary": "#1A1A3E", "secondary": "#89CFF0", "glow": "#FFD700", "accent": "#FF00FF"}),

    ("28_rozen", "Rozen", "로젠", "hidden", "traveling rare merchant",
     "eccentric and mysterious collector",
     "medium build, wears multiple hats stacked, patchwork clothing, bright eager eyes",
     "oversized backpack overflowing with trinkets, patchwork coat with many pockets",
     "magical measuring tape, collection of odd curios",
     "backpack occasionally rattles or glows, always produces items from impossible pockets",
     {"primary": "#8B4513", "secondary": "#FFD700", "glow": "#9B59B6", "accent": "#2ECC71"}),

    ("29_darkness", "Darkness", "다크니스", "hidden", "black market dealer",
     "menacing and secretive",
     "full-body hooded cloak, only glowing eyes visible, indeterminate build",
     "layered dark cloaks and hoods, shadow seems to cling to fabric",
     "hidden goods in cloak folds, shadow coin purse",
     "eyes glow faintly in the dark, shadow around body deeper than natural",
     {"primary": "#0D0D1A", "secondary": "#1A1A2E", "glow": "#FF4444", "accent": "#9B59B6"}),

    ("30_time_echo", "Time Echo", "시간의 메아리", "hidden", "time guardian mentor, secret NPC",
     "mechanical-mystical, transcendent of time",
     "humanoid figure made of clock gears and mechanisms, clock face chest, hourglass head",
     "body is the design — interlocking gears, pendulums, clock hands as limbs",
     "time manipulation orbs, broken clock fragments orbiting",
     "gears rotate at different speeds, sometimes freezes mid-motion, temporal afterimages",
     {"primary": "#B8860B", "secondary": "#696969", "glow": "#FFD700", "accent": "#89CFF0"}),
]

def generate_p15_08():
    """P15-08: NPC 30명 초상화 프롬프트"""
    out_dir = BASE / "assets/prompts/characters/npc"
    count = 0
    for npc in NPC_DATA:
        npc_id, name_en, name_kr, region_key, role, vibe, appearance, clothing, items, special, palette = npc
        region = REGION_PALETTES[region_key]
        
        base_desc = (
            f"2D pixel art RPG NPC portrait, bust shot, front-facing, "
            f"{name_en} ({name_kr}), {role}, "
            f"{appearance}, "
            f"{clothing}, "
            f"{vibe} expression, "
            f"{special}, "
            f"{region['en']} region, {region['theme']} color scheme, "
            f"dark fantasy medieval setting, memory and ether theme, "
            f"top-left 45-degree lighting, 3-step shading, "
            f"2px black outline, no anti-aliasing, clean pixel edges, "
            f"256x256 resolution, dark gradient background, game dialogue portrait style"
        )
        
        data = {
            "asset_id": f"npc_portrait_{npc_id}",
            "npc_name": name_kr,
            "npc_name_en": name_en,
            "region": region["name"],
            "role": role,
            "category": "npc_portrait",
            "resolution": "256x256",
            "color_palette": palette,
            "design": {
                "appearance": appearance,
                "clothing": clothing,
                "items": items,
                "special_features": special,
                "personality_vibe": vibe
            },
            "prompts": {
                "sd": {
                    "portrait": {
                        "prompt": mk_sd_prompt(base_desc),
                        "negative": NEGATIVE_BASE + ", wrong eye color, inconsistent clothing, modern clothing, sci-fi elements",
                        "params": {**SD_PARAMS, "width": 512, "height": 512}
                    }
                },
                "dalle": {
                    "portrait": {
                        "prompt": mk_dalle_prompt(f"2D pixel art RPG NPC portrait, bust shot of {name_en} — {role}. {appearance}. Wearing {clothing}. Holding/carrying {items}. Special details: {special}. Expression: {vibe}. Set in {region['en']} region with {region['theme']} atmosphere. 256x256 pixel art style, dark gradient background, game dialogue portrait"),
                        "params": DALLE_PARAMS
                    }
                },
                "mj": {
                    "portrait": {
                        "prompt": mk_mj_prompt(f"2D pixel art RPG NPC portrait bust shot::2, {name_en} {role}::1.5, {appearance}, {clothing}, {vibe} expression, {region['en']} {region['theme']}::1, 256x256 pixel art, dark gradient background, game dialogue portrait") + f" --ar 1:1",
                        "params": MJ_PARAMS_1x1
                    }
                }
            }
        }
        write_json(out_dir / f"{npc_id}.json", data)
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════
# P15-09: 캐릭터 스프라이트 시트 프롬프트 (24체)
# ═══════════════════════════════════════════════════════════════
CLASSES = [
    ("ether_knight", "에테르기사", "Ether Knight", "heavy plate armor warrior, steel blue and silver", "#4682B4", "#C0C0C0", "#89CFF0"),
    ("memory_breaker", "기억파괴자", "Memory Breaker", "dual-wielding berserker, dark red and black", "#8B0000", "#2C2C2C", "#FF4444"),
    ("shadow_weaver", "그림자직조사", "Shadow Weaver", "shadow mage with flowing dark robes, purple and black", "#4B0082", "#2E2E2E", "#9B59B6"),
    ("mnemonist", "기억술사", "Mnemonist", "memory mage with floating tomes, blue and white", "#3498DB", "#E8E8E8", "#89CFF0"),
    ("time_guardian", "시간수호자", "Time Guardian", "clock-themed paladin, gold and bronze", "#B8860B", "#CD853F", "#FFD700"),
    ("void_wanderer", "공허방랑자", "Void Wanderer", "hooded ranger with ethereal weapons, dark teal and grey", "#2F4F4F", "#708090", "#00CED1"),
]

ADVANCEMENTS = [
    ("base", "기본직"),
    ("2nd", "2차 전직"),
    ("3rd", "3차 전직"),
    ("4th", "4차 전직 (최종)")
]

ADV_MODIFIERS = {
    "base": "basic equipment, simple design",
    "2nd": "enhanced equipment, additional ornaments, faint aura glow",
    "3rd": "elaborate equipment, strong aura, magical accessories, glowing accents",
    "4th": "ultimate equipment, legendary aura with particles, complex ornamental design, wings or floating elements"
}

MOTIONS = ["idle", "walk", "attack_melee", "attack_ranged", "cast", "hit", "death"]
DIRECTIONS = ["D", "DL", "L", "UL", "U"]

def generate_p15_09():
    """P15-09: 캐릭터 스프라이트 시트 프롬프트 (24체)"""
    out_dir = BASE / "assets/prompts/characters/sprites"
    count = 0
    for cls_id, cls_kr, cls_en, cls_desc, c1, c2, c_glow in CLASSES:
        for adv_id, adv_kr in ADVANCEMENTS:
            adv_mod = ADV_MODIFIERS[adv_id]
            sprite_id = f"{cls_id}_{adv_id}"
            
            base_desc = (
                f"2D pixel art RPG character sprite sheet, {cls_en} ({cls_kr}) {adv_kr}, "
                f"{cls_desc}, {adv_mod}, "
                f"64x64 pixel frame size, 5 directional views (front/front-left/left/back-left/back), "
                f"7 motion animations (idle 4f/walk 6f/melee attack 6f/ranged attack 6f/cast 5f/hit 3f/death 5f), "
                f"sprite sheet layout, dark fantasy Korean MMORPG aesthetic, "
                f"2.5 head-to-body chibi proportions"
            )
            
            data = {
                "asset_id": f"char_sprite_{sprite_id}",
                "class": cls_kr,
                "class_en": cls_en,
                "advancement": adv_id,
                "advancement_kr": adv_kr,
                "category": "character_sprite_sheet",
                "frame_size": "64x64",
                "directions": DIRECTIONS,
                "motions": MOTIONS,
                "total_frames_per_direction": 35,
                "total_production_frames": 175,
                "sheet_size": "1408x640",
                "color_palette": {"primary": c1, "secondary": c2, "glow": c_glow},
                "controlnet_pose_ref": f"assets/controlnet-poses/character/",
                "prompts": {
                    "sd": {
                        "sprite_sheet": {
                            "prompt": mk_sd_prompt(f"{base_desc}, {STYLE_PREFIX}"),
                            "negative": NEGATIVE_BASE + ", inconsistent frame sizes, overlapping frames, missing directions",
                            "params": {**SD_PARAMS, "width": 1408, "height": 640}
                        },
                        "per_frame_template": {
                            "prompt_template": mk_sd_prompt(
                                f"2D pixel art RPG character sprite, single frame, {cls_en} {adv_kr}, "
                                f"{cls_desc}, {adv_mod}, "
                                f"{{direction}} facing, {{motion}} pose frame {{frame_num}}, "
                                f"64x64 pixel art, {STYLE_PREFIX}"
                            ),
                            "negative": NEGATIVE_BASE,
                            "params": {**SD_PARAMS, "width": 512, "height": 512},
                            "variables": {"direction": DIRECTIONS, "motion": MOTIONS}
                        }
                    },
                    "dalle": {
                        "sprite_sheet": {
                            "prompt": mk_dalle_prompt(
                                f"pixel art RPG character sprite sheet for {cls_en} ({adv_kr}). "
                                f"{cls_desc}, {adv_mod}. "
                                f"Sheet layout: 5 rows (one per direction: front, front-left, left, back-left, back), "
                                f"each row contains 35 frames of animation (idle 4, walk 6, attacks 12, cast 5, hit 3, death 5). "
                                f"64x64 pixels per frame. Dark fantasy Korean MMORPG style, 2.5 head chibi proportions"
                            ),
                            "params": DALLE_PARAMS
                        }
                    },
                    "mj": {
                        "sprite_sheet": {
                            "prompt": mk_mj_prompt(
                                f"2D pixel art RPG character sprite sheet::2, {cls_en} {adv_kr}::1.5, "
                                f"{cls_desc}, {adv_mod}, "
                                f"5 directional rows, 7 animation sequences per row, 64x64 frames, "
                                f"dark fantasy MMORPG"
                            ) + " --ar 11:5",
                            "params": {**MJ_PARAMS_1x1, "aspect": "11:5"}
                        }
                    }
                },
                "pose_mapping": {
                    motion: f"assets/controlnet-poses/character/{motion}_{{dir}}.json"
                    for motion in MOTIONS
                }
            }
            write_json(out_dir / f"{sprite_id}.json", data)
            count += 1
    return count


# ═══════════════════════════════════════════════════════════════
# P15-10: NPC 스프라이트 프롬프트 (30명)
# ═══════════════════════════════════════════════════════════════
NPC_SPRITE_DIRECTIONS = ["D", "DL", "L", "U"]  # 4방향
NPC_SPRITE_MOTIONS = ["idle", "walk", "talk"]   # 3모션

def generate_p15_10():
    """P15-10: NPC 30명 스프라이트 프롬프트"""
    out_dir = BASE / "assets/prompts/characters/npc_sprites"
    count = 0
    for npc in NPC_DATA:
        npc_id, name_en, name_kr, region_key, role, vibe, appearance, clothing, items, special, palette = npc
        region = REGION_PALETTES[region_key]
        
        # Simplified clothing for sprite
        clothing_simple = clothing.split(",")[0] if "," in clothing else clothing
        
        base_desc = (
            f"2D pixel art RPG NPC field sprite, full body, {name_en} ({name_kr}), "
            f"{role}, simplified pixel version, "
            f"{clothing_simple}, "
            f"64x64 pixel frame, 4 directions (front/front-left/left/back), "
            f"3 motions (idle 4f/walk 6f/talk 4f), "
            f"{region['en']} region style"
        )
        
        data = {
            "asset_id": f"npc_sprite_{npc_id}",
            "npc_name": name_kr,
            "npc_name_en": name_en,
            "region": region["name"],
            "category": "npc_sprite",
            "frame_size": "64x64",
            "directions": NPC_SPRITE_DIRECTIONS,
            "motions": NPC_SPRITE_MOTIONS,
            "frames_per_motion": {"idle": 4, "walk": 6, "talk": 4},
            "total_frames": 56,  # (4+6+4) × 4dir
            "portrait_ref": f"assets/prompts/characters/npc/{npc_id}.json",
            "color_palette": palette,
            "prompts": {
                "sd": {
                    "sprite_sheet": {
                        "prompt": mk_sd_prompt(f"{base_desc}, {STYLE_PREFIX}"),
                        "negative": NEGATIVE_BASE + ", too detailed for sprite size, portrait style",
                        "params": {**SD_PARAMS, "width": 896, "height": 256}
                    }
                },
                "dalle": {
                    "sprite_sheet": {
                        "prompt": mk_dalle_prompt(
                            f"pixel art RPG NPC field sprite sheet for {name_en}. "
                            f"Simplified pixel version of portrait: {clothing_simple}. "
                            f"4 rows (front/front-left/left/back), each with idle(4f)+walk(6f)+talk(4f) = 14 frames. "
                            f"64x64 pixels per frame, {region['en']} style"
                        ),
                        "params": DALLE_PARAMS
                    }
                },
                "mj": {
                    "sprite_sheet": {
                        "prompt": mk_mj_prompt(
                            f"2D pixel art RPG NPC sprite sheet::2, {name_en}::1.5, "
                            f"{clothing_simple}, 4 directional rows, idle+walk+talk animations, "
                            f"64x64 frames, {region['en']} style"
                        ) + " --ar 7:2",
                        "params": {**MJ_PARAMS_1x1, "aspect": "7:2"}
                    }
                }
            }
        }
        write_json(out_dir / f"{npc_id}_sprite.json", data)
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════
# P15-11: 일반 몬스터 프롬프트 (~120종)
# ═══════════════════════════════════════════════════════════════

# Extended monster lists per region (targeting ~15 normal per region × 8 = 120)
NORMAL_MONSTERS = {
    "erebos": [
        ("memory_dust", "기억 먼지", "S", "amorphous", "floating semi-transparent dust cluster with faint memory glow, ethereal particles"),
        ("fog_rat", "안개 쥐", "S", "quadruped", "semi-transparent rat with fog-emitting tail, ghostly blue eyes"),
        ("ruin_skeleton", "잔해 해골", "M", "humanoid", "broken-armored skeleton warrior missing one arm, cracked bones with ether light seeping"),
        ("memory_ghost", "기억 유령", "M", "spectral", "humanoid upper body dissolving into fog below, glowing white eyes, translucent"),
        ("broken_golem", "부서진 골렘", "M", "humanoid", "cracked stone golem with ether light leaking from fractures, moss-covered"),
        ("ruin_spider", "폐허 거미", "M", "insectoid", "large spider with stone debris fused to back, web glows faintly blue"),
        ("fog_wolf", "안개 늑대", "M", "quadruped", "semi-transparent wolf with fog trail tail, ghostly howling pose"),
        ("memory_absorber", "기억 흡수자", "M", "amorphous", "jelly-like creature with floating memory fragments visible inside translucent body"),
        ("floating_lantern", "부유 등불", "S", "amorphous", "glowing orb entity, lure-type, warm deceptive light with dark wisps"),
        ("afterimage_soldier", "잔상 병사", "M", "humanoid", "semi-transparent past soldier afterimage, faded armor, ghostly weapon"),
        ("petrified_wing", "석화 날개", "M", "flying", "petrified bat with cracked stone wings, one eye glowing through stone"),
        ("ruin_vine", "폐허 덩굴", "M", "plant", "memory-eating vine erupting from stone cracks, thorns with ether glow"),
        ("echo_wisp", "메아리 도깨비불", "S", "amorphous", "small flickering flame-like wisp that mimics sounds, blue-purple glow"),
        ("crumbling_shade", "무너지는 그림자", "M", "spectral", "shadow creature that crumbles and reforms, dark with red eye slits"),
        ("memory_beetle", "기억 딱정벌레", "S", "insectoid", "small beetle with glowing memory crystal shell, scurries in groups"),
    ],
    "silvanhime": [
        ("spore_bat", "포자 박쥐", "S", "flying", "small bat with spore-covered wings, releases green clouds when disturbed"),
        ("moss_rat", "이끼 쥐", "S", "quadruped", "oversized rat covered in thick moss and lichen, glowing fungal eyes"),
        ("forest_skeleton", "숲 해골", "M", "humanoid", "vine-wrapped skeleton with mushrooms growing from skull, ancient forest armor"),
        ("spore_sphere", "포자 구체", "S", "amorphous", "floating spore cluster, pulses and releases poison clouds"),
        ("treant_sprout", "고목 정령", "M", "plant", "small tree humanoid with branch arms, leaf hair, bark skin"),
        ("vine_hunter", "덩굴 사냥꾼", "M", "plant", "vine humanoid with whip-like arms, camouflaged among foliage"),
        ("forest_wolf", "숲 늑대", "M", "quadruped", "wolf with moss and bark armor naturally grown, green glowing eyes"),
        ("fungus_golem", "곰팡이 골렘", "M", "humanoid", "golem made of compacted mushrooms and soil, spore cloud aura"),
        ("light_spider", "빛거미", "M", "insectoid", "spider that spins bioluminescent web, cyan glowing abdomen"),
        ("flower_trap", "꽃 파리지옥", "M", "plant", "giant carnivorous plant with tooth-like leaves, sweet-smelling lure"),
        ("root_spine", "나무 등뼈", "M", "amorphous", "underground root creature that surfaces, spine-like protrusions"),
        ("moss_warrior", "이끼 전사", "M", "humanoid", "ancient warrior remains covered in moss armor, forest sword"),
        ("spore_bear", "포자 먹는 곰", "M", "quadruped", "bear with mushroom garden growing on back, gentle but territorial"),
        ("luminous_moth", "발광 나방", "S", "flying", "large moth with bioluminescent wing patterns, mesmerizing glow"),
        ("thorn_crawler", "가시 크롤러", "M", "insectoid", "thorny centipede-like creature, bark-armored segments"),
    ],
    "solaris": [
        ("sand_scarab", "모래 풍뎅이", "S", "insectoid", "golden scarab beetle with heat-radiating shell, desert camouflage"),
        ("glass_snake", "유리 뱀", "M", "quadruped", "serpent with translucent glass-like scales, internal fire visible"),
        ("desert_skeleton", "사막 해골", "M", "humanoid", "sun-bleached skeleton warrior with tattered desert wrappings, scimitar"),
        ("sand_elemental", "모래 정령", "M", "amorphous", "humanoid sand tornado, constantly shifting form, golden particles"),
        ("heat_mirage", "열기 신기루", "M", "spectral", "shimmering heat distortion entity, appears as false oasis then attacks"),
        ("glass_scorpion", "유리 전갈", "M", "insectoid", "scorpion with crystallized glass armor, molten stinger tip"),
        ("fire_lizard", "화염 도마뱀", "M", "quadruped", "large lizard with flame patterns, breathing small fire jets"),
        ("sandstorm_hawk", "모래폭풍 매", "M", "flying", "hawk wrapped in perpetual sand vortex, sharp sand-blade wings"),
        ("cactus_golem", "선인장 골렘", "M", "plant", "walking cactus with stone limbs, needle projectile attack"),
        ("sun_wisp", "태양 도깨비불", "S", "amorphous", "intensely bright fire orb, solar flare attacks"),
        ("dune_worm_small", "작은 사구 벌레", "M", "amorphous", "segmented desert worm erupting from sand, mandible jaws"),
        ("oasis_slime", "오아시스 슬라임", "M", "amorphous", "water-like slime that mimics oasis pools, engulfing attack"),
        ("desert_vulture", "사막 독수리", "M", "flying", "large vulture with sun-scorched feathers, fire-tipped talons"),
        ("molten_crab", "용암 게", "M", "insectoid", "crab with molten rock shell, steam vents, magma claws"),
        ("sand_phantom", "모래 유령", "M", "spectral", "ghostly figure of lost desert traveler, sand-form body"),
    ],
    "northland": [
        ("frost_bat", "빙결 박쥐", "S", "flying", "ice-crusted bat with crystalline wings, breath creates tiny snowflakes"),
        ("snow_hare", "눈 토끼", "S", "quadruped", "aggressive arctic hare with ice spike fur, red eyes"),
        ("frozen_skeleton", "동결 해골", "M", "humanoid", "ice-encased skeleton warrior, frozen mid-motion, cracks reveal ancient armor"),
        ("ice_elemental", "얼음 정령", "M", "amorphous", "humanoid ice crystal formation, refracts light into rainbows"),
        ("frost_wolf", "서리 늑대", "M", "quadruped", "white wolf with frost armor, breath creates ice trails, aurora-tinted mane"),
        ("avalanche_golem", "눈사태 골렘", "M", "humanoid", "packed snow and ice golem, boulder-like fists, icicle teeth"),
        ("aurora_wisp", "오로라 도깨비불", "S", "amorphous", "shifting aurora-colored light entity, mesmerizing but damaging"),
        ("icicle_spider", "고드름 거미", "M", "insectoid", "spider with icicle legs, webs freeze on contact"),
        ("polar_bear_spirit", "북극곰 영혼", "M", "quadruped", "spectral polar bear, semi-transparent with aurora glow"),
        ("blizzard_raven", "눈보라 까마귀", "S", "flying", "raven surrounded by personal blizzard, ice crystal feathers"),
        ("frost_lichen", "서리 이끼체", "M", "plant", "mobile lichen colony, ice-crystal growth, slow but resilient"),
        ("frozen_warrior", "동결 전사", "M", "humanoid", "ancient warrior flash-frozen, fighting despite ice imprisonment"),
        ("crystal_beetle", "결정 딱정벌레", "S", "insectoid", "beetle with pure ice crystal shell, refracts light"),
        ("snow_serpent", "눈 뱀", "M", "quadruped", "white serpent that burrows through snow, ice fang venom"),
        ("permafrost_shade", "영구동토 그림자", "M", "spectral", "shadow trapped in ice, partially free, reaching claws"),
    ],
    "argentium": [
        ("gear_rat", "기어 쥐", "S", "quadruped", "mechanical rat with gear body, copper wire tail, clicking movement"),
        ("steam_sprite", "증기 정령", "S", "amorphous", "small steam cloud entity with glowing core, hisses and scalds"),
        ("automaton_soldier", "자동인형 병사", "M", "humanoid", "basic humanoid automaton with brass plating, simple weapon arm"),
        ("gear_spider", "기어 거미", "M", "insectoid", "mechanical spider with gear-leg joints, welding torch mandibles"),
        ("clockwork_bird", "태엽 새", "S", "flying", "mechanical bird with clockwork wings, trailing sparks"),
        ("pipe_worm", "배관 벌레", "M", "amorphous", "segmented mechanical worm living in pipes, steam breath"),
        ("scrap_golem", "고철 골렘", "M", "humanoid", "golem assembled from scrap metal, mismatched parts, sparking joints"),
        ("furnace_imp", "용광로 임프", "S", "humanoid", "small fire creature living in furnaces, molten metal body"),
        ("tesla_orb", "테슬라 구체", "S", "amorphous", "floating electrical orb, arc lightning attacks, buzzing"),
        ("rust_beetle", "녹 딱정벌레", "S", "insectoid", "beetle that corrodes metal, rusty shell, acid spit"),
        ("piston_hound", "피스톤 하운드", "M", "quadruped", "mechanical dog with piston-powered legs, steam exhaust"),
        ("cogwork_sentinel", "톱니 감시병", "M", "humanoid", "tall thin automaton with rotating gear head, spotlight eye"),
        ("brass_wasp", "황동 말벌", "S", "flying", "mechanical wasp with brass body, needle stinger, swarm behavior"),
        ("overheated_core", "과열 코어", "M", "amorphous", "unstable energy core, glowing red-hot, explosive"),
        ("tin_soldier", "양철 병사", "M", "humanoid", "toy-like tin soldier gone haywire, jerky marching, bayonet"),
    ],
    "britalia": [
        ("barnacle_crab", "따개비 게", "S", "insectoid", "small crab covered in barnacles, snapping claws"),
        ("sea_rat", "바다 쥐", "S", "quadruped", "waterlogged rat with seaweed fur, bioluminescent eyes"),
        ("drowned_sailor", "익사 선원", "M", "humanoid", "waterlogged zombie sailor, tattered uniform, seaweed hair"),
        ("jellyfish_drifter", "해파리 부유체", "M", "amorphous", "large jellyfish floating above ground, electric tentacles"),
        ("tide_elemental", "조류 정령", "M", "amorphous", "water humanoid with tidal current body, sea foam crown"),
        ("reef_golem", "산호 골렘", "M", "humanoid", "golem made of living coral and shells, barnacle armor"),
        ("pirate_ghost", "해적 유령", "M", "spectral", "translucent pirate spirit, tattered ghost clothes, phantom cutlass"),
        ("sea_serpent_young", "어린 바다뱀", "M", "quadruped", "young sea serpent, iridescent scales, small but aggressive"),
        ("harbor_gull", "항구 갈매기", "S", "flying", "aggressive oversized gull with razor beak, salt-crusted feathers"),
        ("seaweed_strangler", "해초 교살자", "M", "plant", "animated seaweed mass, grabbing tentacle-like fronds"),
        ("anchor_mimic", "닻 미믹", "M", "amorphous", "creature disguised as anchor, reveals teeth and eyes when approached"),
        ("saltwater_slime", "해수 슬라임", "M", "amorphous", "corrosive saltwater blob with shells and debris inside"),
        ("pufferfish_mine", "복어 기뢰", "S", "amorphous", "inflated pufferfish that explodes, spiny and glowing"),
        ("siren_hatchling", "세이렌 유충", "S", "flying", "small siren-like creature, mesmerizing song, fish-bird hybrid"),
        ("shipwreck_crab", "난파선 게", "M", "insectoid", "huge hermit crab using ship debris as shell"),
    ],
    "fog_sea": [
        ("fog_wisp", "안개 도깨비불", "S", "amorphous", "dense fog ball with faint purple inner glow, luring presence"),
        ("phantom_fish", "유령 물고기", "S", "amorphous", "spectral fish swimming through fog instead of water, bioluminescent"),
        ("ghost_sailor", "유령 선원", "M", "spectral", "transparent sailor ghost, chains and anchor weight, mournful expression"),
        ("fog_jellyfish", "안개 해파리", "M", "amorphous", "jellyfish made of condensed fog, memory-draining tentacles"),
        ("wraith_gull", "망령 갈매기", "S", "flying", "ghostly seabird, passes through solid objects, eerie cry"),
        ("barnacle_horror", "따개비 공포", "M", "amorphous", "colony of living barnacles in humanoid shape, clicking mass"),
        ("fog_serpent", "안개 뱀", "M", "quadruped", "serpent made of dense fog, materializes to strike then fades"),
        ("memory_sponge", "기억 해면", "M", "plant", "large sponge creature that absorbs memories, pulsing purple"),
        ("drowned_knight", "수몰 기사", "M", "humanoid", "waterlogged undead knight, rusty barnacle-covered armor"),
        ("deep_angler", "심해 아귀", "M", "amorphous", "deep sea anglerfish adapted to fog, bioluminescent lure"),
        ("ghost_crab", "유령 게", "S", "insectoid", "translucent crab, scuttles through fog, appears and vanishes"),
        ("fog_mimic", "안개 미믹", "M", "amorphous", "fog creature that mimics familiar shapes to lure victims"),
        ("spectral_eel", "유령 장어", "M", "quadruped", "ghostly electric eel, arcs of purple lightning in fog"),
        ("lost_soul_cluster", "방황 영혼 군집", "M", "spectral", "cluster of small lost souls orbiting each other, wailing"),
        ("abyssal_polyp", "심연 폴립", "M", "plant", "deep-sea polyp creature, tentacle crown, memory-draining touch"),
    ],
    "abyss": [
        ("memory_fragment_mob", "기억 파편체", "S", "amorphous", "small crystallized memory shard with legs, skitters and explodes"),
        ("ether_wisp", "에테르 도깨비불", "S", "amorphous", "pure ether energy ball, pulsing cyan-white, erratic movement"),
        ("distortion_shade", "왜곡 그림자", "M", "spectral", "shadow creature with reality-bending visual distortion around it"),
        ("memory_golem", "기억 골렘", "M", "humanoid", "golem made of crystallized memories, shifting images visible inside"),
        ("void_beetle", "공허 딱정벌레", "S", "insectoid", "beetle that consumes reality around it, small void patches"),
        ("forgotten_warrior", "망각의 전사", "M", "humanoid", "fading warrior whose features are being erased, glitching"),
        ("ether_serpent", "에테르 뱀", "M", "quadruped", "serpent of pure ether energy, translucent with memory streams"),
        ("glitch_spider", "글리치 거미", "M", "insectoid", "spider with visual glitch effects, web causes reality tears"),
        ("memory_bloom", "기억 꽃", "M", "plant", "crystalline flower that blooms with stolen memories, hypnotic"),
        ("null_slime", "허무 슬라임", "M", "amorphous", "void-colored slime that erases what it touches, anti-glow"),
        ("paradox_bat", "역설 박쥐", "S", "flying", "bat that exists in multiple timeframes simultaneously, afterimages"),
        ("echo_phantom", "메아리 환영", "M", "spectral", "phantom that replays past events, stuck in memory loops"),
        ("data_worm", "데이터 벌레", "M", "amorphous", "digital-looking worm, binary pattern body, corrupts surroundings"),
        ("void_moth", "공허 나방", "S", "flying", "moth drawn to memory light, wings show glimpses of forgotten worlds"),
        ("fracture_elemental", "균열 정령", "M", "amorphous", "entity made of reality fractures, jagged crystalline form"),
    ],
}

MONSTER_MOTIONS_NORMAL = ["idle", "attack", "hit", "death"]

def generate_p15_11():
    """P15-11: 일반 몬스터 프롬프트 (~120종)"""
    out_dir = BASE / "assets/prompts/monsters/normal"
    count = 0
    for region_key, monsters in NORMAL_MONSTERS.items():
        region = REGION_PALETTES[region_key]
        region_dir = out_dir / region_key
        for mon_id, mon_kr, size, category, appearance in monsters:
            px = "32x32" if size == "S" else "64x64"
            size_word = "small" if size == "S" else "medium"
            
            base_desc = (
                f"2D pixel art RPG monster sprite, {mon_kr} ({mon_id.replace('_', ' ')}), "
                f"{category} creature type, {appearance}, "
                f"{region['en']} region, {region['theme']} color scheme, "
                f"palette: {region['primary']}/{region['secondary']}/{region['glow']}, "
                f"{size_word} size ({px}), idle pose front-facing, "
                f"dark fantasy style, menacing but not gory"
            )
            
            data = {
                "asset_id": f"mon_{region_key}_{mon_id}_normal",
                "monster_name": mon_kr,
                "monster_name_en": mon_id.replace("_", " ").title(),
                "region": region["name"],
                "grade": "normal",
                "size": size,
                "pixel_size": px,
                "category": category,
                "motions": MONSTER_MOTIONS_NORMAL,
                "frames": {"idle": 4, "attack": 4, "hit": 2, "death": 4},
                "directions": 2,
                "color_palette": {"primary": region["primary"], "secondary": region["secondary"], "glow": region["glow"]},
                "prompts": {
                    "sd": {
                        "sprite": {
                            "prompt": mk_sd_prompt(f"{base_desc}, {STYLE_PREFIX}"),
                            "negative": NEGATIVE_MONSTER,
                            "params": {**SD_PARAMS, "width": 512, "height": 512}
                        }
                    },
                    "dalle": {
                        "sprite": {
                            "prompt": mk_dalle_prompt(
                                f"pixel art RPG monster sprite: {mon_id.replace('_', ' ').title()} — "
                                f"{appearance}. {region['en']} region with {region['theme']} atmosphere. "
                                f"{size_word} size, {px} pixel art"
                            ),
                            "params": DALLE_PARAMS
                        }
                    },
                    "mj": {
                        "sprite": {
                            "prompt": mk_mj_prompt(
                                f"2D pixel art RPG monster sprite::2, {mon_id.replace('_', ' ')}::1.5, "
                                f"{appearance}, {region['en']} {region['theme']}::1, "
                                f"{px} pixel art"
                            ) + " --ar 1:1",
                            "params": MJ_PARAMS_1x1
                        }
                    }
                }
            }
            write_json(region_dir / f"{mon_id}.json", data)
            count += 1
    return count


# ═══════════════════════════════════════════════════════════════
# P15-12: 엘리트 + 보스 몬스터 프롬프트
# ═══════════════════════════════════════════════════════════════

ELITE_MONSTERS = {
    "erebos": [
        ("fog_guardian", "안개 수호자", "L", "humanoid", "massive armored ghost with giant shield, strong spectral aura, towering presence", "ruin_skeleton"),
        ("memory_devourer", "기억 포식자", "L", "amorphous", "large amoeba containing multiple memory fragments, pulsing absorption", "memory_absorber"),
        ("oblivion_knight", "망각의 기사", "L", "humanoid", "full plate ghost with massive greatsword, red malevolent aura", "afterimage_soldier"),
        ("fog_queen_spider", "안개 여왕 거미", "L", "insectoid", "giant spider with human-like upper torso merged, web queen", "ruin_spider"),
        ("memory_colossus", "기억 거상", "L", "humanoid", "towering memory-construct warrior, shifting armor of crystallized memories", "broken_golem"),
    ],
    "silvanhime": [
        ("ancient_treant", "고목 수호자", "L", "plant", "massive ancient tree spirit with branch weapons, living bark armor", "treant_sprout"),
        ("spore_queen", "포자 여왕", "L", "amorphous", "large spore core entity with toxic cloud aura, queen pheromones", "spore_sphere"),
        ("root_horror", "뿌리 괴수", "L", "plant", "underground root network monster surfacing, multiple root tendrils", "root_spine"),
        ("forest_druid", "숲 드루이드", "L", "humanoid", "tree-mutated human, casting nature magic, bark and leaf hybrid", "moss_warrior"),
        ("blight_hydra", "역병 히드라", "L", "plant", "multi-headed fungal hydra, each head different mushroom type", "fungus_golem"),
    ],
    "solaris": [
        ("glass_emperor", "유리 황제 근위병", "L", "humanoid", "elite glass-armored guard with reflective surface, prismatic attacks", "desert_skeleton"),
        ("sandstorm_djinn", "모래폭풍 진", "L", "amorphous", "sentient sandstorm in humanoid form, devastating wind attacks", "sand_elemental"),
        ("molten_basilisk", "용암 바실리스크", "L", "quadruped", "large lizard with molten rock scales, petrifying gaze with heat", "fire_lizard"),
        ("sun_priest", "태양 사제", "L", "humanoid", "undead sun-worshipping priest, solar flame magic, golden mask", "heat_mirage"),
        ("crystal_scorpion_king", "수정 전갈왕", "L", "insectoid", "massive crystallized scorpion, prismatic stinger, gem-encrusted", "glass_scorpion"),
    ],
    "northland": [
        ("frost_wyrm", "서리 비룡", "L", "quadruped", "young frost dragon, ice breath, crystalline wings, aurora reflections", "frost_wolf"),
        ("aurora_valkyrie_lesser", "하급 오로라 발키리", "L", "humanoid", "lesser valkyrie warrior, aurora-infused spear, ice wings", "frozen_warrior"),
        ("blizzard_mammoth", "눈보라 매머드", "L", "quadruped", "armored ice mammoth, tusk ice spears, personal blizzard", "polar_bear_spirit"),
        ("ice_witch", "빙결 마녀", "L", "humanoid", "frost witch with ice crown, freezing magic circles, crystal staff", "permafrost_shade"),
        ("crystal_titan", "결정 타이탄", "L", "humanoid", "large ice crystal humanoid, refracts aurora light, devastating punches", "avalanche_golem"),
    ],
    "argentium": [
        ("siege_automaton", "공성 자동인형", "L", "humanoid", "heavy combat automaton with cannon arm, armored plating, smoke stacks", "automaton_soldier"),
        ("master_gear_spider", "마스터 기어 거미", "L", "insectoid", "giant mechanical spider, multiple tool-arms, factory builder", "gear_spider"),
        ("steam_titan", "증기 타이탄", "L", "humanoid", "massive steam-powered giant, boiler chest, piston arms", "scrap_golem"),
        ("overcharged_core", "과충전 코어", "L", "amorphous", "unstable massive energy core with arc lightning field", "overheated_core"),
        ("clockwork_commander", "태엽 사령관", "L", "humanoid", "advanced automaton officer, strategic AI, summons lesser units", "cogwork_sentinel"),
    ],
    "britalia": [
        ("kraken_tentacle", "크라켄 촉수", "L", "amorphous", "massive independent kraken tentacle, suction cups, crushing grip", "jellyfish_drifter"),
        ("dread_captain", "공포의 선장", "L", "humanoid", "elite ghost pirate captain, spectral cutlass and pistol, commanding aura", "pirate_ghost"),
        ("leviathan_spawn", "리바이어던 새끼", "L", "quadruped", "young leviathan, thick scales, tidal wave attacks", "sea_serpent_young"),
        ("coral_titan", "산호 타이탄", "L", "humanoid", "massive coral golem with living reef ecosystem, tidal powers", "reef_golem"),
    ],
    "fog_sea": [
        ("ghost_admiral", "유령 제독", "L", "spectral", "high-ranking ghost officer, phantom fleet command, spectral sword", "ghost_sailor"),
        ("fog_leviathan_spawn", "안개 리바이어던 새끼", "L", "amorphous", "young fog leviathan, fog body solidifies for attacks", "fog_serpent"),
        ("memory_kraken", "기억 크라켄", "L", "amorphous", "tentacled creature made of stolen memories, each tentacle shows scenes", "memory_sponge"),
        ("abyssal_siren", "심연 세이렌", "L", "spectral", "powerful siren entity, devastating song magic, half-fish ghost", "lost_soul_cluster"),
        ("drowned_titan", "수몰 타이탄", "L", "humanoid", "massive drowned knight, barnacle titan armor, deep pressure attacks", "drowned_knight"),
    ],
    "abyss": [
        ("memory_colossus_void", "기억 거상 (공허)", "L", "humanoid", "massive construct of corrupted memories, glitching reality around it", "memory_golem"),
        ("void_weaver", "공허 직조자", "L", "insectoid", "giant spider weaving void-fabric webs, reality tears at touch", "glitch_spider"),
        ("oblivion_serpent", "망각의 대사", "L", "quadruped", "massive ether serpent consuming memories, growing with each absorption", "ether_serpent"),
        ("paradox_knight", "역설의 기사", "L", "humanoid", "knight existing in multiple timelines, attacks from past and future simultaneously", "forgotten_warrior"),
    ],
}

BOSS_MONSTERS = {
    "erebos": [
        ("ruin_watcher", "폐허의 감시자", "XL", "humanoid", "colossal stone sentinel golem with exposed ether core in chest, ancient rune-covered body, devastating fist attacks, core vulnerability mechanic"),
        ("memory_phantom", "기억 환영", "XL", "spectral", "distorted version of Cryo's past form, warped magic circles, memory pattern attacks player must memorize"),
        ("fog_abyss", "안개 심연체", "XL", "amorphous", "massive fog-formed entity with 5-7 floating eyes, tentacle fog arms, eye-destruction puzzle mechanic"),
    ],
    "silvanhime": [
        ("worldtree_parasite", "세계수 기생체", "XL", "plant", "enormous fungal parasite attached to world tree, spore clouds, core exposure mechanic"),
        ("forest_judge", "숲의 심판자", "XL", "humanoid", "tree-stone hybrid giant with judgment staff, rotating weakness points"),
        ("ancient_ent", "고대 엔트", "XL", "plant", "living ancient tree with face, seasonal phase changes (spring→summer→autumn→winter)"),
    ],
    "solaris": [
        ("glass_emperor_boss", "유리 황제", "XL", "humanoid", "glass humanoid emperor with reflective armor, prismatic attack reflection angle mechanic"),
        ("desert_spirit_king", "사막 정령왕", "XL", "amorphous", "sand storm humanoid, materialization timing attack windows"),
        ("lava_tortoise", "용암 거북", "XL", "quadruped", "volcanic turtle with erupting back, shell weakness, rotation dodge mechanic"),
    ],
    "northland": [
        ("frost_dragon", "빙결 드래곤", "XL", "quadruped", "small ice dragon, frost breath sweeps, wing buffet, freeze mechanic"),
        ("aurora_valkyrie", "오로라 발키리", "XL", "humanoid", "warrior angel with aurora weapons, weapon element rotation mechanic"),
        ("frozen_king", "동결 왕", "XL", "humanoid", "frozen throne-bound king, throne destruction phase then personal combat phase"),
    ],
    "argentium": [
        ("central_processor", "중앙 연산기", "XL", "amorphous", "massive machine with rotating gears, pattern memorization mechanic"),
        ("steam_giant", "증기 거인", "XL", "humanoid", "steam-venting mechanical giant, overheat inducement weakness mechanic"),
        ("automaton_queen", "자동인형 여왕", "XL", "humanoid", "humanoid machine queen that spawns clones, identify-the-real-one puzzle"),
    ],
    "britalia": [
        ("kraken_boss", "크라켄", "XL", "amorphous", "giant squid with massive tentacles, tentacle severing order mechanic"),
        ("pirate_king_wraith", "해적왕의 망령", "XL", "spectral", "ghost pirate king on phantom ship, shipboard combat with rotating weaknesses"),
        ("coral_golem_boss", "산호 골렘", "XL", "humanoid", "massive coral and seaweed giant, underwater/land phase switching"),
    ],
    "fog_sea": [
        ("fog_siren", "안개 세이렌", "XL", "spectral", "half-human half-fish siren, sonic wave pattern evasion mechanic"),
        ("ghost_fleet_commander", "유령 함선장", "XL", "spectral", "ghost ship captain with chains, chain-breaking phase mechanic"),
        ("deep_anglerfish", "심해 아귀", "XL", "amorphous", "giant deep-sea anglerfish with deceptive bait light, bait identification mechanic"),
    ],
    "abyss": [
        ("mirror_of_memory", "기억의 거울", "XL", "amorphous", "giant mirror entity that clones player attacks, player clone boss mechanic"),
        ("gate_of_oblivion", "망각의 문", "XL", "amorphous", "massive gate with rushing memory streams, memory selection puzzle mechanic"),
        ("ether_heart", "에테르 심장", "XL", "amorphous", "colossal pulsing heart with ether blood vessels, vessel destruction then core mechanic"),
    ],
}

def generate_p15_12():
    """P15-12: 엘리트 + 보스 몬스터 프롬프트"""
    out_dir = BASE / "assets/prompts/monsters/elite_boss"
    count = 0
    
    # Elite monsters
    for region_key, monsters in ELITE_MONSTERS.items():
        region = REGION_PALETTES[region_key]
        region_dir = out_dir / region_key
        for mon_id, mon_kr, size, category, appearance, base_ref in monsters:
            px = "96x96"
            base_desc = (
                f"2D pixel art RPG elite monster sprite, {mon_kr} ({mon_id.replace('_', ' ')}), "
                f"enhanced variant of {base_ref.replace('_', ' ')}, "
                f"{category} creature, {appearance}, "
                f"faint {region['glow']} aura glow around edges, "
                f"{region['en']} region, {region['theme']}, "
                f"large size ({px}), menacing idle pose front-facing, "
                f"extra ornamental details, glowing accents, "
                f"2px black outline + 1px {region['glow']} outer glow"
            )
            
            data = {
                "asset_id": f"mon_{region_key}_{mon_id}_elite",
                "monster_name": mon_kr,
                "monster_name_en": mon_id.replace("_", " ").title(),
                "region": region["name"],
                "grade": "elite",
                "size": size,
                "pixel_size": px,
                "category": category,
                "base_monster_ref": base_ref,
                "motions": ["idle", "attack", "hit", "death", "special"],
                "frames": {"idle": 4, "attack": 6, "hit": 2, "death": 4, "special": 4},
                "directions": 2,
                "color_palette": {"primary": region["primary"], "secondary": region["secondary"], "glow": region["glow"], "aura": region["accent"]},
                "prompts": {
                    "sd": {
                        "sprite": {
                            "prompt": mk_sd_prompt(f"{base_desc}, {STYLE_PREFIX}"),
                            "negative": NEGATIVE_MONSTER + ", same as base monster, no aura",
                            "params": {**SD_PARAMS, "width": 512, "height": 512}
                        }
                    },
                    "dalle": {
                        "sprite": {
                            "prompt": mk_dalle_prompt(
                                f"pixel art RPG elite monster: {mon_id.replace('_', ' ').title()} — "
                                f"enhanced variant with {appearance}. "
                                f"Faint {region['glow']} aura glow. {region['en']} region. "
                                f"Large size, {px} pixel art, 2px outline + 1px aura glow"
                            ),
                            "params": DALLE_PARAMS
                        }
                    },
                    "mj": {
                        "sprite": {
                            "prompt": mk_mj_prompt(
                                f"2D pixel art RPG elite monster::2, {mon_id.replace('_', ' ')}::1.5, "
                                f"{appearance}, {region['glow']} aura glow, {region['en']}::1, "
                                f"{px} pixel art"
                            ) + " --ar 1:1",
                            "params": MJ_PARAMS_1x1
                        }
                    }
                }
            }
            write_json(region_dir / f"elite_{mon_id}.json", data)
            count += 1
    
    # Boss monsters
    for region_key, monsters in BOSS_MONSTERS.items():
        region = REGION_PALETTES[region_key]
        region_dir = out_dir / region_key
        for mon_id, mon_kr, size, category, appearance in monsters:
            px = "128x128"
            base_desc = (
                f"2D pixel art RPG dungeon boss sprite, {mon_kr} ({mon_id.replace('_', ' ')}), "
                f"{category} creature, {appearance}, "
                f"{region['en']} region, {region['theme']}, "
                f"XL size ({px}), intimidating boss encounter pose, "
                f"3px black outline + 2px strong aura glow, "
                f"maximum detail level, unique ornamental features"
            )
            
            data = {
                "asset_id": f"mon_{region_key}_{mon_id}_boss",
                "monster_name": mon_kr,
                "monster_name_en": mon_id.replace("_", " ").title(),
                "region": region["name"],
                "grade": "boss",
                "size": size,
                "pixel_size": px,
                "category": category,
                "motions": ["idle", "attack_1", "attack_2", "special", "hit", "death", "phase_transition"],
                "frames": {"idle": 4, "attack_1": 6, "attack_2": 6, "special": 6, "hit": 2, "death": 6, "phase_transition": 6},
                "directions": 1,
                "phases": 2,
                "color_palette": {"primary": region["primary"], "secondary": region["secondary"], "glow": region["glow"], "boss_accent": "#FFD700"},
                "prompts": {
                    "sd": {
                        "phase1": {
                            "prompt": mk_sd_prompt(f"{base_desc}, phase 1 full health form, {STYLE_PREFIX}"),
                            "negative": NEGATIVE_MONSTER,
                            "params": {**SD_PARAMS, "width": 768, "height": 768}
                        },
                        "phase2": {
                            "prompt": mk_sd_prompt(f"{base_desc}, phase 2 enraged form, damaged armor, exposed weak points, intensified aura, more aggressive posture, {STYLE_PREFIX}"),
                            "negative": NEGATIVE_MONSTER,
                            "params": {**SD_PARAMS, "width": 768, "height": 768}
                        }
                    },
                    "dalle": {
                        "phase1": {
                            "prompt": mk_dalle_prompt(
                                f"pixel art RPG dungeon boss: {mon_id.replace('_', ' ').title()} — "
                                f"{appearance}. Phase 1 full health. {region['en']} region. "
                                f"XL size {px}, 3px outline + 2px aura, maximum detail"
                            ),
                            "params": DALLE_PARAMS
                        },
                        "phase2": {
                            "prompt": mk_dalle_prompt(
                                f"pixel art RPG dungeon boss enraged: {mon_id.replace('_', ' ').title()} — "
                                f"Same creature but damaged, exposed weak points, intensified aura. "
                                f"Phase 2 below 50% HP. {region['en']} region. XL {px}"
                            ),
                            "params": DALLE_PARAMS
                        }
                    },
                    "mj": {
                        "phase1": {
                            "prompt": mk_mj_prompt(
                                f"2D pixel art RPG dungeon boss::2, {mon_id.replace('_', ' ')}::1.5, "
                                f"{appearance}, phase 1 full health, "
                                f"{region['en']}::1, {px} pixel art, epic boss encounter"
                            ) + " --ar 1:1",
                            "params": MJ_PARAMS_1x1
                        },
                        "phase2": {
                            "prompt": mk_mj_prompt(
                                f"2D pixel art RPG dungeon boss enraged::2, {mon_id.replace('_', ' ')}::1.5, "
                                f"damaged armor exposed weak points intensified aura, phase 2, "
                                f"{region['en']}::1, {px} pixel art"
                            ) + " --ar 1:1",
                            "params": MJ_PARAMS_1x1
                        }
                    }
                }
            }
            write_json(region_dir / f"boss_{mon_id}.json", data)
            count += 1
    return count


# ═══════════════════════════════════════════════════════════════
# P15-13: 레이드 보스 8종 × 4페이즈 상세 프롬프트
# ═══════════════════════════════════════════════════════════════

RAID_BOSSES = [
    {
        "id": "nebulos", "name_kr": "네뷸로스", "name_en": "Nebulos",
        "region": "erebos", "size": "XXL", "px": "256x256",
        "form": "nebula entity, gaseous cosmic horror",
        "description": "massive nebula-formed entity with central pulsing memory crystal core, 6-8 gas tentacles with memory fragment-tipped claws, 5-7 floating glowing eyes within gas exterior",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "base form, fog-grey dominant, slow tentacle movement, calm nebula flow, muted glow", "colors": "fog grey #2D2D3F + purple #5C4A72, faint ether blue #89CFF0 glow"},
            {"name": "강화", "hp": "75-50%", "desc": "outer shell contracts, +2 tentacles, eye glow intensifies, gas becomes more turbulent", "colors": "deep purple #6A0DAD dominant, red fog accents, brighter eye glow"},
            {"name": "광폭화", "hp": "50-25%", "desc": "outer shell explosive expansion, core exposed, battlefield fog, memory storm particles", "colors": "red-purple #8B008B + ether pulse #89CFF0, intense energy crackling"},
            {"name": "최종형태", "hp": "25-0%", "desc": "core cracking, memory storm raging, all eyes turn red, reality distortion around body", "colors": "crimson #FF0000 + void black #0A0A0A, maximum glow intensity"}
        ],
        "aura": "#89CFF0"
    },
    {
        "id": "abyssal", "name_kr": "아비살", "name_en": "Abyssal",
        "region": "solaris", "size": "XXL", "px": "256x256",
        "form": "glass-flame dragon with six wings",
        "description": "colossal dragon of vitrified sandstone scales with lava light between scale cracks, 4 glass horns, 6 glass-membrane wings, massive glass-hammer tail",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "intact glass scales, 4 wings deployed, majestic dragon pose, controlled flame", "colors": "sand gold #C2956B + glass clear, internal orange #FF6347 lava"},
            {"name": "강화", "hp": "75-50%", "desc": "scales cracking, more lava exposure, all 6 wings deployed, aggressive stance", "colors": "more orange-red exposed, glass cracking white lines, flame intensifying"},
            {"name": "광폭화", "hp": "50-25%", "desc": "lower body fully molten, grounded stance, devastating ground slams, wing flames", "colors": "molten red-orange #FF4500, glass shattering white, ground scorched black"},
            {"name": "최종형태", "hp": "25-0%", "desc": "glass shell exploding off, pure flame entity, battlefield heat distortion everywhere", "colors": "pure flame white-yellow core, red-orange body, black char environment"}
        ],
        "aura": "#FFD700"
    },
    {
        "id": "oblivion", "name_kr": "옵리비온", "name_en": "Oblivion",
        "region": "northland", "size": "XXL", "px": "256x256",
        "form": "frost giant with aurora core",
        "description": "colossal ice-armored giant, ice crown helmet with half-face ice mask, aurora-glowing core in chest, dual-wielding frost greatsword and ice shield, perpetual freeze field underfoot",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "full ice armor intact, slow majestic movement, faint aurora glow, controlled frost", "colors": "ice white #E8F4FD + deep ice blue #4682B4, subtle aurora green #00FF7F"},
            {"name": "강화", "hp": "75-50%", "desc": "armor cracking, aurora energy leaking, faster attacks, ice spikes erupting", "colors": "more aurora #00FF7F/#FF69B4 visible through cracks, blue intensifying"},
            {"name": "광폭화", "hp": "50-25%", "desc": "half armor fallen, aurora energy body half-exposed, dual swords, extreme speed", "colors": "aurora green-pink energy body, remaining ice armor glowing, intense light"},
            {"name": "최종형태", "hp": "25-0%", "desc": "ice fully shattered, pure aurora giant, battlefield frozen solid, blinding light", "colors": "pure aurora #00FF7F/#FF69B4/#00BFFF shifting, white light core, frozen blue field"}
        ],
        "aura": "#00FF7F"
    },
    {
        "id": "lethe_abyssal", "name_kr": "레테 대심연체", "name_en": "Lethe Abyssal",
        "region": "fog_sea", "size": "XXL", "px": "256x256",
        "form": "ghost ship merged with deep-sea kraken",
        "description": "wrecked ship hull as body with mast-bones, 8 massive tentacles extending from hull bottom with fog and seaweed, ghost crew on deck, single enormous eye at bow",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "ship form intact, 4 tentacles active, ghost crew visible, eerie calm", "colors": "fog purple #3C3C5C + ghost grey #696969, purple eye glow #BA55D3"},
            {"name": "강화", "hp": "75-50%", "desc": "hull splitting, inner sea-creature flesh exposed, all 8 tentacles active", "colors": "flesh dark purple #4B0082, bioluminescent accents #DDA0DD, eye brighter"},
            {"name": "광폭화", "hp": "50-25%", "desc": "hull fully shed, pure deep-sea kraken form, ghost swarm explosion", "colors": "deep sea black-purple, bioluminescent spots, ghost white #F8F8FF swarm"},
            {"name": "최종형태", "hp": "25-0%", "desc": "kraken + fog fusion, battlefield submerged visual, soul absorption vortex", "colors": "deep void purple #1E1E3E, soul white-blue vortex, eye crimson red"}
        ],
        "aura": "#BA55D3"
    },
    {
        "id": "time_sentinel", "name_kr": "시간의 파수꾼", "name_en": "Time Sentinel",
        "region": "britalia", "size": "XXL", "px": "256x256",
        "form": "mechanical clock-tower angel",
        "description": "colossal clock-tower-human hybrid, clock face as head with hands as eyes, gear-and-spring mechanical body, large pendulum in chest, 4 mechanical gear-wings, minute-hand greatsword",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "normal operation, gears rotating smoothly, clock accurate, mechanical precision", "colors": "brass gold #B8860B + iron grey #696969, clock white face, gold glow #FFD700"},
            {"name": "강화", "hp": "75-50%", "desc": "time distortion begins, gears intermittently reversing, temporal afterimages", "colors": "blue temporal #3498DB accents, afterimage trails, gear glow increasing"},
            {"name": "광폭화", "hp": "50-25%", "desc": "time fracture, body showing past/future forms simultaneously, reality tearing", "colors": "reality crack white-gold, dual-timeline overlap, purple #9B59B6 time tears"},
            {"name": "최종형태", "hp": "25-0%", "desc": "time collapse, all gears overdrive, battlefield random time stop/acceleration", "colors": "overdrive red-gold, white-hot gears, temporal rainbow distortion everywhere"}
        ],
        "aura": "#FFD700"
    },
    {
        "id": "abyssal_leviathan", "name_kr": "심연 레비아탄", "name_en": "Abyssal Leviathan",
        "region": "abyss", "size": "XXL", "px": "256x256",
        "form": "memory-formed cosmic serpent-dragon",
        "description": "colossal serpent-dragon made of pure ether, 7 memory-chapter eyes, translucent ether scales with memory scenes flowing inside, memory fragment asteroid belt orbiting body, ether mane",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "beautiful ether form, peaceful memory scenes inside, serene cosmic presence", "colors": "ether cyan #89CFF0 + pure white #FFFFFF, golden memory #FFD700 accents"},
            {"name": "강화", "hp": "75-50%", "desc": "memories darkening, scales reddening, internal scenes becoming nightmarish", "colors": "darkening cyan-to-red shift, memory scenes dimming, red #E74C3C accents"},
            {"name": "광폭화", "hp": "50-25%", "desc": "memory collapse, body glitching, attacks replaying past boss patterns", "colors": "glitch purple-red #FF00FF, memory static white, corruption black spots"},
            {"name": "최종형태", "hp": "25-0%", "desc": "complete oblivion entity, black+red ether, memory annihilation attacks", "colors": "void black #0A0A1E + blood red #FF0000, anti-glow, reality erasure white"}
        ],
        "aura": "#89CFF0"
    },
    {
        "id": "chronos_prime", "name_kr": "크로노스 프라임", "name_en": "Chronos Prime",
        "region": "hidden", "size": "XXL", "px": "256x256",
        "form": "ultimate time construct, clock deity",
        "description": "colossal humanoid made entirely of interlocking clock mechanisms, multiple clock faces for heads (past/present/future), hourglass torso with flowing time-sand, pendulum legs, arms made of clock hands at various scales",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "all clocks synchronized, smooth rotation, time-sand flowing normally, majestic and precise", "colors": "brass gold #B8860B + silver #C0C0C0, hourglass amber #F39C12, clock white"},
            {"name": "강화", "hp": "75-50%", "desc": "clocks desynchronizing, time-sand flowing in multiple directions, temporal echoes", "colors": "gold intensifying, temporal blue #3498DB fractures, amber pulsing"},
            {"name": "광폭화", "hp": "50-25%", "desc": "time paradox, multiple versions overlapping, clock faces spinning wildly", "colors": "paradox purple #9B59B6 + gold, reality tear white, chaotic glow"},
            {"name": "최종형태", "hp": "25-0%", "desc": "time singularity, all clocks shattered, pure temporal energy deity, time itself weaponized", "colors": "pure white-gold temporal energy, void black absence-of-time patches, rainbow time-spectrum"}
        ],
        "aura": "#F39C12"
    },
    {
        "id": "void_architect", "name_kr": "보이드 아키텍트", "name_en": "Void Architect",
        "region": "hidden", "size": "XXL", "px": "256x256",
        "form": "cosmic void entity, reality architect",
        "description": "incomprehensible geometric entity that constructs and deconstructs reality, body made of impossible geometry (Escher-like), multiple floating construction-tool limbs, a void eye that erases what it sees, surrounded by floating reality-blueprint fragments",
        "phases": [
            {"name": "기본", "hp": "100-75%", "desc": "constructing mode, building geometric structures around battlefield, cold calculating", "colors": "void black #0D0D1A + blueprint cyan #89CFF0, geometric white lines, cold blue glow"},
            {"name": "강화", "hp": "75-50%", "desc": "deconstructing mode, breaking down arena reality, impossible angles manifesting", "colors": "warmer destruction red-orange accents, cyan fading, void expanding"},
            {"name": "광폭화", "hp": "50-25%", "desc": "paradox mode, simultaneously building and destroying, arena geometry impossible", "colors": "paradox red #E74C3C + cyan #89CFF0 clash, void purple #9B59B6, reality static"},
            {"name": "최종형태", "hp": "25-0%", "desc": "singularity, collapsing all created structures into single point, reality imploding", "colors": "singularity white center, void black everything else, final gold #FFD700 core"}
        ],
        "aura": "#9B59B6"
    },
]

def generate_p15_13():
    """P15-13: 레이드 보스 8종 × 4페이즈 상세 프롬프트"""
    out_dir = BASE / "assets/prompts/monsters/raid_boss"
    count = 0
    
    for boss in RAID_BOSSES:
        region = REGION_PALETTES[boss["region"]]
        boss_dir = out_dir
        
        # Main boss file with all phases
        phase_prompts = {}
        for i, phase in enumerate(boss["phases"], 1):
            phase_key = f"phase{i}"
            
            base_desc = (
                f"2D pixel art RPG raid boss, {boss['name_en']} ({boss['name_kr']}), "
                f"MASSIVE {boss['form']}, {boss['description']}, "
                f"phase {i} ({phase['name']}): {phase['desc']}, "
                f"color palette: {phase['colors']}, "
                f"{region['en']} region, XXL size ({boss['px']}), "
                f"menacing epic scale intricate details, "
                f"3px black outline + 3px {boss['aura']} outer glow, "
                f"particle effects around body, boss encounter art"
            )
            
            phase_prompts[phase_key] = {
                "phase_name": phase["name"],
                "hp_range": phase["hp"],
                "description": phase["desc"],
                "colors": phase["colors"],
                "sd": {
                    "illustration": {
                        "prompt": mk_sd_prompt(f"{base_desc}, {STYLE_PREFIX}"),
                        "negative": NEGATIVE_MONSTER + ", small, cute, non-threatening",
                        "params": {**SD_PARAMS, "width": 1024, "height": 1024}
                    }
                },
                "dalle": {
                    "illustration": {
                        "prompt": mk_dalle_prompt(
                            f"pixel art RPG raid boss: {boss['name_en']} — "
                            f"{boss['form']}. {boss['description']}. "
                            f"Phase {i} ({phase['name']}, {phase['hp']}): {phase['desc']}. "
                            f"Colors: {phase['colors']}. "
                            f"XXL {boss['px']} pixel art, 3px outline + 3px {boss['aura']} aura, "
                            f"epic boss encounter, maximum detail"
                        ),
                        "params": DALLE_PARAMS
                    }
                },
                "mj": {
                    "illustration": {
                        "prompt": mk_mj_prompt(
                            f"2D pixel art RPG raid boss epic::2, {boss['name_en']}::1.5, "
                            f"{boss['form']}, phase {i} {phase['name']}, {phase['desc']}::1, "
                            f"{phase['colors']}, {boss['px']} pixel art, 3px outline {boss['aura']} aura"
                        ) + " --ar 1:1",
                        "params": MJ_PARAMS_1x1
                    }
                }
            }
        
        # img2img chain configuration
        img2img_chain = {
            "phase1_to_phase2": {
                "source": "phase1",
                "target": "phase2",
                "denoising_strength": 0.55,
                "prompt_modifier": "same creature but damaged, intensified aura, more aggressive, phase 2 transformation",
                "sd_params": {"denoising_strength": 0.55, "steps": 40}
            },
            "phase2_to_phase3": {
                "source": "phase2",
                "target": "phase3",
                "denoising_strength": 0.60,
                "prompt_modifier": "same creature further transformed, enraged form, dramatic visual escalation, phase 3",
                "sd_params": {"denoising_strength": 0.60, "steps": 40}
            },
            "phase3_to_phase4": {
                "source": "phase3",
                "target": "phase4",
                "denoising_strength": 0.65,
                "prompt_modifier": "same creature final form, maximum power, overwhelming presence, ultimate phase",
                "sd_params": {"denoising_strength": 0.65, "steps": 45}
            }
        }
        
        data = {
            "asset_id": f"raid_boss_{boss['id']}",
            "boss_name": boss["name_kr"],
            "boss_name_en": boss["name_en"],
            "region": region["name"],
            "grade": "raid",
            "size": boss["size"],
            "pixel_size": boss["px"],
            "form": boss["form"],
            "description": boss["description"],
            "aura_color": boss["aura"],
            "total_phases": 4,
            "motions": {
                "idle": {"frames": 6, "fps": 4},
                "attack_1": {"frames": 8, "fps": 12},
                "attack_2": {"frames": 8, "fps": 12},
                "special": {"frames": 8, "fps": 10},
                "hit": {"frames": 2, "fps": 12},
                "death": {"frames": 10, "fps": 8},
                "phase_transition": {"frames": 10, "fps": 8},
                "enrage": {"frames": 6, "fps": 10}
            },
            "phase_prompts": phase_prompts,
            "img2img_chain": img2img_chain
        }
        
        write_json(boss_dir / f"{boss['id']}.json", data)
        count += 1
    
    return count


# ═══════════════════════════════════════════════════════════════
# Main execution
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    results = {}
    
    print("=== P15-08: NPC 30명 초상화 프롬프트 ===")
    results["P15-08"] = generate_p15_08()
    print(f"  생성: {results['P15-08']}개 파일")
    
    print("=== P15-09: 캐릭터 스프라이트 시트 프롬프트 ===")
    results["P15-09"] = generate_p15_09()
    print(f"  생성: {results['P15-09']}개 파일")
    
    print("=== P15-10: NPC 스프라이트 프롬프트 ===")
    results["P15-10"] = generate_p15_10()
    print(f"  생성: {results['P15-10']}개 파일")
    
    print("=== P15-11: 일반 몬스터 프롬프트 ===")
    results["P15-11"] = generate_p15_11()
    print(f"  생성: {results['P15-11']}개 파일")
    
    print("=== P15-12: 엘리트+보스 몬스터 프롬프트 ===")
    results["P15-12"] = generate_p15_12()
    print(f"  생성: {results['P15-12']}개 파일")
    
    print("=== P15-13: 레이드 보스 8종 상세 프롬프트 ===")
    results["P15-13"] = generate_p15_13()
    print(f"  생성: {results['P15-13']}개 파일")
    
    total = sum(results.values())
    print(f"\n=== 총 {total}개 파일 생성 완료 ===")
    for k, v in results.items():
        print(f"  {k}: {v}")
