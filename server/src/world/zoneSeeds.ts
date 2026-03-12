/**
 * zoneSeeds.ts — 30개 존 시드 데이터 (P5-04)
 *
 * 7개 지역 × 4~5존 = 30존
 * 마을(hub) + 필드 + 던전 입구 혼합 구성
 */
import { prisma } from '../db';

// ─── 존 시드 타입 ───────────────────────────────────────────────

interface ZoneSeed {
  code: string;
  name: string;
  description: string;
  region: string;
  levelRange: { min: number; max: number };
  connections: string[];  // 인접 존 코드
  npcs: { npcId: string; name: string; posX: number; posY: number; role: string }[];
  ambientSound?: string;
  bgm?: string;
  isHub: boolean;
}

// ─── 시드 데이터 ────────────────────────────────────────────────

const ZONE_SEEDS: ZoneSeed[] = [
  // ═══ 아르겐티움 (수도) — Lv.1-15 ═════════════════════════════
  {
    code: 'argentium_plaza',
    name: '아르겐티움 중앙광장',
    description: '에테르나 대륙의 수도 아르겐티움. 모험자 길드와 상점이 밀집한 중심지.',
    region: 'argentium',
    levelRange: { min: 1, max: 15 },
    connections: ['argentium_market', 'argentium_sewer', 'argentium_tower'],
    npcs: [
      { npcId: 'npc_guild_master', name: '길드 마스터 카엘', posX: 100, posY: 200, role: 'quest' },
      { npcId: 'npc_weapon_shop', name: '대장장이 토르발', posX: 150, posY: 180, role: 'shop' },
      { npcId: 'npc_potion_shop', name: '연금술사 리나', posX: 200, posY: 190, role: 'shop' },
    ],
    ambientSound: 'city_crowd',
    bgm: 'argentium_theme',
    isHub: true,
  },
  {
    code: 'argentium_market',
    name: '아르겐티움 시장구역',
    description: '온갖 상인과 여행자가 드나드는 시장. 희귀 아이템이 거래된다.',
    region: 'argentium',
    levelRange: { min: 1, max: 10 },
    connections: ['argentium_plaza'],
    npcs: [
      { npcId: 'npc_auction', name: '경매인 마르코', posX: 80, posY: 120, role: 'shop' },
      { npcId: 'npc_info_broker', name: '정보상 실바', posX: 120, posY: 130, role: 'dialogue' },
    ],
    ambientSound: 'market_bustle',
    bgm: 'argentium_theme',
    isHub: true,
  },
  {
    code: 'argentium_sewer',
    name: '아르겐티움 하수도',
    description: '수도 지하에 뻗어 있는 거대한 하수도. 변이 생물이 출몰한다.',
    region: 'argentium',
    levelRange: { min: 3, max: 10 },
    connections: ['argentium_plaza'],
    npcs: [],
    ambientSound: 'dripping_water',
    bgm: 'dungeon_sewer',
    isHub: false,
  },
  {
    code: 'argentium_tower',
    name: '황금탑 외곽',
    description: '아르겐티움을 수호하는 고대 황금탑의 외곽 지대. 강력한 골렘이 지키고 있다.',
    region: 'argentium',
    levelRange: { min: 10, max: 15 },
    connections: ['argentium_plaza', 'silvanhome_entrance'],
    npcs: [
      { npcId: 'npc_tower_guard', name: '탑 수호대장 아르테스', posX: 50, posY: 300, role: 'quest' },
    ],
    ambientSound: 'wind_tower',
    bgm: 'golden_tower',
    isHub: false,
  },

  // ═══ 실반헤임 (엘프 숲) — Lv.10-30 ═══════════════════════════
  {
    code: 'silvanhome_entrance',
    name: '기억의 숲 입구',
    description: '실반헤임으로 향하는 울창한 숲 입구. 엘프 경비대가 통행을 관리한다.',
    region: 'silvanhome',
    levelRange: { min: 10, max: 18 },
    connections: ['argentium_tower', 'silvanhome_ancient', 'silvanhome_mist'],
    npcs: [
      { npcId: 'npc_elf_guard', name: '엘프 경비대장 세라핀', posX: 30, posY: 100, role: 'quest' },
      { npcId: 'npc_healer', name: '숲의 치유사 에밀리아', posX: 60, posY: 110, role: 'shop' },
    ],
    ambientSound: 'forest_birds',
    bgm: 'silvanhome_theme',
    isHub: true,
  },
  {
    code: 'silvanhome_ancient',
    name: '고대 나무',
    description: '수천 년 된 세계수의 후예가 서있는 성지. 에테르 에너지가 충만하다.',
    region: 'silvanhome',
    levelRange: { min: 12, max: 22 },
    connections: ['silvanhome_entrance', 'silvanhome_sanctum'],
    npcs: [
      { npcId: 'npc_druid', name: '드루이드 장로 오크론', posX: 200, posY: 250, role: 'quest' },
    ],
    ambientSound: 'ancient_hum',
    bgm: 'ancient_tree',
    isHub: false,
  },
  {
    code: 'silvanhome_mist',
    name: '안개 습지',
    description: '짙은 안개에 덮인 습지대. 부패한 정령이 출몰해 위험하다.',
    region: 'silvanhome',
    levelRange: { min: 15, max: 25 },
    connections: ['silvanhome_entrance', 'silvanhome_crystal'],
    npcs: [],
    ambientSound: 'swamp_fog',
    bgm: 'mist_swamp',
    isHub: false,
  },
  {
    code: 'silvanhome_sanctum',
    name: '엘프 성소',
    description: '엘프 왕가의 비밀 성소. 고대 마법이 봉인되어 있다.',
    region: 'silvanhome',
    levelRange: { min: 20, max: 28 },
    connections: ['silvanhome_ancient'],
    npcs: [
      { npcId: 'npc_elf_queen', name: '엘프 여왕 아리안나', posX: 150, posY: 300, role: 'dialogue' },
    ],
    ambientSound: 'holy_chime',
    bgm: 'elf_sanctum',
    isHub: false,
  },
  {
    code: 'silvanhome_crystal',
    name: '수정 동굴',
    description: '에테르 결정이 자연 생성되는 동굴. 결정 에너지에 끌린 몬스터가 서식한다.',
    region: 'silvanhome',
    levelRange: { min: 18, max: 30 },
    connections: ['silvanhome_mist'],
    npcs: [],
    ambientSound: 'crystal_resonance',
    bgm: 'crystal_cave',
    isHub: false,
  },

  // ═══ 에레보스 (유령도시) — Lv.25-45 ═══════════════════════════
  {
    code: 'erebos_outskirts',
    name: '유령 도시 외곽',
    description: '한때 번성했던 에레보스의 외곽. 폐허 사이로 그림자가 어른거린다.',
    region: 'erebos',
    levelRange: { min: 25, max: 33 },
    connections: ['silvanhome_crystal', 'erebos_center', 'britallia_port'],
    npcs: [
      { npcId: 'npc_ghost_merchant', name: '유령 상인 고르디', posX: 80, posY: 60, role: 'shop' },
    ],
    ambientSound: 'ghost_wind',
    bgm: 'erebos_theme',
    isHub: true,
  },
  {
    code: 'erebos_center',
    name: '폐허 중심',
    description: '에레보스의 중심부. 시간이 멈춘 듯한 건물 사이로 언데드가 배회한다.',
    region: 'erebos',
    levelRange: { min: 28, max: 38 },
    connections: ['erebos_outskirts', 'erebos_cathedral', 'erebos_catacomb'],
    npcs: [],
    ambientSound: 'ruins_echo',
    bgm: 'ruins_center',
    isHub: false,
  },
  {
    code: 'erebos_cathedral',
    name: '망각의 성당',
    description: '잊혀진 신에게 바쳐졌던 거대 성당. 강력한 망령이 깃들어 있다.',
    region: 'erebos',
    levelRange: { min: 30, max: 40 },
    connections: ['erebos_center'],
    npcs: [],
    ambientSound: 'cathedral_organ',
    bgm: 'forgotten_cathedral',
    isHub: false,
  },
  {
    code: 'erebos_catacomb',
    name: '지하 카타콤',
    description: '에레보스 지하에 펼쳐진 광대한 묘지. 리치의 기운이 감돈다.',
    region: 'erebos',
    levelRange: { min: 35, max: 45 },
    connections: ['erebos_center'],
    npcs: [],
    ambientSound: 'catacomb_drip',
    bgm: 'catacomb_dark',
    isHub: false,
  },

  // ═══ 솔라리스 사막 — Lv.35-55 ════════════════════════════════
  {
    code: 'solaris_oasis',
    name: '솔라리스 오아시스',
    description: '사막 한가운데 자리한 오아시스 마을. 대상인과 용병이 모인다.',
    region: 'solaris',
    levelRange: { min: 35, max: 45 },
    connections: ['erebos_catacomb', 'solaris_storm', 'solaris_mine', 'solaris_temple'],
    npcs: [
      { npcId: 'npc_desert_chief', name: '오아시스 촌장 하산', posX: 100, posY: 100, role: 'quest' },
      { npcId: 'npc_camel_trader', name: '낙타 상인 알리', posX: 130, posY: 90, role: 'shop' },
    ],
    ambientSound: 'oasis_water',
    bgm: 'solaris_theme',
    isHub: true,
  },
  {
    code: 'solaris_storm',
    name: '모래폭풍 지대',
    description: '끝없는 모래폭풍이 몰아치는 위험 지대. 시야가 극히 제한된다.',
    region: 'solaris',
    levelRange: { min: 38, max: 48 },
    connections: ['solaris_oasis'],
    npcs: [],
    ambientSound: 'sandstorm',
    bgm: 'storm_desert',
    isHub: false,
  },
  {
    code: 'solaris_mine',
    name: '에테르 광산',
    description: '사막 지하에 발견된 대규모 에테르 광맥. 광산 벌레가 위협한다.',
    region: 'solaris',
    levelRange: { min: 40, max: 50 },
    connections: ['solaris_oasis'],
    npcs: [],
    ambientSound: 'mine_drill',
    bgm: 'aether_mine',
    isHub: false,
  },
  {
    code: 'solaris_temple',
    name: '고대 사원',
    description: '태양신을 모시던 잊혀진 사원. 봉인이 풀리며 화신이 깨어나고 있다.',
    region: 'solaris',
    levelRange: { min: 45, max: 55 },
    connections: ['solaris_oasis', 'northland_village'],
    npcs: [],
    ambientSound: 'temple_chant',
    bgm: 'ancient_temple',
    isHub: false,
  },

  // ═══ 북방 영원빙원 — Lv.50-70 ════════════════════════════════
  {
    code: 'northland_village',
    name: '빙하 마을',
    description: '극한의 추위 속에서 살아가는 강인한 북방인의 마을.',
    region: 'northland',
    levelRange: { min: 50, max: 58 },
    connections: ['solaris_temple', 'northland_cave', 'northland_peak', 'northland_lake'],
    npcs: [
      { npcId: 'npc_north_elder', name: '장로 프레야', posX: 70, posY: 200, role: 'quest' },
      { npcId: 'npc_fur_trader', name: '모피 상인 울프', posX: 100, posY: 210, role: 'shop' },
    ],
    ambientSound: 'blizzard_soft',
    bgm: 'northland_theme',
    isHub: true,
  },
  {
    code: 'northland_cave',
    name: '얼음 동굴',
    description: '빙하 아래 형성된 거대 동굴. 프로스트 드레이크가 둥지를 틀었다.',
    region: 'northland',
    levelRange: { min: 55, max: 63 },
    connections: ['northland_village'],
    npcs: [],
    ambientSound: 'ice_crack',
    bgm: 'ice_cave',
    isHub: false,
  },
  {
    code: 'northland_peak',
    name: '결정 봉우리',
    description: '에테르 빙정이 결정화된 봉우리. 강력한 빙룡의 기운이 느껴진다.',
    region: 'northland',
    levelRange: { min: 60, max: 68 },
    connections: ['northland_village'],
    npcs: [],
    ambientSound: 'peak_wind',
    bgm: 'crystal_peak',
    isHub: false,
  },
  {
    code: 'northland_lake',
    name: '에테르 빙정 호수',
    description: '순수 에테르가 얼어붙어 형성된 신비로운 호수. 정제된 에테르를 채취할 수 있다.',
    region: 'northland',
    levelRange: { min: 58, max: 70 },
    connections: ['northland_village', 'oblivion_plateau'],
    npcs: [
      { npcId: 'npc_ice_hermit', name: '빙정 은자 글래셜', posX: 150, posY: 280, role: 'craft' },
    ],
    ambientSound: 'frozen_lake',
    bgm: 'aether_lake',
    isHub: false,
  },

  // ═══ 브리탈리아 자유항 — Lv.15-40 ════════════════════════════
  {
    code: 'britallia_port',
    name: '브리탈리아 항구',
    description: '법 밖의 자유 항구. 무법자와 상인이 공존하는 혼돈의 땅.',
    region: 'britallia',
    levelRange: { min: 15, max: 25 },
    connections: ['erebos_outskirts', 'britallia_blackmarket', 'britallia_pirate', 'britallia_arena'],
    npcs: [
      { npcId: 'npc_harbor_master', name: '항구장 벡', posX: 50, posY: 50, role: 'quest' },
      { npcId: 'npc_smuggler', name: '밀수꾼 자비에르', posX: 90, posY: 40, role: 'shop' },
    ],
    ambientSound: 'harbor_seagull',
    bgm: 'britallia_theme',
    isHub: true,
  },
  {
    code: 'britallia_blackmarket',
    name: '브리탈리아 암시장',
    description: '항구 지하에 숨겨진 암거래 시장. 금지된 물품이 거래된다.',
    region: 'britallia',
    levelRange: { min: 18, max: 30 },
    connections: ['britallia_port'],
    npcs: [
      { npcId: 'npc_fence', name: '장물아비 노아', posX: 60, posY: 70, role: 'shop' },
    ],
    ambientSound: 'underground_whisper',
    bgm: 'black_market',
    isHub: false,
  },
  {
    code: 'britallia_pirate',
    name: '해적 소굴',
    description: '해안 동굴에 은신한 해적 본거지. 보물이 숨겨져 있다는 소문.',
    region: 'britallia',
    levelRange: { min: 20, max: 35 },
    connections: ['britallia_port'],
    npcs: [],
    ambientSound: 'cave_waves',
    bgm: 'pirate_lair',
    isHub: false,
  },
  {
    code: 'britallia_arena',
    name: '지하 투기장',
    description: '불법 격투 대회가 열리는 지하 경기장. 강자만이 살아남는다.',
    region: 'britallia',
    levelRange: { min: 25, max: 40 },
    connections: ['britallia_port'],
    npcs: [
      { npcId: 'npc_arena_broker', name: '투기장 브로커 레온', posX: 100, posY: 150, role: 'quest' },
    ],
    ambientSound: 'crowd_cheer',
    bgm: 'arena_battle',
    isHub: false,
  },

  // ═══ 망각의 고원 (최종 지역) — Lv.70-80 ═══════════════════════
  {
    code: 'oblivion_plateau',
    name: '망각의 고원',
    description: '시간이 왜곡된 최종 지역. 에테르 에너지가 극한으로 집중되어 있다.',
    region: 'oblivion_plateau',
    levelRange: { min: 70, max: 75 },
    connections: ['northland_lake', 'oblivion_rift', 'oblivion_sanctum'],
    npcs: [
      { npcId: 'npc_time_keeper', name: '시간의 수호자 크로노스', posX: 200, posY: 300, role: 'quest' },
    ],
    ambientSound: 'time_distortion',
    bgm: 'oblivion_theme',
    isHub: true,
  },
  {
    code: 'oblivion_rift',
    name: '시간 균열',
    description: '시공간이 찢어진 균열 지대. 과거와 미래가 뒤섞여 있다.',
    region: 'oblivion_plateau',
    levelRange: { min: 72, max: 78 },
    connections: ['oblivion_plateau'],
    npcs: [],
    ambientSound: 'rift_echo',
    bgm: 'time_rift',
    isHub: false,
  },
  {
    code: 'oblivion_sanctum',
    name: '에테르 성역',
    description: '에테르의 근원에 가장 가까운 성역. 최종 보스가 기다린다.',
    region: 'oblivion_plateau',
    levelRange: { min: 75, max: 80 },
    connections: ['oblivion_plateau'],
    npcs: [],
    ambientSound: 'aether_pulse',
    bgm: 'final_sanctum',
    isHub: false,
  },
];

