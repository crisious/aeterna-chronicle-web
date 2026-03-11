/**
 * dungeonSeeds.ts — 20개 던전 시드 데이터 (P5-03)
 *
 * 지역당 3~4개, 난이도 3단계 (normal / hard / nightmare)
 * 웨이브 구성: 일반 3~5웨이브 + 보스 1웨이브
 */
import { prisma } from '../db';

// ─── 던전 시드 ──────────────────────────────────────────────────

interface DungeonSeed {
  code: string;
  name: string;
  description: string;
  zoneCode: string;     // zoneSeeds의 zone code 참조
  difficulty: string;
  requiredLevel: number;
  maxPlayers: number;
  waves: { wave: number; monsters: { monsterId: string; count: number }[]; isBoss: boolean }[];
  rewards: { gold: number; exp: number; items: { itemId: string; rate: number; count: number }[] };
  timeLimit: number;
  entryCount: number;
}

const DUNGEON_SEEDS: DungeonSeed[] = [
  // ═══ 아르겐티움 (Lv.1-15) ═══════════════════════════════════
  {
    code: 'dg_argentium_sewer_n',
    name: '하수도 미궁 (일반)',
    description: '아르겐티움 지하 하수도에 서식하는 변이 쥐떼와 슬라임 보스를 처치하라.',
    zoneCode: 'argentium_sewer',
    difficulty: 'normal',
    requiredLevel: 5,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_sewer_rat', count: 5 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_sewer_rat', count: 4 }, { monsterId: 'mob_toxic_slime', count: 2 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_toxic_slime', count: 6 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_sewer_king', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 500, exp: 1200, items: [{ itemId: 'item_sewer_key', rate: 0.3, count: 1 }] },
    timeLimit: 600,
    entryCount: 3,
  },
  {
    code: 'dg_argentium_sewer_h',
    name: '하수도 미궁 (하드)',
    description: '강화된 변이체가 출몰하는 하수도. 독 면역 장비 권장.',
    zoneCode: 'argentium_sewer',
    difficulty: 'hard',
    requiredLevel: 10,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_sewer_rat', count: 8 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_toxic_slime', count: 6 }, { monsterId: 'mob_plague_rat', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_plague_rat', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'mob_toxic_slime', count: 4 }], isBoss: false },
      { wave: 5, monsters: [{ monsterId: 'boss_sewer_king', count: 1 }, { monsterId: 'mob_toxic_slime', count: 2 }], isBoss: true },
    ],
    rewards: { gold: 1200, exp: 3000, items: [{ itemId: 'item_sewer_key', rate: 0.5, count: 1 }, { itemId: 'item_poison_ring', rate: 0.15, count: 1 }] },
    timeLimit: 900,
    entryCount: 2,
  },
  {
    code: 'dg_argentium_tower_n',
    name: '황금탑 외곽 시련 (일반)',
    description: '황금탑 외곽을 지키는 골렘과 기사단 잔재를 돌파하라.',
    zoneCode: 'argentium_tower',
    difficulty: 'normal',
    requiredLevel: 12,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_tower_guard', count: 4 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_tower_guard', count: 3 }, { monsterId: 'mob_stone_golem', count: 2 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_stone_golem', count: 4 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_golden_sentinel', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 800, exp: 2000, items: [{ itemId: 'item_golden_shard', rate: 0.25, count: 1 }] },
    timeLimit: 600,
    entryCount: 3,
  },

  // ═══ 실반헤임 (Lv.10-30) ═════════════════════════════════════
  {
    code: 'dg_silvanhome_mist_n',
    name: '안개 습지 정화 (일반)',
    description: '안개 습지에 퍼진 부패 정령을 소탕하고 수호석을 회수하라.',
    zoneCode: 'silvanhome_mist',
    difficulty: 'normal',
    requiredLevel: 15,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_corrupt_sprite', count: 6 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_swamp_treant', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_corrupt_sprite', count: 4 }, { monsterId: 'mob_swamp_treant', count: 2 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_mist_wraith', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 1000, exp: 2500, items: [{ itemId: 'item_guardian_stone', rate: 0.2, count: 1 }] },
    timeLimit: 600,
    entryCount: 3,
  },
  {
    code: 'dg_silvanhome_crystal_n',
    name: '수정 동굴 탐사 (일반)',
    description: '에테르 결정이 자라는 동굴 깊은 곳의 결정 골렘을 격파하라.',
    zoneCode: 'silvanhome_crystal',
    difficulty: 'normal',
    requiredLevel: 20,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_crystal_bat', count: 8 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_crystal_spider', count: 5 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_crystal_golem', count: 3 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_crystal_titan', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 1500, exp: 3500, items: [{ itemId: 'item_aether_crystal', rate: 0.3, count: 2 }] },
    timeLimit: 600,
    entryCount: 3,
  },
  {
    code: 'dg_silvanhome_crystal_h',
    name: '수정 동굴 탐사 (하드)',
    description: '결정 에너지가 폭주한 동굴. 타이탄이 2차 형태로 변이한다.',
    zoneCode: 'silvanhome_crystal',
    difficulty: 'hard',
    requiredLevel: 25,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_crystal_spider', count: 6 }, { monsterId: 'mob_crystal_bat', count: 4 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_crystal_golem', count: 5 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_crystal_golem', count: 3 }, { monsterId: 'mob_crystal_spider', count: 4 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_crystal_titan', count: 1 }, { monsterId: 'mob_crystal_golem', count: 2 }], isBoss: true },
    ],
    rewards: { gold: 3000, exp: 7000, items: [{ itemId: 'item_aether_crystal', rate: 0.5, count: 3 }, { itemId: 'item_crystal_heart', rate: 0.1, count: 1 }] },
    timeLimit: 900,
    entryCount: 2,
  },

  // ═══ 에레보스 (Lv.25-45) ═════════════════════════════════════
  {
    code: 'dg_erebos_cathedral_n',
    name: '망각의 성당 (일반)',
    description: '잊혀진 성당에 깃든 망령들을 퇴마하고 성물을 회수하라.',
    zoneCode: 'erebos_cathedral',
    difficulty: 'normal',
    requiredLevel: 30,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_wraith', count: 6 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_wraith', count: 4 }, { monsterId: 'mob_banshee', count: 2 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_banshee', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_forgotten_bishop', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 2000, exp: 5000, items: [{ itemId: 'item_holy_relic', rate: 0.2, count: 1 }] },
    timeLimit: 600,
    entryCount: 3,
  },
  {
    code: 'dg_erebos_catacomb_n',
    name: '지하 카타콤 (일반)',
    description: '카타콤 최심부에서 깨어난 리치를 처치하라.',
    zoneCode: 'erebos_catacomb',
    difficulty: 'normal',
    requiredLevel: 35,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_skeleton', count: 8 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_skeleton', count: 4 }, { monsterId: 'mob_bone_knight', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_bone_knight', count: 4 }, { monsterId: 'mob_necromancer', count: 2 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'mob_necromancer', count: 3 }], isBoss: false },
      { wave: 5, monsters: [{ monsterId: 'boss_catacomb_lich', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 2500, exp: 6000, items: [{ itemId: 'item_lich_phylactery', rate: 0.15, count: 1 }] },
    timeLimit: 720,
    entryCount: 3,
  },
  {
    code: 'dg_erebos_catacomb_nm',
    name: '지하 카타콤 (나이트메어)',
    description: '리치가 완전체로 부활했다. 4인 파티 필수, 암속성 저항 권장.',
    zoneCode: 'erebos_catacomb',
    difficulty: 'nightmare',
    requiredLevel: 42,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_bone_knight', count: 8 }, { monsterId: 'mob_necromancer', count: 4 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_necromancer', count: 6 }, { monsterId: 'mob_shadow_wraith', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_shadow_wraith', count: 6 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'mob_bone_knight', count: 4 }, { monsterId: 'mob_shadow_wraith', count: 4 }], isBoss: false },
      { wave: 5, monsters: [{ monsterId: 'boss_catacomb_lich', count: 1 }, { monsterId: 'mob_necromancer', count: 3 }], isBoss: true },
    ],
    rewards: { gold: 6000, exp: 15000, items: [{ itemId: 'item_lich_phylactery', rate: 0.4, count: 1 }, { itemId: 'item_dark_essence', rate: 0.2, count: 2 }] },
    timeLimit: 1200,
    entryCount: 1,
  },

  // ═══ 솔라리스 사막 (Lv.35-55) ════════════════════════════════
  {
    code: 'dg_solaris_mine_n',
    name: '에테르 광산 (일반)',
    description: '에테르 광맥을 둘러싼 광산 벌레와 보스 드릴웜을 처치하라.',
    zoneCode: 'solaris_mine',
    difficulty: 'normal',
    requiredLevel: 40,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_mine_beetle', count: 6 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_mine_beetle', count: 4 }, { monsterId: 'mob_sand_wyrm', count: 2 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_sand_wyrm', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_drillworm', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 3000, exp: 7500, items: [{ itemId: 'item_aether_ore', rate: 0.35, count: 3 }] },
    timeLimit: 600,
    entryCount: 3,
  },
  {
    code: 'dg_solaris_temple_n',
    name: '고대 사원 (일반)',
    description: '사막 깊은 곳의 고대 사원에 봉인된 태양신의 화신과 맞서라.',
    zoneCode: 'solaris_temple',
    difficulty: 'normal',
    requiredLevel: 45,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_sand_elemental', count: 5 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_sand_elemental', count: 3 }, { monsterId: 'mob_temple_guardian', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_temple_guardian', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_sun_avatar', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 3500, exp: 9000, items: [{ itemId: 'item_sun_fragment', rate: 0.2, count: 1 }] },
    timeLimit: 720,
    entryCount: 3,
  },
  {
    code: 'dg_solaris_temple_h',
    name: '고대 사원 (하드)',
    description: '태양신의 진정한 힘이 깨어났다. 화속성 저항 필수.',
    zoneCode: 'solaris_temple',
    difficulty: 'hard',
    requiredLevel: 50,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_temple_guardian', count: 6 }, { monsterId: 'mob_fire_spirit', count: 3 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_fire_spirit', count: 6 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_temple_guardian', count: 4 }, { monsterId: 'mob_fire_spirit', count: 4 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_sun_avatar', count: 1 }, { monsterId: 'mob_fire_spirit', count: 2 }], isBoss: true },
    ],
    rewards: { gold: 7000, exp: 18000, items: [{ itemId: 'item_sun_fragment', rate: 0.4, count: 2 }, { itemId: 'item_inferno_core', rate: 0.1, count: 1 }] },
    timeLimit: 900,
    entryCount: 2,
  },

  // ═══ 북방 영원빙원 (Lv.50-70) ════════════════════════════════
  {
    code: 'dg_northland_cave_n',
    name: '얼음 동굴 (일반)',
    description: '영원빙원의 얼음 동굴 깊이 서식하는 프로스트 드레이크를 토벌하라.',
    zoneCode: 'northland_cave',
    difficulty: 'normal',
    requiredLevel: 55,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_ice_wolf', count: 6 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_ice_wolf', count: 3 }, { monsterId: 'mob_frost_golem', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_frost_golem', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_frost_drake', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 4000, exp: 12000, items: [{ itemId: 'item_frost_scale', rate: 0.3, count: 2 }] },
    timeLimit: 720,
    entryCount: 3,
  },
  {
    code: 'dg_northland_peak_n',
    name: '결정 봉우리 (일반)',
    description: '에테르 빙정이 결정화된 봉우리 정상의 크리스탈 와이번을 격파하라.',
    zoneCode: 'northland_peak',
    difficulty: 'normal',
    requiredLevel: 60,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_frost_harpy', count: 5 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_frost_harpy', count: 3 }, { monsterId: 'mob_ice_elemental', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_ice_elemental', count: 6 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_crystal_wyvern', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 5000, exp: 15000, items: [{ itemId: 'item_wyvern_crest', rate: 0.2, count: 1 }] },
    timeLimit: 720,
    entryCount: 3,
  },
  {
    code: 'dg_northland_peak_nm',
    name: '결정 봉우리 (나이트메어)',
    description: '빙정 에너지가 폭주한 봉우리. 와이번이 빙룡으로 진화한다.',
    zoneCode: 'northland_peak',
    difficulty: 'nightmare',
    requiredLevel: 68,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_ice_elemental', count: 8 }, { monsterId: 'mob_frost_harpy', count: 4 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_frost_golem', count: 6 }, { monsterId: 'mob_ice_elemental', count: 4 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_frost_golem', count: 5 }, { monsterId: 'mob_frost_harpy', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'mob_ice_elemental', count: 6 }], isBoss: false },
      { wave: 5, monsters: [{ monsterId: 'boss_crystal_wyvern', count: 1 }, { monsterId: 'mob_frost_golem', count: 3 }], isBoss: true },
    ],
    rewards: { gold: 12000, exp: 35000, items: [{ itemId: 'item_wyvern_crest', rate: 0.5, count: 2 }, { itemId: 'item_ice_dragon_core', rate: 0.08, count: 1 }] },
    timeLimit: 1200,
    entryCount: 1,
  },

  // ═══ 브리탈리아 자유항 (Lv.15-40) ════════════════════════════
  {
    code: 'dg_britallia_pirate_n',
    name: '해적 소굴 (일반)',
    description: '브리탈리아 해안 동굴의 해적단을 소탕하라.',
    zoneCode: 'britallia_pirate',
    difficulty: 'normal',
    requiredLevel: 20,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_pirate_thug', count: 6 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_pirate_thug', count: 3 }, { monsterId: 'mob_pirate_gunner', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_pirate_gunner', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_pirate_captain', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 1200, exp: 3000, items: [{ itemId: 'item_pirate_map', rate: 0.25, count: 1 }] },
    timeLimit: 600,
    entryCount: 3,
  },
  {
    code: 'dg_britallia_arena_n',
    name: '지하 투기장 (일반)',
    description: '자유항 지하의 불법 투기장에서 챔피언을 꺾어라.',
    zoneCode: 'britallia_arena',
    difficulty: 'normal',
    requiredLevel: 30,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_arena_brawler', count: 4 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_arena_brawler', count: 3 }, { monsterId: 'mob_arena_mage', count: 2 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_arena_mage', count: 4 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'boss_arena_champion', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 2000, exp: 5500, items: [{ itemId: 'item_champion_belt', rate: 0.15, count: 1 }] },
    timeLimit: 600,
    entryCount: 3,
  },
  {
    code: 'dg_britallia_arena_h',
    name: '지하 투기장 (하드)',
    description: '챔피언이 금지된 에테르 강화를 사용한다. 즉사 기믹 주의.',
    zoneCode: 'britallia_arena',
    difficulty: 'hard',
    requiredLevel: 38,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_arena_brawler', count: 5 }, { monsterId: 'mob_arena_mage', count: 3 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_arena_mage', count: 6 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_arena_brawler', count: 4 }, { monsterId: 'mob_arena_assassin', count: 3 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'mob_arena_assassin', count: 4 }], isBoss: false },
      { wave: 5, monsters: [{ monsterId: 'boss_arena_champion', count: 1 }, { monsterId: 'mob_arena_assassin', count: 2 }], isBoss: true },
    ],
    rewards: { gold: 4500, exp: 12000, items: [{ itemId: 'item_champion_belt', rate: 0.3, count: 1 }, { itemId: 'item_arena_trophy', rate: 0.1, count: 1 }] },
    timeLimit: 900,
    entryCount: 2,
  },

  // ═══ 망각의 고원 (Lv.70-80) ══════════════════════════════════
  {
    code: 'dg_oblivion_rift_n',
    name: '시간 균열 (일반)',
    description: '망각의 고원에 열린 시간 균열에서 쏟아지는 시공 왜곡체를 막아라.',
    zoneCode: 'oblivion_plateau',
    difficulty: 'normal',
    requiredLevel: 72,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_time_phantom', count: 5 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_time_phantom', count: 3 }, { monsterId: 'mob_chrono_beast', count: 3 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_chrono_beast', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'mob_void_sentinel', count: 4 }], isBoss: false },
      { wave: 5, monsters: [{ monsterId: 'boss_rift_guardian', count: 1 }], isBoss: true },
    ],
    rewards: { gold: 8000, exp: 25000, items: [{ itemId: 'item_time_shard', rate: 0.3, count: 2 }] },
    timeLimit: 900,
    entryCount: 2,
  },
  {
    code: 'dg_oblivion_rift_nm',
    name: '시간 균열 (나이트메어)',
    description: '균열이 완전히 열렸다. 시공의 수호자가 최종 형태로 각성한다.',
    zoneCode: 'oblivion_plateau',
    difficulty: 'nightmare',
    requiredLevel: 78,
    maxPlayers: 4,
    waves: [
      { wave: 1, monsters: [{ monsterId: 'mob_chrono_beast', count: 8 }, { monsterId: 'mob_void_sentinel', count: 4 }], isBoss: false },
      { wave: 2, monsters: [{ monsterId: 'mob_void_sentinel', count: 6 }, { monsterId: 'mob_time_phantom', count: 4 }], isBoss: false },
      { wave: 3, monsters: [{ monsterId: 'mob_void_sentinel', count: 5 }, { monsterId: 'mob_chrono_beast', count: 5 }], isBoss: false },
      { wave: 4, monsters: [{ monsterId: 'mob_time_phantom', count: 6 }, { monsterId: 'mob_void_sentinel', count: 4 }], isBoss: false },
      { wave: 5, monsters: [{ monsterId: 'boss_rift_guardian', count: 1 }, { monsterId: 'mob_void_sentinel', count: 3 }], isBoss: true },
    ],
    rewards: { gold: 20000, exp: 60000, items: [{ itemId: 'item_time_shard', rate: 0.6, count: 3 }, { itemId: 'item_chrono_core', rate: 0.05, count: 1 }] },
    timeLimit: 1500,
    entryCount: 1,
  },
];

// ─── 시드 함수 ──────────────────────────────────────────────────

export async function seedDungeons(): Promise<void> {
  console.log('[Seed] 던전 시드 시작...');

  // 존 코드 → id 매핑 (zoneSeeds 에서 생성된 Zone 참조)
  const zones = await prisma.zone.findMany({ select: { id: true, code: true } });
  const zoneMap = new Map(zones.map((z) => [z.code, z.id]));

  let created = 0;
  for (const seed of DUNGEON_SEEDS) {
    const existing = await prisma.dungeon.findUnique({ where: { code: seed.code } });
    if (existing) continue;

    const zoneId = zoneMap.get(seed.zoneCode) ?? 'unknown';

    await prisma.dungeon.create({
      data: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        zoneId,
        difficulty: seed.difficulty,
        requiredLevel: seed.requiredLevel,
        maxPlayers: seed.maxPlayers,
        waves: seed.waves,
        rewards: seed.rewards,
        timeLimit: seed.timeLimit,
        entryCount: seed.entryCount,
      },
    });
    created++;
  }

  console.log(`[Seed] 던전 시드 완료 — ${created}개 생성 (총 ${DUNGEON_SEEDS.length}개 정의)`);
}
