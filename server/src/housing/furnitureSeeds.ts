/**
 * furnitureSeeds.ts — 50종 가구 + 제작 레시피 (P8-10)
 *
 * 카테고리: table(6), chair(5), light(6), decoration(8), storage(4),
 *           bed(4), rug(4), wall(5), outdoor(4), special(4)
 *
 * 등급: common(20), uncommon(15), rare(10), epic(4), legendary(1)
 *
 * crafting_system_design.md 기반 — 가구 제작 카테고리 통합
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface FurnitureSeed {
  id: string;
  name: string;
  category: string;
  rarity: string;
  description: string;
  effect?: { type: string; value: number };  // 배치 시 효과 (선택)
  recipe: {
    materials: { itemId: string; name: string; count: number }[];
    requiredLevel: number;     // 가구 제작 숙련도 레벨
    craftTime: number;         // 초 단위
    successRate: number;       // 0.0~1.0
  };
}

// ─── 테이블 (6) ─────────────────────────────────────────────────

const tables: FurnitureSeed[] = [
  {
    id: 'FURN_TABLE_WOOD', name: '나무 식탁', category: 'table', rarity: 'common',
    description: '소박한 나무 식탁. 네 명이 둘러앉기 좋다.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 8 }, { itemId: 'mat_iron_nail', name: '철 못', count: 4 }], requiredLevel: 10, craftTime: 30, successRate: 1.0 },
  },
  {
    id: 'FURN_TABLE_STONE', name: '석재 테이블', category: 'table', rarity: 'common',
    description: '묵직한 돌 테이블. 내구성이 뛰어나다.',
    recipe: { materials: [{ itemId: 'mat_stone_block', name: '석재 블록', count: 6 }, { itemId: 'mat_mortar', name: '접합재', count: 3 }], requiredLevel: 15, craftTime: 45, successRate: 1.0 },
  },
  {
    id: 'FURN_TABLE_ELEGANT', name: '우아한 원형 테이블', category: 'table', rarity: 'uncommon',
    description: '정교하게 조각된 원형 테이블. 격조 높은 분위기.',
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 10 }, { itemId: 'mat_varnish', name: '광택제', count: 3 }, { itemId: 'mat_silver_inlay', name: '은 상감', count: 2 }], requiredLevel: 25, craftTime: 60, successRate: 0.9 },
  },
  {
    id: 'FURN_TABLE_CHRONO', name: '크로노스 서재 탁자', category: 'table', rarity: 'rare',
    description: '시계 톱니가 장식된 크로노스풍 탁자.',
    effect: { type: 'craft_speed_bonus', value: 5 },
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 8 }, { itemId: 'MAT_GEAR_FRAGMENT', name: '톱니 파편', count: 5 }, { itemId: 'MAT_TIME_SHARD', name: '시간 파편', count: 2 }], requiredLevel: 40, craftTime: 90, successRate: 0.8 },
  },
  {
    id: 'FURN_TABLE_AETHER', name: '에테르 마법 작업대', category: 'table', rarity: 'rare',
    description: '에테르 결정으로 빛나는 마법 작업대.',
    effect: { type: 'enchant_bonus', value: 3 },
    recipe: { materials: [{ itemId: 'MAT_AETHER_CRYSTAL', name: '에테르 수정', count: 4 }, { itemId: 'mat_hardwood', name: '경목', count: 6 }, { itemId: 'MAT_SPIRIT_ESSENCE', name: '정령 에센스', count: 3 }], requiredLevel: 50, craftTime: 120, successRate: 0.75 },
  },
  {
    id: 'FURN_TABLE_MIST', name: '안개해 산호 테이블', category: 'table', rarity: 'epic',
    description: '안개해 산호로 만든 신비로운 테이블. 은은한 빛이 난다.',
    effect: { type: 'hp_regen', value: 1 },
    recipe: { materials: [{ itemId: 'MAT_MEMORY_CORAL', name: '기억 산호', count: 8 }, { itemId: 'MAT_FOG_ESSENCE', name: '안개 에센스', count: 5 }, { itemId: 'MAT_SEAL_FRAGMENT', name: '봉인 파편', count: 2 }], requiredLevel: 65, craftTime: 180, successRate: 0.6 },
  },
];

// ─── 의자 (5) ───────────────────────────────────────────────────

const chairs: FurnitureSeed[] = [
  {
    id: 'FURN_CHAIR_WOOD', name: '나무 의자', category: 'chair', rarity: 'common',
    description: '가장 기본적인 나무 의자.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 4 }, { itemId: 'mat_iron_nail', name: '철 못', count: 2 }], requiredLevel: 10, craftTime: 15, successRate: 1.0 },
  },
  {
    id: 'FURN_CHAIR_CUSHION', name: '쿠션 의자', category: 'chair', rarity: 'common',
    description: '푹신한 쿠션이 달린 편안한 의자.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 4 }, { itemId: 'mat_cloth', name: '천', count: 3 }, { itemId: 'mat_cotton', name: '솜', count: 2 }], requiredLevel: 12, craftTime: 20, successRate: 1.0 },
  },
  {
    id: 'FURN_CHAIR_THRONE', name: '미니 왕좌', category: 'chair', rarity: 'uncommon',
    description: '작지만 위엄 있는 왕좌. 앉으면 기분이 좋아진다.',
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 6 }, { itemId: 'mat_gold_leaf', name: '금박', count: 3 }, { itemId: 'mat_velvet', name: '벨벳', count: 2 }], requiredLevel: 30, craftTime: 60, successRate: 0.85 },
  },
  {
    id: 'FURN_CHAIR_CRYSTAL', name: '수정 의자', category: 'chair', rarity: 'rare',
    description: '투명한 수정으로 만든 의자. 빛을 굴절시킨다.',
    recipe: { materials: [{ itemId: 'MAT_CRYSTAL_ORE', name: '수정 원석', count: 6 }, { itemId: 'MAT_GEM_ROUGH', name: '가공 전 보석', count: 2 }], requiredLevel: 45, craftTime: 90, successRate: 0.75 },
  },
  {
    id: 'FURN_CHAIR_MIST', name: '안개해 조개 의자', category: 'chair', rarity: 'rare',
    description: '거대 조개를 가공한 안개해 의자.',
    effect: { type: 'mp_regen', value: 1 },
    recipe: { materials: [{ itemId: 'MAT_FROZEN_PEARL', name: '빙결 진주', count: 3 }, { itemId: 'MAT_MIST_TURTLE_SHELL', name: '안개 거북 껍데기', count: 2 }, { itemId: 'mat_cloth', name: '천', count: 4 }], requiredLevel: 55, craftTime: 100, successRate: 0.7 },
  },
];

// ─── 조명 (6) ───────────────────────────────────────────────────

const lights: FurnitureSeed[] = [
  {
    id: 'FURN_LIGHT_CANDLE', name: '양초 받침대', category: 'light', rarity: 'common',
    description: '소박한 양초 하나가 올려진 받침대.',
    recipe: { materials: [{ itemId: 'mat_iron_ingot', name: '철 주괴', count: 1 }, { itemId: 'mat_wax', name: '밀랍', count: 2 }], requiredLevel: 10, craftTime: 10, successRate: 1.0 },
  },
  {
    id: 'FURN_LIGHT_LANTERN', name: '철제 랜턴', category: 'light', rarity: 'common',
    description: '튼튼한 철제 랜턴. 밝은 빛을 낸다.',
    recipe: { materials: [{ itemId: 'mat_iron_ingot', name: '철 주괴', count: 3 }, { itemId: 'mat_glass', name: '유리', count: 2 }], requiredLevel: 12, craftTime: 20, successRate: 1.0 },
  },
  {
    id: 'FURN_LIGHT_CHANDELIER', name: '샹들리에', category: 'light', rarity: 'uncommon',
    description: '화려한 다등 샹들리에.',
    recipe: { materials: [{ itemId: 'mat_gold_leaf', name: '금박', count: 5 }, { itemId: 'mat_glass', name: '유리', count: 8 }, { itemId: 'mat_iron_ingot', name: '철 주괴', count: 4 }], requiredLevel: 30, craftTime: 60, successRate: 0.85 },
  },
  {
    id: 'FURN_LIGHT_AETHER_ORB', name: '에테르 조명구', category: 'light', rarity: 'uncommon',
    description: '에테르 에너지로 빛나는 부유하는 조명구.',
    recipe: { materials: [{ itemId: 'MAT_AETHER_CRYSTAL', name: '에테르 수정', count: 2 }, { itemId: 'mat_glass', name: '유리', count: 3 }, { itemId: 'MAT_MANA_RESIDUE', name: '마나 잔여물', count: 4 }], requiredLevel: 25, craftTime: 40, successRate: 0.9 },
  },
  {
    id: 'FURN_LIGHT_MIST_LAMP', name: '안개해 등대 미니어처', category: 'light', rarity: 'rare',
    description: '기억의 등대를 본뜬 미니어처 조명.',
    effect: { type: 'exp_bonus', value: 1 },
    recipe: { materials: [{ itemId: 'MAT_LIGHTHOUSE_KEY', name: '등대 열쇠', count: 1 }, { itemId: 'MAT_SEAL_LENS', name: '봉인 렌즈', count: 2 }, { itemId: 'mat_glass', name: '유리', count: 5 }], requiredLevel: 60, craftTime: 120, successRate: 0.65 },
  },
  {
    id: 'FURN_LIGHT_FIREFLY', name: '반딧불이 병', category: 'light', rarity: 'common',
    description: '유리병 안의 반딧불이가 은은한 빛을 낸다.',
    recipe: { materials: [{ itemId: 'mat_glass', name: '유리', count: 2 }, { itemId: 'MAT_ETHER_DUST', name: '에테르 가루', count: 3 }], requiredLevel: 15, craftTime: 15, successRate: 1.0 },
  },
];

// ─── 장식 (8) ───────────────────────────────────────────────────

const decorations: FurnitureSeed[] = [
  {
    id: 'FURN_DECO_VASE', name: '꽃병', category: 'decoration', rarity: 'common',
    description: '꽃을 꽂을 수 있는 소박한 도자기 꽃병.',
    recipe: { materials: [{ itemId: 'mat_clay', name: '점토', count: 3 }], requiredLevel: 10, craftTime: 15, successRate: 1.0 },
  },
  {
    id: 'FURN_DECO_PAINTING', name: '풍경화', category: 'decoration', rarity: 'common',
    description: '황혼의 숲 풍경이 그려진 액자.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 3 }, { itemId: 'mat_paint', name: '물감', count: 2 }, { itemId: 'mat_cloth', name: '천', count: 1 }], requiredLevel: 12, craftTime: 20, successRate: 1.0 },
  },
  {
    id: 'FURN_DECO_BOOKSHELF', name: '책장', category: 'decoration', rarity: 'common',
    description: '책과 두루마리를 정리할 수 있는 나무 책장.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 10 }, { itemId: 'mat_iron_nail', name: '철 못', count: 6 }], requiredLevel: 14, craftTime: 30, successRate: 1.0 },
  },
  {
    id: 'FURN_DECO_TROPHY', name: '몬스터 트로피', category: 'decoration', rarity: 'uncommon',
    description: '처치한 보스의 머리를 박제한 트로피.',
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 5 }, { itemId: 'MAT_WOLF_PELT', name: '늑대 가죽', count: 2 }, { itemId: 'mat_leather', name: '가죽', count: 3 }], requiredLevel: 20, craftTime: 40, successRate: 0.9 },
  },
  {
    id: 'FURN_DECO_GLOBE', name: '에테르나 지구본', category: 'decoration', rarity: 'uncommon',
    description: '에테르나 대륙이 정밀하게 새겨진 지구본.',
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 4 }, { itemId: 'mat_paint', name: '물감', count: 5 }, { itemId: 'mat_glass', name: '유리', count: 3 }], requiredLevel: 28, craftTime: 50, successRate: 0.85 },
  },
  {
    id: 'FURN_DECO_AQUARIUM', name: '미니 수족관', category: 'decoration', rarity: 'rare',
    description: '작은 에테르 물고기들이 헤엄치는 수족관.',
    effect: { type: 'comfort', value: 5 },
    recipe: { materials: [{ itemId: 'mat_glass', name: '유리', count: 8 }, { itemId: 'MAT_AETHER_ESSENCE', name: '에테르 에센스', count: 3 }, { itemId: 'mat_sand', name: '모래', count: 5 }], requiredLevel: 40, craftTime: 80, successRate: 0.75 },
  },
  {
    id: 'FURN_DECO_SEAL_REPLICA', name: '봉인석 레플리카', category: 'decoration', rarity: 'epic',
    description: '봉인의 첨탑 봉인석을 본뜬 정교한 복제품.',
    effect: { type: 'defense_aura', value: 2 },
    recipe: { materials: [{ itemId: 'MAT_SEAL_FRAGMENT', name: '봉인 파편', count: 5 }, { itemId: 'MAT_AETHER_CORE', name: '에테르 코어', count: 2 }, { itemId: 'MAT_WARDEN_CORE', name: '감시체 코어', count: 1 }], requiredLevel: 70, craftTime: 200, successRate: 0.5 },
  },
  {
    id: 'FURN_DECO_CLOCK', name: '탁상 시계', category: 'decoration', rarity: 'common',
    description: '크로노스제 탁상 시계. 째깍 소리가 난다.',
    recipe: { materials: [{ itemId: 'MAT_GEAR_FRAGMENT', name: '톱니 파편', count: 3 }, { itemId: 'mat_iron_ingot', name: '철 주괴', count: 2 }, { itemId: 'mat_glass', name: '유리', count: 1 }], requiredLevel: 16, craftTime: 25, successRate: 1.0 },
  },
];

// ─── 수납 (4) ───────────────────────────────────────────────────

const storages: FurnitureSeed[] = [
  {
    id: 'FURN_STORAGE_CHEST', name: '나무 상자', category: 'storage', rarity: 'common',
    description: '물건을 보관할 수 있는 기본 나무 상자.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 6 }, { itemId: 'mat_iron_nail', name: '철 못', count: 4 }], requiredLevel: 10, craftTime: 20, successRate: 1.0 },
  },
  {
    id: 'FURN_STORAGE_WARDROBE', name: '옷장', category: 'storage', rarity: 'uncommon',
    description: '의상과 코스메틱을 보관하는 장.',
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 8 }, { itemId: 'mat_iron_nail', name: '철 못', count: 6 }, { itemId: 'mat_varnish', name: '광택제', count: 2 }], requiredLevel: 22, craftTime: 45, successRate: 0.9 },
  },
  {
    id: 'FURN_STORAGE_SAFE', name: '강철 금고', category: 'storage', rarity: 'rare',
    description: '재화를 안전하게 보관하는 강철 금고.',
    recipe: { materials: [{ itemId: 'mat_steel_ingot', name: '강철 주괴', count: 10 }, { itemId: 'MAT_GEAR_FRAGMENT', name: '톱니 파편', count: 4 }, { itemId: 'MAT_IRON_ORE', name: '철 광석', count: 6 }], requiredLevel: 38, craftTime: 80, successRate: 0.8 },
  },
  {
    id: 'FURN_STORAGE_RELIC', name: '유물 진열장', category: 'storage', rarity: 'uncommon',
    description: '귀중한 유물을 전시하는 유리 진열장.',
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 6 }, { itemId: 'mat_glass', name: '유리', count: 6 }, { itemId: 'mat_gold_leaf', name: '금박', count: 2 }], requiredLevel: 26, craftTime: 50, successRate: 0.85 },
  },
];

// ─── 침대 (4) ───────────────────────────────────────────────────

const beds: FurnitureSeed[] = [
  {
    id: 'FURN_BED_SIMPLE', name: '간이 침대', category: 'bed', rarity: 'common',
    description: '소박한 간이 침대. 휴식에 충분하다.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 6 }, { itemId: 'mat_cloth', name: '천', count: 4 }, { itemId: 'mat_cotton', name: '솜', count: 3 }], requiredLevel: 10, craftTime: 25, successRate: 1.0 },
  },
  {
    id: 'FURN_BED_DOUBLE', name: '더블 침대', category: 'bed', rarity: 'uncommon',
    description: '넉넉한 더블 사이즈 침대.',
    effect: { type: 'rest_bonus', value: 5 },
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 8 }, { itemId: 'mat_cloth', name: '천', count: 6 }, { itemId: 'mat_cotton', name: '솜', count: 6 }, { itemId: 'mat_varnish', name: '광택제', count: 2 }], requiredLevel: 24, craftTime: 50, successRate: 0.9 },
  },
  {
    id: 'FURN_BED_CANOPY', name: '캐노피 침대', category: 'bed', rarity: 'rare',
    description: '천으로 장식된 고급 캐노피 침대.',
    effect: { type: 'rest_bonus', value: 10 },
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 10 }, { itemId: 'mat_velvet', name: '벨벳', count: 6 }, { itemId: 'mat_gold_leaf', name: '금박', count: 3 }, { itemId: 'mat_cotton', name: '솜', count: 8 }], requiredLevel: 42, craftTime: 100, successRate: 0.75 },
  },
  {
    id: 'FURN_BED_MIST', name: '안개해 수면 해먹', category: 'bed', rarity: 'rare',
    description: '안개해 실크로 짠 부유하는 해먹.',
    effect: { type: 'rest_bonus', value: 12 },
    recipe: { materials: [{ itemId: 'MAT_MIST_EEL_SKIN', name: '안개 뱀장어 가죽', count: 4 }, { itemId: 'MAT_SIREN_SCALE', name: '인어 비늘', count: 3 }, { itemId: 'mat_cotton', name: '솜', count: 6 }], requiredLevel: 58, craftTime: 120, successRate: 0.65 },
  },
];

// ─── 러그 (4) ───────────────────────────────────────────────────

const rugs: FurnitureSeed[] = [
  {
    id: 'FURN_RUG_SIMPLE', name: '양모 러그', category: 'rug', rarity: 'common',
    description: '따뜻한 양모 러그.',
    recipe: { materials: [{ itemId: 'mat_wool', name: '양모', count: 6 }], requiredLevel: 10, craftTime: 20, successRate: 1.0 },
  },
  {
    id: 'FURN_RUG_PATTERN', name: '문양 카펫', category: 'rug', rarity: 'uncommon',
    description: '정교한 문양이 직조된 카펫.',
    recipe: { materials: [{ itemId: 'mat_wool', name: '양모', count: 8 }, { itemId: 'mat_paint', name: '물감', count: 4 }, { itemId: 'mat_cloth', name: '천', count: 4 }], requiredLevel: 20, craftTime: 40, successRate: 0.9 },
  },
  {
    id: 'FURN_RUG_BEAR', name: '곰 가죽 러그', category: 'rug', rarity: 'uncommon',
    description: '커다란 곰의 가죽을 펼친 러그.',
    recipe: { materials: [{ itemId: 'mat_leather', name: '가죽', count: 8 }, { itemId: 'mat_cotton', name: '솜', count: 3 }], requiredLevel: 18, craftTime: 30, successRate: 0.9 },
  },
  {
    id: 'FURN_RUG_MAGIC', name: '마법진 러그', category: 'rug', rarity: 'rare',
    description: '에테르 문양이 빛나는 마법진 러그.',
    effect: { type: 'mp_regen', value: 2 },
    recipe: { materials: [{ itemId: 'mat_cloth', name: '천', count: 10 }, { itemId: 'MAT_AETHER_ESSENCE', name: '에테르 에센스', count: 4 }, { itemId: 'MAT_MANA_RESIDUE', name: '마나 잔여물', count: 5 }], requiredLevel: 48, craftTime: 90, successRate: 0.7 },
  },
];

// ─── 벽 장식 (5) ────────────────────────────────────────────────

const wallItems: FurnitureSeed[] = [
  {
    id: 'FURN_WALL_WEAPON', name: '무기 걸이', category: 'wall', rarity: 'common',
    description: '좋아하는 무기를 전시하는 벽걸이.',
    recipe: { materials: [{ itemId: 'mat_iron_ingot', name: '철 주괴', count: 3 }, { itemId: 'mat_wood', name: '목재', count: 2 }], requiredLevel: 12, craftTime: 15, successRate: 1.0 },
  },
  {
    id: 'FURN_WALL_BANNER', name: '길드 현수막', category: 'wall', rarity: 'common',
    description: '길드 문장이 새겨진 현수막.',
    recipe: { materials: [{ itemId: 'mat_cloth', name: '천', count: 4 }, { itemId: 'mat_paint', name: '물감', count: 3 }], requiredLevel: 14, craftTime: 20, successRate: 1.0 },
  },
  {
    id: 'FURN_WALL_MIRROR', name: '은색 거울', category: 'wall', rarity: 'uncommon',
    description: '은으로 테두리를 두른 벽 거울.',
    recipe: { materials: [{ itemId: 'mat_silver_inlay', name: '은 상감', count: 4 }, { itemId: 'mat_glass', name: '유리', count: 3 }], requiredLevel: 22, craftTime: 35, successRate: 0.9 },
  },
  {
    id: 'FURN_WALL_MAP', name: '에테르나 세계 지도', category: 'wall', rarity: 'uncommon',
    description: '에테르나 대륙 전체가 그려진 대형 지도.',
    recipe: { materials: [{ itemId: 'mat_cloth', name: '천', count: 6 }, { itemId: 'mat_paint', name: '물감', count: 6 }, { itemId: 'mat_wood', name: '목재', count: 4 }], requiredLevel: 26, craftTime: 45, successRate: 0.85 },
  },
  {
    id: 'FURN_WALL_TAPESTRY', name: '고대 태피스트리', category: 'wall', rarity: 'epic',
    description: '12인의 봉인자가 그려진 고대 직물.',
    effect: { type: 'all_stat_bonus', value: 1 },
    recipe: { materials: [{ itemId: 'mat_velvet', name: '벨벳', count: 8 }, { itemId: 'mat_gold_leaf', name: '금박', count: 5 }, { itemId: 'MAT_SEAL_FRAGMENT', name: '봉인 파편', count: 3 }, { itemId: 'MAT_MEMORY_FRAGMENT', name: '기억 파편', count: 3 }], requiredLevel: 68, craftTime: 200, successRate: 0.5 },
  },
];

// ─── 야외 (4) ───────────────────────────────────────────────────

const outdoor: FurnitureSeed[] = [
  {
    id: 'FURN_OUT_BENCH', name: '정원 벤치', category: 'outdoor', rarity: 'common',
    description: '정원에 놓는 나무 벤치.',
    recipe: { materials: [{ itemId: 'mat_wood', name: '목재', count: 6 }, { itemId: 'mat_iron_nail', name: '철 못', count: 4 }], requiredLevel: 10, craftTime: 20, successRate: 1.0 },
  },
  {
    id: 'FURN_OUT_FOUNTAIN', name: '소형 분수', category: 'outdoor', rarity: 'uncommon',
    description: '물이 졸졸 흐르는 돌 분수.',
    recipe: { materials: [{ itemId: 'mat_stone_block', name: '석재 블록', count: 8 }, { itemId: 'mat_mortar', name: '접합재', count: 4 }, { itemId: 'mat_iron_ingot', name: '철 주괴', count: 3 }], requiredLevel: 28, craftTime: 60, successRate: 0.85 },
  },
  {
    id: 'FURN_OUT_GARDEN', name: '에테르 정원 화단', category: 'outdoor', rarity: 'common',
    description: '에테르 허브를 키울 수 있는 화단.',
    recipe: { materials: [{ itemId: 'mat_stone_block', name: '석재 블록', count: 4 }, { itemId: 'mat_soil', name: '흙', count: 6 }], requiredLevel: 14, craftTime: 25, successRate: 1.0 },
  },
  {
    id: 'FURN_OUT_STATUE', name: '봉인자 석상', category: 'outdoor', rarity: 'epic',
    description: '12인의 봉인자 중 한 명을 본뜬 석상.',
    effect: { type: 'attack_aura', value: 2 },
    recipe: { materials: [{ itemId: 'mat_stone_block', name: '석재 블록', count: 15 }, { itemId: 'MAT_SEAL_FRAGMENT', name: '봉인 파편', count: 4 }, { itemId: 'MAT_GUARDIAN_ESSENCE', name: '수호 에센스', count: 2 }, { itemId: 'mat_gold_leaf', name: '금박', count: 3 }], requiredLevel: 72, craftTime: 240, successRate: 0.5 },
  },
];

// ─── 특수 (4) ───────────────────────────────────────────────────

const special: FurnitureSeed[] = [
  {
    id: 'FURN_SP_WORKBENCH', name: '휴대용 제작대', category: 'special', rarity: 'uncommon',
    description: '집에서 제작을 할 수 있는 작업대.',
    effect: { type: 'craft_at_home', value: 1 },
    recipe: { materials: [{ itemId: 'mat_hardwood', name: '경목', count: 8 }, { itemId: 'mat_iron_ingot', name: '철 주괴', count: 6 }, { itemId: 'MAT_GEAR_FRAGMENT', name: '톱니 파편', count: 3 }], requiredLevel: 30, craftTime: 60, successRate: 0.85 },
  },
  {
    id: 'FURN_SP_JUKEBOX', name: '에테르 주크박스', category: 'special', rarity: 'rare',
    description: '배경 음악을 선택할 수 있는 주크박스.',
    effect: { type: 'bgm_select', value: 1 },
    recipe: { materials: [{ itemId: 'MAT_GEAR_FRAGMENT', name: '톱니 파편', count: 6 }, { itemId: 'MAT_AETHER_CRYSTAL', name: '에테르 수정', count: 3 }, { itemId: 'mat_hardwood', name: '경목', count: 5 }], requiredLevel: 35, craftTime: 80, successRate: 0.75 },
  },
  {
    id: 'FURN_SP_TELEPORTER', name: '미니 순간이동 장치', category: 'special', rarity: 'rare',
    description: '집에서 도시로 순간이동할 수 있는 장치.',
    effect: { type: 'teleport_home', value: 1 },
    recipe: { materials: [{ itemId: 'MAT_AETHER_CORE', name: '에테르 코어', count: 2 }, { itemId: 'MAT_TIME_SHARD', name: '시간 파편', count: 3 }, { itemId: 'MAT_POWER_CORE', name: '동력 코어', count: 1 }], requiredLevel: 50, craftTime: 120, successRate: 0.65 },
  },
  {
    id: 'FURN_SP_MEMORY_CRYSTAL', name: '기억 수정 오르골', category: 'special', rarity: 'legendary',
    description: '과거의 기억을 재생하는 전설의 오르골. 안개해에서만 구할 수 있는 소재로 제작.',
    effect: { type: 'cutscene_replay', value: 1 },
    recipe: { materials: [{ itemId: 'MAT_OBLIVION_ESSENCE', name: '망각의 에센스', count: 5 }, { itemId: 'MAT_LETHE_SHARD', name: '레테 파편', count: 3 }, { itemId: 'MAT_SEAL_FRAGMENT', name: '봉인 파편', count: 5 }, { itemId: 'MAT_NEBULOS_HEART', name: '네뷸로스 심장', count: 1 }], requiredLevel: 80, craftTime: 300, successRate: 0.4 },
  },
];

// ─── 전체 가구 배열 ─────────────────────────────────────────────

const ALL_FURNITURE: FurnitureSeed[] = [
  ...tables,        // 6
  ...chairs,        // 5
  ...lights,        // 6
  ...decorations,   // 8
  ...storages,      // 4
  ...beds,          // 4
  ...rugs,          // 4
  ...wallItems,     // 5
  ...outdoor,       // 4
  ...special,       // 4
];                  // 총 50

// ─── 시드 함수 ──────────────────────────────────────────────────

export async function seedFurnitureRecipes(): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const f of ALL_FURNITURE) {
    // Recipe 모델에 가구 레시피 등록 (기존 제작 시스템 통합)
    const existingRecipe = await prisma.recipe.findFirst({
      where: { resultItemId: f.id },
    });

    const recipeData = {
      name: f.name,
      description: f.description,
      category: 'furniture',
      resultItemId: f.id,
      resultCount: 1,
      materials: f.recipe.materials,
      requiredLevel: f.recipe.requiredLevel,
      craftTime: f.recipe.craftTime,
      successRate: f.recipe.successRate,
    };

    if (existingRecipe) {
      await prisma.recipe.update({
        where: { id: existingRecipe.id },
        data: recipeData,
      });
      updated++;
    } else {
      await prisma.recipe.create({ data: recipeData });
      created++;
    }
  }

  return { created, updated };
}

/** 가구 시드 데이터 배열 (외부 참조용) */
export function getAllFurnitureSeeds(): FurnitureSeed[] {
  return ALL_FURNITURE;
}