// ═══════════════════════════════════════════════════════════════
// P8-03 무한 안개해 — 5개 존 추가
// ═══════════════════════════════════════════════════════════════

const mistSeaZones: ZoneSeed[] = [
  {
    code: 'mist_sea_outskirts',
    name: '안개해 외곽',
    description: '무한 안개해의 입구. 옅은 안개가 감싸지만 아직 시야 확보 가능. 초보 안개 몬스터가 서식.',
    region: 'mist_sea',
    levelRange: { min: 60, max: 65 },
    connections: ['britallia_harbor', 'mist_sea_lighthouse'],
    npcs: [
      { npcId: 'npc_mist_harbor_master', name: '안개항 항장 이사벨', posX: 100, posY: 150, role: 'quest' },
      { npcId: 'npc_mist_supplier', name: '보급상 헤르만', posX: 140, posY: 160, role: 'shop' },
      { npcId: 'npc_mist_navigator', name: '항해사 리오', posX: 80, posY: 140, role: 'dialogue' },
    ],
    ambientSound: 'ocean_mist',
    bgm: 'mist_sea_calm',
    isHub: true,
  },
  {
    code: 'mist_sea_lighthouse',
    name: '기억의 등대',
    description: '봉인자 메모리아가 세운 에테르 등대. 안개 속 유일한 이정표. 지하에 봉인 균열이 존재.',
    region: 'mist_sea',
    levelRange: { min: 65, max: 70 },
    connections: ['mist_sea_outskirts', 'mist_sea_archipelago'],
    npcs: [
      { npcId: 'npc_lighthouse_keeper', name: '등대지기 에밀리아', posX: 200, posY: 200, role: 'quest' },
      { npcId: 'npc_memory_scholar', name: '기억 학자 노엘', posX: 220, posY: 180, role: 'dialogue' },
    ],
    ambientSound: 'lighthouse_wind',
    bgm: 'mist_sea_mystery',
    isHub: false,
  },
  {
    code: 'mist_sea_archipelago',
    name: '표류자의 군도',
    description: '수백 년간 안개에 갇힌 난파선과 잔해가 밀집한 군도. 유령선 이벤트가 발생.',
    region: 'mist_sea',
    levelRange: { min: 70, max: 75 },
    connections: ['mist_sea_lighthouse', 'mist_sea_spire'],
    npcs: [
      { npcId: 'npc_ghost_captain', name: '유령 선장 바르도', posX: 150, posY: 100, role: 'quest' },
      { npcId: 'npc_treasure_hunter', name: '보물 사냥꾼 카이라', posX: 180, posY: 120, role: 'shop' },
    ],
    ambientSound: 'shipwreck_creak',
    bgm: 'mist_sea_eerie',
    isHub: false,
  },
  {
    code: 'mist_sea_spire',
    name: '봉인의 첨탑',
    description: '12인의 봉인 중 핵심 봉인 3개가 집중된 거대 첨탑. 봉인자 후손 마을과 수련장이 있다.',
    region: 'mist_sea',
    levelRange: { min: 75, max: 80 },
    connections: ['mist_sea_archipelago', 'mist_sea_abyss'],
    npcs: [
      { npcId: 'npc_lumina', name: '장로 루미나', posX: 200, posY: 250, role: 'quest' },
      { npcId: 'npc_seal_guardian', name: '봉인 수호자 칼렌', posX: 230, posY: 240, role: 'dialogue' },
      { npcId: 'npc_seal_smith', name: '봉인 대장장이 오르가', posX: 170, posY: 230, role: 'shop' },
    ],
    ambientSound: 'seal_resonance',
    bgm: 'mist_sea_spire_theme',
    isHub: true,
  },
  {
    code: 'mist_sea_abyss',
    name: '심연의 해구',
    description: '안개해 최심부. 레테의 잔류 의식이 봉인된 핵심 지역. 12인 레이드 전용.',
    region: 'mist_sea',
    levelRange: { min: 80, max: 80 },
    connections: ['mist_sea_spire'],
    npcs: [],
    ambientSound: 'abyss_rumble',
    bgm: 'mist_sea_abyss_theme',
    isHub: false,
  },
];

