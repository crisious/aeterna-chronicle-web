/**
 * 퀘스트 시드 데이터 — 60개 퀘스트
 * P4-06: 메인 15 + 서브 20 + 일일 15 + 주간 5 + 이벤트 5
 */
import { prisma } from '../db';

interface QuestSeedData {
  code: string;
  name: string;
  description: string;
  type: 'main' | 'sub' | 'daily' | 'weekly' | 'event';
  chapter?: number;
  requiredLevel: number;
  prerequisites: string[];
  objectives: Array<{ type: string; target: string; count: number; description: string }>;
  rewards: Array<{ type: string; itemId?: string; amount: number; description: string }>;
  npcId?: string;
  timeLimit?: number;
  isRepeatable: boolean;
}

// ════════════════════════════════════════════════════════════════
// 메인 퀘스트 (15) — 챕터 1~15
// ════════════════════════════════════════════════════════════════
const MAIN_QUESTS: QuestSeedData[] = [
  {
    code: 'MQ_CH01', name: '잃어버린 기억의 조각', description: '에리엔의 첫 번째 기억을 되찾기 위해 아르겐티움 외곽의 기억 파편을 수집한다.',
    type: 'main', chapter: 1, requiredLevel: 1, prerequisites: [], isRepeatable: false,
    objectives: [
      { type: 'collect', target: 'memory_shard_ch1', count: 3, description: '기억 파편 수집 (0/3)' },
      { type: 'talk', target: 'npc_nuariel', count: 1, description: '누아리엘에게 보고' },
    ],
    rewards: [
      { type: 'exp', amount: 500, description: '경험치 500' },
      { type: 'gold', amount: 200, description: '골드 200' },
    ],
  },
  {
    code: 'MQ_CH02', name: '시간의 균열', description: '아르겐티움 하수도에서 시간의 균열을 조사하고 이상 현상의 원인을 밝힌다.',
    type: 'main', chapter: 2, requiredLevel: 3, prerequisites: ['MQ_CH01'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_argentium_sewer', count: 1, description: '아르겐티움 하수도 진입' },
      { type: 'kill', target: 'mob_time_wraith', count: 5, description: '시간 레이스 처치 (0/5)' },
      { type: 'collect', target: 'rift_sample', count: 1, description: '균열 샘플 채취' },
    ],
    rewards: [
      { type: 'exp', amount: 800, description: '경험치 800' },
      { type: 'gold', amount: 350, description: '골드 350' },
      { type: 'item', itemId: 'item_rift_blade', amount: 1, description: '균열의 검' },
    ],
  },
  {
    code: 'MQ_CH03', name: '망각의 숲', description: '장막의 숲에 진입하여 기억을 삼키는 안개의 정체를 파악한다.',
    type: 'main', chapter: 3, requiredLevel: 6, prerequisites: ['MQ_CH02'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_veiled_forest', count: 1, description: '장막의 숲 진입' },
      { type: 'kill', target: 'mob_fog_beast', count: 8, description: '안개 짐승 처치 (0/8)' },
    ],
    rewards: [
      { type: 'exp', amount: 1200, description: '경험치 1200' },
      { type: 'gold', amount: 500, description: '골드 500' },
    ],
  },
  {
    code: 'MQ_CH04', name: '카엘의 배신', description: '동료 카엘의 진짜 목적을 추적하고 에테르 연구소에서 진실을 밝힌다.',
    type: 'main', chapter: 4, requiredLevel: 10, prerequisites: ['MQ_CH03'], isRepeatable: false,
    objectives: [
      { type: 'talk', target: 'npc_kael', count: 1, description: '카엘과 대화' },
      { type: 'explore', target: 'zone_ether_lab', count: 1, description: '에테르 연구소 조사' },
      { type: 'collect', target: 'kael_journal', count: 3, description: '카엘의 일지 수집 (0/3)' },
    ],
    rewards: [
      { type: 'exp', amount: 1600, description: '경험치 1600' },
      { type: 'gold', amount: 700, description: '골드 700' },
    ],
  },
  {
    code: 'MQ_CH05', name: '수정 동굴의 비밀', description: '수정 동굴 깊숙이에서 고대 에테르 장치를 발견하고 가동한다.',
    type: 'main', chapter: 5, requiredLevel: 14, prerequisites: ['MQ_CH04'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_crystal_cavern_deep', count: 1, description: '수정 동굴 심층 진입' },
      { type: 'kill', target: 'mob_crystal_golem', count: 3, description: '수정 골렘 처치 (0/3)' },
      { type: 'collect', target: 'ether_core_fragment', count: 5, description: '에테르 코어 조각 (0/5)' },
    ],
    rewards: [
      { type: 'exp', amount: 2200, description: '경험치 2200' },
      { type: 'gold', amount: 1000, description: '골드 1000' },
      { type: 'item', itemId: 'item_crystal_armor', amount: 1, description: '수정 갑옷' },
    ],
  },
  {
    code: 'MQ_CH06', name: '심연의 문', description: '심연의 균열 입구에서 첫 보스 "시간의 감시자"와 대결한다.',
    type: 'main', chapter: 6, requiredLevel: 18, prerequisites: ['MQ_CH05'], isRepeatable: false,
    objectives: [
      { type: 'kill', target: 'boss_time_watcher', count: 1, description: '시간의 감시자 처치' },
    ],
    rewards: [
      { type: 'exp', amount: 3000, description: '경험치 3000' },
      { type: 'gold', amount: 1500, description: '골드 1500' },
      { type: 'item', itemId: 'item_watcher_eye', amount: 1, description: '감시자의 눈' },
    ],
  },
  {
    code: 'MQ_CH07', name: '잊혀진 기록보관소', description: '기록보관소에서 에테르나 크로니클의 역사를 해독한다.',
    type: 'main', chapter: 7, requiredLevel: 22, prerequisites: ['MQ_CH06'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_forgotten_archive', count: 1, description: '기록보관소 진입' },
      { type: 'collect', target: 'ancient_scroll', count: 7, description: '고대 두루마리 수집 (0/7)' },
      { type: 'talk', target: 'npc_archivist', count: 1, description: '기록관에게 해독 의뢰' },
    ],
    rewards: [
      { type: 'exp', amount: 3500, description: '경험치 3500' },
      { type: 'gold', amount: 1800, description: '골드 1800' },
    ],
  },
  {
    code: 'MQ_CH08', name: '에테르 폭주', description: '에테르 에너지가 폭주하여 아르겐티움이 위험에 처한다. 핵심 밸브 3개를 차단하라.',
    type: 'main', chapter: 8, requiredLevel: 26, prerequisites: ['MQ_CH07'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_ether_valve_1', count: 1, description: '1번 밸브 차단' },
      { type: 'explore', target: 'zone_ether_valve_2', count: 1, description: '2번 밸브 차단' },
      { type: 'explore', target: 'zone_ether_valve_3', count: 1, description: '3번 밸브 차단' },
      { type: 'kill', target: 'mob_ether_elemental', count: 10, description: '에테르 정령 처치 (0/10)' },
    ],
    rewards: [
      { type: 'exp', amount: 4200, description: '경험치 4200' },
      { type: 'gold', amount: 2200, description: '골드 2200' },
    ],
  },
  {
    code: 'MQ_CH09', name: '그림자 직조자의 소환', description: '그림자 직조자 세력의 본거지에 잠입하여 수장을 대면한다.',
    type: 'main', chapter: 9, requiredLevel: 30, prerequisites: ['MQ_CH08'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_shadow_sanctum', count: 1, description: '그림자 성소 진입' },
      { type: 'kill', target: 'mob_shadow_elite', count: 5, description: '그림자 정예 처치 (0/5)' },
      { type: 'talk', target: 'npc_shadow_master', count: 1, description: '그림자 수장 대면' },
    ],
    rewards: [
      { type: 'exp', amount: 5000, description: '경험치 5000' },
      { type: 'gold', amount: 2800, description: '골드 2800' },
      { type: 'item', itemId: 'item_shadow_cloak', amount: 1, description: '그림자 망토' },
    ],
  },
  {
    code: 'MQ_CH10', name: '기억의 바다', description: '기억의 바다에서 에리엔의 진정한 과거를 마주한다.',
    type: 'main', chapter: 10, requiredLevel: 35, prerequisites: ['MQ_CH09'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_sea_of_memory', count: 1, description: '기억의 바다 진입' },
      { type: 'collect', target: 'memory_fragment_true', count: 5, description: '진실의 기억 파편 (0/5)' },
    ],
    rewards: [
      { type: 'exp', amount: 6000, description: '경험치 6000' },
      { type: 'gold', amount: 3500, description: '골드 3500' },
    ],
  },
  {
    code: 'MQ_CH11', name: '크로노스의 시계탑', description: '크로노스의 시계탑에서 시간 조작의 핵심 장치에 접근한다.',
    type: 'main', chapter: 11, requiredLevel: 40, prerequisites: ['MQ_CH10'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_chronos_tower', count: 1, description: '크로노스 시계탑 등반' },
      { type: 'kill', target: 'mob_clockwork_soldier', count: 12, description: '태엽 병사 처치 (0/12)' },
      { type: 'kill', target: 'boss_gear_guardian', count: 1, description: '톱니 수호자 처치' },
    ],
    rewards: [
      { type: 'exp', amount: 7500, description: '경험치 7500' },
      { type: 'gold', amount: 4000, description: '골드 4000' },
      { type: 'item', itemId: 'item_chronos_key', amount: 1, description: '크로노스의 열쇠' },
    ],
  },
  {
    code: 'MQ_CH12', name: '배반자의 선택', description: '카엘과의 최종 대결. 구원할 것인가, 심판할 것인가.',
    type: 'main', chapter: 12, requiredLevel: 45, prerequisites: ['MQ_CH11'], isRepeatable: false,
    objectives: [
      { type: 'talk', target: 'npc_kael_final', count: 1, description: '카엘과의 최후 대화' },
      { type: 'kill', target: 'boss_kael_corrupted', count: 1, description: '타락한 카엘 처치' },
    ],
    rewards: [
      { type: 'exp', amount: 9000, description: '경험치 9000' },
      { type: 'gold', amount: 5000, description: '골드 5000' },
    ],
  },
  {
    code: 'MQ_CH13', name: '망각의 왕좌', description: '망각의 왕좌에서 시간을 지배하려는 자의 정체를 밝힌다.',
    type: 'main', chapter: 13, requiredLevel: 50, prerequisites: ['MQ_CH12'], isRepeatable: false,
    objectives: [
      { type: 'explore', target: 'zone_oblivion_throne', count: 1, description: '망각의 왕좌 도달' },
      { type: 'kill', target: 'mob_void_sentinel', count: 8, description: '공허 파수꾼 처치 (0/8)' },
    ],
    rewards: [
      { type: 'exp', amount: 11000, description: '경험치 11000' },
      { type: 'gold', amount: 6000, description: '골드 6000' },
    ],
  },
  {
    code: 'MQ_CH14', name: '에테르의 심장', description: '세계의 핵심 에테르 원천에 도달하여 최종 결전을 준비한다.',
    type: 'main', chapter: 14, requiredLevel: 55, prerequisites: ['MQ_CH13'], isRepeatable: false,
    objectives: [
      { type: 'collect', target: 'ether_heart_shard', count: 4, description: '에테르 심장 조각 (0/4)' },
      { type: 'craft', target: 'ether_heart_restored', count: 1, description: '에테르 심장 복원' },
    ],
    rewards: [
      { type: 'exp', amount: 13000, description: '경험치 13000' },
      { type: 'gold', amount: 7000, description: '골드 7000' },
      { type: 'item', itemId: 'item_ether_heart', amount: 1, description: '에테르의 심장' },
    ],
  },
  {
    code: 'MQ_CH15', name: '에테르나 크로니클', description: '최종 보스와의 결전. 기억과 망각의 운명을 결정한다.',
    type: 'main', chapter: 15, requiredLevel: 60, prerequisites: ['MQ_CH14'], isRepeatable: false,
    objectives: [
      { type: 'kill', target: 'boss_oblivion_lord', count: 1, description: '망각의 군주 처치' },
    ],
    rewards: [
      { type: 'exp', amount: 20000, description: '경험치 20000' },
      { type: 'gold', amount: 15000, description: '골드 15000' },
      { type: 'title', amount: 1, description: '칭호: 시간의 수호자' },
    ],
  },
];

// ════════════════════════════════════════════════════════════════
// 서브 퀘스트 (20) — 지역별 사이드
// ════════════════════════════════════════════════════════════════
const SUB_QUESTS: QuestSeedData[] = [
  {
    code: 'SQ_ARG_01', name: '시계공의 부탁', description: '아르겐티움의 시계공에게 부품을 모아다 준다.',
    type: 'sub', requiredLevel: 2, prerequisites: [], isRepeatable: false, npcId: 'npc_clockmaker',
    objectives: [{ type: 'collect', target: 'clockwork_gear', count: 5, description: '태엽 부품 (0/5)' }],
    rewards: [{ type: 'exp', amount: 300, description: '경험치 300' }, { type: 'gold', amount: 150, description: '골드 150' }],
  },
  {
    code: 'SQ_ARG_02', name: '하수도 쥐 소탕', description: '아르겐티움 하수도의 거대 쥐를 처치한다.',
    type: 'sub', requiredLevel: 3, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'kill', target: 'mob_giant_rat', count: 10, description: '거대 쥐 처치 (0/10)' }],
    rewards: [{ type: 'exp', amount: 400, description: '경험치 400' }, { type: 'gold', amount: 200, description: '골드 200' }],
  },
  {
    code: 'SQ_ARG_03', name: '잃어버린 고양이', description: '주민의 고양이를 찾아 돌려보낸다.',
    type: 'sub', requiredLevel: 1, prerequisites: [], isRepeatable: false, npcId: 'npc_villager_01',
    objectives: [{ type: 'explore', target: 'zone_argentium_alley', count: 1, description: '골목에서 고양이 찾기' }],
    rewards: [{ type: 'exp', amount: 150, description: '경험치 150' }, { type: 'gold', amount: 50, description: '골드 50' }],
  },
  {
    code: 'SQ_ARG_04', name: '경비대장의 의뢰', description: '성문 밖 도적단 전초기지를 소탕한다.',
    type: 'sub', requiredLevel: 5, prerequisites: [], isRepeatable: false, npcId: 'npc_guard_captain',
    objectives: [
      { type: 'kill', target: 'mob_bandit', count: 8, description: '도적 처치 (0/8)' },
      { type: 'kill', target: 'mob_bandit_leader', count: 1, description: '도적 두목 처치' },
    ],
    rewards: [{ type: 'exp', amount: 600, description: '경험치 600' }, { type: 'gold', amount: 400, description: '골드 400' }],
  },
  {
    code: 'SQ_VF_01', name: '약초 채집', description: '장막의 숲에서 치유 약초를 채집한다.',
    type: 'sub', requiredLevel: 7, prerequisites: [], isRepeatable: false, npcId: 'npc_herbalist',
    objectives: [{ type: 'collect', target: 'healing_herb', count: 10, description: '치유 약초 (0/10)' }],
    rewards: [{ type: 'exp', amount: 500, description: '경험치 500' }, { type: 'item', itemId: 'item_potion_hp_m', amount: 5, description: 'HP 포션(중) x5' }],
  },
  {
    code: 'SQ_VF_02', name: '안개 속 실종자', description: '장막의 숲에서 실종된 탐험가를 찾는다.',
    type: 'sub', requiredLevel: 8, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'explore', target: 'zone_fog_clearing', count: 1, description: '안개 빈터 도달' }, { type: 'talk', target: 'npc_lost_explorer', count: 1, description: '실종 탐험가 발견' }],
    rewards: [{ type: 'exp', amount: 700, description: '경험치 700' }, { type: 'gold', amount: 350, description: '골드 350' }],
  },
  {
    code: 'SQ_VF_03', name: '숲의 수호자', description: '오염된 숲의 정령을 정화한다.',
    type: 'sub', requiredLevel: 10, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'kill', target: 'mob_corrupted_treant', count: 5, description: '타락한 트렌트 처치 (0/5)' }, { type: 'collect', target: 'purification_crystal', count: 3, description: '정화 수정 (0/3)' }],
    rewards: [{ type: 'exp', amount: 900, description: '경험치 900' }, { type: 'gold', amount: 500, description: '골드 500' }],
  },
  {
    code: 'SQ_VF_04', name: '늑대의 위협', description: '마을 근처의 늑대 무리를 처리한다.',
    type: 'sub', requiredLevel: 6, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'kill', target: 'mob_dire_wolf', count: 6, description: '흉포한 늑대 처치 (0/6)' }],
    rewards: [{ type: 'exp', amount: 450, description: '경험치 450' }, { type: 'gold', amount: 250, description: '골드 250' }],
  },
  {
    code: 'SQ_CC_01', name: '광부의 곡괭이', description: '수정 동굴 광부에게 새 곡괭이를 제작해 준다.',
    type: 'sub', requiredLevel: 12, prerequisites: [], isRepeatable: false, npcId: 'npc_miner',
    objectives: [{ type: 'collect', target: 'iron_ore', count: 8, description: '철광석 (0/8)' }, { type: 'craft', target: 'miner_pickaxe', count: 1, description: '광부의 곡괭이 제작' }],
    rewards: [{ type: 'exp', amount: 800, description: '경험치 800' }, { type: 'gold', amount: 500, description: '골드 500' }],
  },
  {
    code: 'SQ_CC_02', name: '수정 수집', description: '다양한 색상의 수정을 수집한다.',
    type: 'sub', requiredLevel: 13, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'collect', target: 'crystal_red', count: 3, description: '붉은 수정 (0/3)' }, { type: 'collect', target: 'crystal_blue', count: 3, description: '푸른 수정 (0/3)' }, { type: 'collect', target: 'crystal_green', count: 3, description: '녹색 수정 (0/3)' }],
    rewards: [{ type: 'exp', amount: 750, description: '경험치 750' }, { type: 'gold', amount: 600, description: '골드 600' }],
  },
  {
    code: 'SQ_CC_03', name: '동굴 거미 둥지', description: '수정 동굴의 거미 둥지를 제거한다.',
    type: 'sub', requiredLevel: 15, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'kill', target: 'mob_cave_spider', count: 12, description: '동굴 거미 처치 (0/12)' }, { type: 'kill', target: 'mob_spider_queen', count: 1, description: '여왕 거미 처치' }],
    rewards: [{ type: 'exp', amount: 1100, description: '경험치 1100' }, { type: 'gold', amount: 700, description: '골드 700' }],
  },
  {
    code: 'SQ_AB_01', name: '심연의 정찰', description: '심연의 균열 외곽을 정찰하고 적 배치를 파악한다.',
    type: 'sub', requiredLevel: 17, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'explore', target: 'zone_abyss_outskirt_1', count: 1, description: '외곽 지점 1 정찰' }, { type: 'explore', target: 'zone_abyss_outskirt_2', count: 1, description: '외곽 지점 2 정찰' }, { type: 'explore', target: 'zone_abyss_outskirt_3', count: 1, description: '외곽 지점 3 정찰' }],
    rewards: [{ type: 'exp', amount: 1300, description: '경험치 1300' }, { type: 'gold', amount: 800, description: '골드 800' }],
  },
  {
    code: 'SQ_AB_02', name: '공허의 결정', description: '심연에서 공허 에너지 결정을 수집한다.',
    type: 'sub', requiredLevel: 20, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'collect', target: 'void_crystal', count: 5, description: '공허 결정 (0/5)' }],
    rewards: [{ type: 'exp', amount: 1500, description: '경험치 1500' }, { type: 'item', itemId: 'item_void_ring', amount: 1, description: '공허의 반지' }],
  },
  {
    code: 'SQ_FA_01', name: '기록 복원', description: '기록보관소의 훼손된 문서를 복원한다.',
    type: 'sub', requiredLevel: 23, prerequisites: [], isRepeatable: false, npcId: 'npc_archivist',
    objectives: [{ type: 'collect', target: 'torn_page', count: 15, description: '찢어진 페이지 (0/15)' }],
    rewards: [{ type: 'exp', amount: 2000, description: '경험치 2000' }, { type: 'gold', amount: 1200, description: '골드 1200' }],
  },
  {
    code: 'SQ_FA_02', name: '봉인된 방', description: '기록보관소의 봉인된 방을 개방한다.',
    type: 'sub', requiredLevel: 25, prerequisites: ['SQ_FA_01'], isRepeatable: false,
    objectives: [{ type: 'collect', target: 'seal_key', count: 3, description: '봉인 열쇠 조각 (0/3)' }, { type: 'explore', target: 'zone_sealed_chamber', count: 1, description: '봉인된 방 진입' }],
    rewards: [{ type: 'exp', amount: 2500, description: '경험치 2500' }, { type: 'gold', amount: 1500, description: '골드 1500' }],
  },
  {
    code: 'SQ_GEN_01', name: '대장장이의 시험', description: '대장장이의 시험 과제를 완료하여 고급 제작법을 얻는다.',
    type: 'sub', requiredLevel: 15, prerequisites: [], isRepeatable: false, npcId: 'npc_blacksmith',
    objectives: [{ type: 'craft', target: 'trial_sword', count: 1, description: '시험용 검 제작' }, { type: 'craft', target: 'trial_shield', count: 1, description: '시험용 방패 제작' }],
    rewards: [{ type: 'exp', amount: 1000, description: '경험치 1000' }, { type: 'item', itemId: 'recipe_advanced_set', amount: 1, description: '고급 제작 레시피 세트' }],
  },
  {
    code: 'SQ_GEN_02', name: '요리사의 비밀 레시피', description: '여관 요리사를 위해 희귀 식재료를 수집한다.',
    type: 'sub', requiredLevel: 5, prerequisites: [], isRepeatable: false, npcId: 'npc_innkeeper',
    objectives: [{ type: 'collect', target: 'rare_mushroom', count: 3, description: '희귀 버섯 (0/3)' }, { type: 'collect', target: 'dragon_pepper', count: 2, description: '드래곤 고추 (0/2)' }],
    rewards: [{ type: 'exp', amount: 350, description: '경험치 350' }, { type: 'item', itemId: 'item_feast_buff', amount: 3, description: '만찬 버프 음식 x3' }],
  },
  {
    code: 'SQ_GEN_03', name: '우편 배달부', description: '각 지역의 NPC에게 우편을 전달한다.',
    type: 'sub', requiredLevel: 8, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'talk', target: 'npc_merchant_east', count: 1, description: '동부 상인에게 전달' }, { type: 'talk', target: 'npc_merchant_west', count: 1, description: '서부 상인에게 전달' }, { type: 'talk', target: 'npc_merchant_south', count: 1, description: '남부 상인에게 전달' }],
    rewards: [{ type: 'exp', amount: 500, description: '경험치 500' }, { type: 'gold', amount: 300, description: '골드 300' }],
  },
  {
    code: 'SQ_GEN_04', name: '펫 훈련사의 조언', description: '펫 훈련사와 대화하고 훈련 임무를 수행한다.',
    type: 'sub', requiredLevel: 10, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'talk', target: 'npc_pet_trainer', count: 1, description: '펫 훈련사와 대화' }, { type: 'kill', target: 'mob_training_dummy', count: 5, description: '훈련 허수아비 타격 (0/5)' }],
    rewards: [{ type: 'exp', amount: 600, description: '경험치 600' }, { type: 'item', itemId: 'item_pet_treat', amount: 10, description: '펫 간식 x10' }],
  },
  {
    code: 'SQ_GEN_05', name: '길드 가입 시험', description: '길드 가입을 위한 전투 시험을 통과한다.',
    type: 'sub', requiredLevel: 12, prerequisites: [], isRepeatable: false,
    objectives: [{ type: 'kill', target: 'mob_guild_trial', count: 3, description: '시험관 처치 (0/3)' }],
    rewards: [{ type: 'exp', amount: 800, description: '경험치 800' }, { type: 'gold', amount: 500, description: '골드 500' }, { type: 'reputation', amount: 100, description: '길드 명성 100' }],
  },
];