// 기존 시드에 안개해 존 병합
ZONE_SEEDS.push(...mistSeaZones);

// ═══ 기억의 심연 (P11-02) — Lv.60-80 ═════════════════════════
const abyssOfMemoryZones: ZoneSeed[] = [
  {
    code: 'abyss_gate',
    name: '심연 입구',
    description: '안개해 해저로 내려가는 거대한 문. 잠수 장비 NPC와 보급 상인이 위치한다.',
    region: 'abyss_of_memory',
    levelRange: { min: 60, max: 65 },
    connections: ['foggy_sea_depths', 'abyss_sunken_streets'],
    npcs: [
      { npcId: 'npc_dive_tech', name: '잠수 기술자 네모', posX: 100, posY: 150, role: 'shop' },
      { npcId: 'npc_abyss_merchant', name: '심해 상인 무렐', posX: 160, posY: 140, role: 'shop' },
      { npcId: 'npc_expedition_leader', name: '탐사대장 한나', posX: 80, posY: 180, role: 'quest' },
    ],
    ambientSound: 'deep_sea_ambient',
    bgm: 'abyss_gate_theme',
    isHub: true,
  },
  {
    code: 'abyss_sunken_streets',
    name: '침몰 시가지',
    description: '에테르니아의 주거/상업 구역 잔해. 무너진 건물 사이로 심해 몬스터가 서식한다.',
    region: 'abyss_of_memory',
    levelRange: { min: 63, max: 70 },
    connections: ['abyss_gate', 'abyss_library', 'abyss_trial_hall'],
    npcs: [
      { npcId: 'npc_abyss_scholar', name: '해저 학자 파비안', posX: 200, posY: 120, role: 'dialogue' },
    ],
    ambientSound: 'sunken_ruins',
    bgm: 'sunken_city_theme',
    isHub: false,
  },
  {
    code: 'abyss_library',
    name: '에테르니아 대서고',
    description: '고대 마법 지식이 저장된 수중 서고. 봉인 12인의 기록이 남아 있다.',
    region: 'abyss_of_memory',
    levelRange: { min: 65, max: 72 },
    connections: ['abyss_sunken_streets'],
    npcs: [
      { npcId: 'npc_ghost_librarian', name: '유령 사서 엘도라', posX: 150, posY: 100, role: 'quest' },
    ],
    ambientSound: 'underwater_library',
    bgm: 'library_theme',
    isHub: false,
  },
  {
    code: 'abyss_trial_hall',
    name: '시련의 전당',
    description: '봉인 12인이 후계자를 시험하기 위해 만든 공간. 시간 수호자 클래스 해금 장소.',
    region: 'abyss_of_memory',
    levelRange: { min: 68, max: 75 },
    connections: ['abyss_sunken_streets', 'abyss_core'],
    npcs: [
      { npcId: 'npc_time_spirit', name: '시간 수호자 정령', posX: 200, posY: 200, role: 'quest' },
    ],
    ambientSound: 'mystical_hall',
    bgm: 'trial_hall_theme',
    isHub: false,
  },
  {
    code: 'abyss_core',
    name: '심연의 핵심',
    description: '레테의 마지막 파편이 봉인된 최심부. 시간 균열이 열리는 장소.',
    region: 'abyss_of_memory',
    levelRange: { min: 75, max: 80 },
    connections: ['abyss_trial_hall'],
    npcs: [],
    ambientSound: 'void_pulse',
    bgm: 'abyss_core_theme',
    isHub: false,
  },
];

// 기억의 심연 존 병합
ZONE_SEEDS.push(...abyssOfMemoryZones);

// ─── 시드 함수 ──────────────────────────────────────────────────

export async function seedZones(): Promise<void> {
  console.log('[Seed] 존 시드 시작...');

  let created = 0;
  for (const seed of ZONE_SEEDS) {
    const existing = await prisma.zone.findUnique({ where: { code: seed.code } });
    if (existing) continue;

    await prisma.zone.create({
      data: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        region: seed.region,
        levelRange: seed.levelRange,
        connections: seed.connections,
        npcs: seed.npcs,
        ambientSound: seed.ambientSound ?? null,
        bgm: seed.bgm ?? null,
        isHub: seed.isHub,
      },
    });
    created++;
  }

  console.log(`[Seed] 존 시드 완료 — ${created}개 생성 (총 ${ZONE_SEEDS.length}개 정의)`);
}