// ════════════════════════════════════════════════════════════════
// 일일 퀘스트 (15)
// ════════════════════════════════════════════════════════════════
const DAILY_QUESTS: QuestSeedData[] = [
  {
    code: 'DQ_KILL_01', name: '몬스터 사냥 (초급)', description: '아무 몬스터 10마리를 처치한다.',
    type: 'daily', requiredLevel: 1, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'any_monster', count: 10, description: '몬스터 처치 (0/10)' }],
    rewards: [{ type: 'exp', amount: 200, description: '경험치 200' }, { type: 'gold', amount: 100, description: '골드 100' }],
  },
  {
    code: 'DQ_KILL_02', name: '몬스터 사냥 (중급)', description: '아무 몬스터 30마리를 처치한다.',
    type: 'daily', requiredLevel: 10, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'any_monster', count: 30, description: '몬스터 처치 (0/30)' }],
    rewards: [{ type: 'exp', amount: 600, description: '경험치 600' }, { type: 'gold', amount: 300, description: '골드 300' }],
  },
  {
    code: 'DQ_KILL_03', name: '몬스터 사냥 (고급)', description: '아무 몬스터 50마리를 처치한다.',
    type: 'daily', requiredLevel: 25, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'any_monster', count: 50, description: '몬스터 처치 (0/50)' }],
    rewards: [{ type: 'exp', amount: 1200, description: '경험치 1200' }, { type: 'gold', amount: 600, description: '골드 600' }],
  },
  {
    code: 'DQ_KILL_ELITE', name: '정예 몬스터 처치', description: '정예 몬스터 3마리를 처치한다.',
    type: 'daily', requiredLevel: 15, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'elite_monster', count: 3, description: '정예 몬스터 처치 (0/3)' }],
    rewards: [{ type: 'exp', amount: 800, description: '경험치 800' }, { type: 'gold', amount: 400, description: '골드 400' }],
  },
  {
    code: 'DQ_COLLECT_01', name: '자원 수집 (광석)', description: '광석 15개를 채굴한다.',
    type: 'daily', requiredLevel: 5, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'collect', target: 'ore_any', count: 15, description: '광석 채굴 (0/15)' }],
    rewards: [{ type: 'exp', amount: 300, description: '경험치 300' }, { type: 'gold', amount: 200, description: '골드 200' }],
  },
  {
    code: 'DQ_COLLECT_02', name: '자원 수집 (약초)', description: '약초 15개를 채집한다.',
    type: 'daily', requiredLevel: 5, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'collect', target: 'herb_any', count: 15, description: '약초 채집 (0/15)' }],
    rewards: [{ type: 'exp', amount: 300, description: '경험치 300' }, { type: 'gold', amount: 200, description: '골드 200' }],
  },
  {
    code: 'DQ_COLLECT_03', name: '에테르 입자 수집', description: '에테르 입자를 10개 수집한다.',
    type: 'daily', requiredLevel: 15, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'collect', target: 'ether_particle', count: 10, description: '에테르 입자 (0/10)' }],
    rewards: [{ type: 'exp', amount: 500, description: '경험치 500' }, { type: 'gold', amount: 250, description: '골드 250' }],
  },
  {
    code: 'DQ_CRAFT_01', name: '제작 연습', description: '아무 아이템 3개를 제작한다.',
    type: 'daily', requiredLevel: 5, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'craft', target: 'any_item', count: 3, description: '아이템 제작 (0/3)' }],
    rewards: [{ type: 'exp', amount: 250, description: '경험치 250' }, { type: 'gold', amount: 150, description: '골드 150' }],
  },
  {
    code: 'DQ_CRAFT_02', name: '포션 제조', description: 'HP 포션 5개를 제작한다.',
    type: 'daily', requiredLevel: 10, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'craft', target: 'potion_hp', count: 5, description: 'HP 포션 제작 (0/5)' }],
    rewards: [{ type: 'exp', amount: 400, description: '경험치 400' }, { type: 'gold', amount: 200, description: '골드 200' }],
  },
  {
    code: 'DQ_PVP_01', name: 'PvP 참가', description: 'PvP 아레나에서 3판을 진행한다.',
    type: 'daily', requiredLevel: 15, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'pvp_match', count: 3, description: 'PvP 매치 참가 (0/3)' }],
    rewards: [{ type: 'exp', amount: 500, description: '경험치 500' }, { type: 'gold', amount: 300, description: '골드 300' }],
  },
  {
    code: 'DQ_PVP_WIN', name: 'PvP 승리', description: 'PvP 아레나에서 1회 승리한다.',
    type: 'daily', requiredLevel: 15, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'pvp_win', count: 1, description: 'PvP 승리 (0/1)' }],
    rewards: [{ type: 'exp', amount: 700, description: '경험치 700' }, { type: 'gold', amount: 500, description: '골드 500' }],
  },
  {
    code: 'DQ_EXPLORE_01', name: '일일 탐험', description: '지정 지역 2곳을 방문한다.',
    type: 'daily', requiredLevel: 5, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'explore', target: 'daily_zone_a', count: 1, description: '지역 A 방문' }, { type: 'explore', target: 'daily_zone_b', count: 1, description: '지역 B 방문' }],
    rewards: [{ type: 'exp', amount: 300, description: '경험치 300' }, { type: 'gold', amount: 150, description: '골드 150' }],
  },
  {
    code: 'DQ_RAID_01', name: '레이드 참가', description: '레이드 보스에 1회 참가한다.',
    type: 'daily', requiredLevel: 20, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'raid_participation', count: 1, description: '레이드 참가 (0/1)' }],
    rewards: [{ type: 'exp', amount: 1000, description: '경험치 1000' }, { type: 'gold', amount: 500, description: '골드 500' }],
  },
  {
    code: 'DQ_TALK_01', name: 'NPC 인사', description: '아무 NPC 5명과 대화한다.',
    type: 'daily', requiredLevel: 1, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'talk', target: 'any_npc', count: 5, description: 'NPC 대화 (0/5)' }],
    rewards: [{ type: 'exp', amount: 150, description: '경험치 150' }, { type: 'gold', amount: 80, description: '골드 80' }],
  },
  {
    code: 'DQ_BOSS_DAILY', name: '일일 보스 도전', description: '필드 보스 1마리를 처치한다.',
    type: 'daily', requiredLevel: 20, prerequisites: [], isRepeatable: true, timeLimit: 86400,
    objectives: [{ type: 'kill', target: 'field_boss', count: 1, description: '필드 보스 처치 (0/1)' }],
    rewards: [{ type: 'exp', amount: 1500, description: '경험치 1500' }, { type: 'gold', amount: 800, description: '골드 800' }],
  },
];

// ════════════════════════════════════════════════════════════════
// 주간 퀘스트 (5)
// ════════════════════════════════════════════════════════════════
const WEEKLY_QUESTS: QuestSeedData[] = [
  {
    code: 'WQ_KILL_MEGA', name: '주간: 대규모 토벌', description: '이번 주 몬스터 200마리를 처치한다.',
    type: 'weekly', requiredLevel: 10, prerequisites: [], isRepeatable: true, timeLimit: 604800,
    objectives: [{ type: 'kill', target: 'any_monster', count: 200, description: '몬스터 처치 (0/200)' }],
    rewards: [{ type: 'exp', amount: 5000, description: '경험치 5000' }, { type: 'gold', amount: 3000, description: '골드 3000' }],
  },
  {
    code: 'WQ_RAID_CLEAR', name: '주간: 레이드 클리어', description: '이번 주 레이드 보스 3회 클리어.',
    type: 'weekly', requiredLevel: 25, prerequisites: [], isRepeatable: true, timeLimit: 604800,
    objectives: [{ type: 'kill', target: 'raid_clear', count: 3, description: '레이드 클리어 (0/3)' }],
    rewards: [{ type: 'exp', amount: 8000, description: '경험치 8000' }, { type: 'gold', amount: 5000, description: '골드 5000' }],
  },
  {
    code: 'WQ_CRAFT_MASTER', name: '주간: 장인의 길', description: '이번 주 아이템 20개를 제작한다.',
    type: 'weekly', requiredLevel: 10, prerequisites: [], isRepeatable: true, timeLimit: 604800,
    objectives: [{ type: 'craft', target: 'any_item', count: 20, description: '아이템 제작 (0/20)' }],
    rewards: [{ type: 'exp', amount: 4000, description: '경험치 4000' }, { type: 'gold', amount: 2000, description: '골드 2000' }],
  },
  {
    code: 'WQ_PVP_GLORY', name: '주간: PvP 영광', description: '이번 주 PvP 10승을 달성한다.',
    type: 'weekly', requiredLevel: 15, prerequisites: [], isRepeatable: true, timeLimit: 604800,
    objectives: [{ type: 'kill', target: 'pvp_win', count: 10, description: 'PvP 승리 (0/10)' }],
    rewards: [{ type: 'exp', amount: 6000, description: '경험치 6000' }, { type: 'gold', amount: 4000, description: '골드 4000' }],
  },
  {
    code: 'WQ_COLLECT_RARE', name: '주간: 희귀 수집가', description: '이번 주 희귀 아이템 10개를 수집한다.',
    type: 'weekly', requiredLevel: 15, prerequisites: [], isRepeatable: true, timeLimit: 604800,
    objectives: [{ type: 'collect', target: 'rare_item_any', count: 10, description: '희귀 아이템 수집 (0/10)' }],
    rewards: [{ type: 'exp', amount: 5000, description: '경험치 5000' }, { type: 'gold', amount: 3500, description: '골드 3500' }],
  },
];

// ════════════════════════════════════════════════════════════════
// 이벤트 퀘스트 (5)
// ════════════════════════════════════════════════════════════════
const EVENT_QUESTS: QuestSeedData[] = [
  {
    code: 'EQ_SPRING_01', name: '[봄] 꽃잎 축제', description: '봄 이벤트: 꽃잎 토큰 30개를 수집한다.',
    type: 'event', requiredLevel: 1, prerequisites: [], isRepeatable: false, timeLimit: 1209600,
    objectives: [{ type: 'collect', target: 'spring_petal_token', count: 30, description: '꽃잎 토큰 (0/30)' }],
    rewards: [{ type: 'exp', amount: 2000, description: '경험치 2000' }, { type: 'item', itemId: 'item_spring_costume', amount: 1, description: '봄 축제 코스튬' }],
  },
  {
    code: 'EQ_SUMMER_01', name: '[여름] 해변 대모험', description: '여름 이벤트: 해변 미니게임 10회 클리어.',
    type: 'event', requiredLevel: 1, prerequisites: [], isRepeatable: false, timeLimit: 1209600,
    objectives: [{ type: 'explore', target: 'summer_minigame', count: 10, description: '미니게임 클리어 (0/10)' }],
    rewards: [{ type: 'exp', amount: 2000, description: '경험치 2000' }, { type: 'item', itemId: 'item_summer_surfboard', amount: 1, description: '서핑보드 탈것' }],
  },
  {
    code: 'EQ_AUTUMN_01', name: '[가을] 수확의 계절', description: '가을 이벤트: 수확 작물 50개를 모은다.',
    type: 'event', requiredLevel: 1, prerequisites: [], isRepeatable: false, timeLimit: 1209600,
    objectives: [{ type: 'collect', target: 'autumn_crop', count: 50, description: '수확 작물 (0/50)' }],
    rewards: [{ type: 'exp', amount: 2000, description: '경험치 2000' }, { type: 'item', itemId: 'item_autumn_hat', amount: 1, description: '수확제 모자' }],
  },
  {
    code: 'EQ_WINTER_01', name: '[겨울] 눈꽃 축제', description: '겨울 이벤트: 눈사람 5개를 만든다.',
    type: 'event', requiredLevel: 1, prerequisites: [], isRepeatable: false, timeLimit: 1209600,
    objectives: [{ type: 'craft', target: 'snowman', count: 5, description: '눈사람 제작 (0/5)' }],
    rewards: [{ type: 'exp', amount: 2000, description: '경험치 2000' }, { type: 'item', itemId: 'item_winter_scarf', amount: 1, description: '겨울 목도리' }],
  },
  {
    code: 'EQ_ANNIVERSARY', name: '[기념] 에테르나 기념일', description: '서비스 기념 이벤트: 특별 던전 클리어.',
    type: 'event', requiredLevel: 1, prerequisites: [], isRepeatable: false, timeLimit: 604800,
    objectives: [{ type: 'kill', target: 'boss_anniversary', count: 1, description: '기념 던전 보스 처치' }],
    rewards: [{ type: 'exp', amount: 5000, description: '경험치 5000' }, { type: 'gold', amount: 5000, description: '골드 5000' }, { type: 'title', amount: 1, description: '칭호: 에테르나의 동반자' }],
  },
];

// ─── 전체 시드 ──────────────────────────────────────────────────
const ALL_QUEST_SEEDS: QuestSeedData[] = [
  ...MAIN_QUESTS,
  ...SUB_QUESTS,
  ...DAILY_QUESTS,
  ...WEEKLY_QUESTS,
  ...EVENT_QUESTS,
];

/**
 * 퀘스트 시드 실행 — upsert로 중복 방지
 */
export async function seedQuests(): Promise<number> {
  let count = 0;

  for (const seed of ALL_QUEST_SEEDS) {
    await prisma.quest.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        description: seed.description,
        type: seed.type,
        chapter: seed.chapter ?? null,
        requiredLevel: seed.requiredLevel,
        prerequisites: seed.prerequisites,
        objectives: seed.objectives,
        rewards: seed.rewards,
        npcId: seed.npcId ?? null,
        timeLimit: seed.timeLimit ?? null,
        isRepeatable: seed.isRepeatable,
      },
      create: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        type: seed.type,
        chapter: seed.chapter ?? null,
        requiredLevel: seed.requiredLevel,
        prerequisites: seed.prerequisites,
        objectives: seed.objectives,
        rewards: seed.rewards,
        npcId: seed.npcId ?? null,
        timeLimit: seed.timeLimit ?? null,
        isRepeatable: seed.isRepeatable,
      },
    });
    count++;
  }

  console.log(`[QuestSeeds] ${count}개 퀘스트 시드 완료 (메인:${MAIN_QUESTS.length} 서브:${SUB_QUESTS.length} 일일:${DAILY_QUESTS.length} 주간:${WEEKLY_QUESTS.length} 이벤트:${EVENT_QUESTS.length})`);
  return count;
}
