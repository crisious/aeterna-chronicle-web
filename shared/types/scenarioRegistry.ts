/**
 * scenarioRegistry — Obsidian 시나리오 SSOT 통합 (SYNC-1)
 *
 * Obsidian 시나리오 문서 (`시나리오/`)의 핵심 narrative entity (인물/zone/보스/챕터)를
 * 게임 코드 (questSeeds + chronoField + skillSeeds) 와 cross-domain 매핑.
 *
 * 분석 보고서: docs/obsidian-game-mapping-2026-05-18.md
 *
 * 목표:
 * - Obsidian 시나리오 narrative ↔ 게임 코드 SSOT 단일 매핑
 * - 회귀 가드 (코드 변경 시 narrative 무결성 보호)
 * - 향후 게임 데이터 확장 시 Obsidian SSOT 참조
 */

// ════════════════════════════════════════════════════════════════
// 동료 캐릭터 (Companions) — Obsidian SSOT
// ════════════════════════════════════════════════════════════════

export interface ScenarioCompanion {
  /** Obsidian SSOT 인물 id */
  obsidianId: string;
  /** 한글 이름 (Obsidian narrative) */
  name: string;
  /** 종족/직업 시그니처 */
  role: string;
  /** 합류 챕터 (Obsidian Ch1~Ch5) */
  joinChapter: number;
  /** 게임 코드 npc id — 현재 게임 questSeeds 에 등장 (SYNC 완료) */
  gameNpcId?: string;
  /** 게임 보스 id (타락/적대 변신 시) — questSeeds 등장 */
  gameBossId?: string;
  /** 신뢰도 시스템 임계값 (이탈 기준) */
  loyaltyThreshold: number;
  /** SYNC-5: planned NPC id — questSeeds 추가 예정 (SSOT 예약 ID) */
  plannedGameNpcId?: string;
  /** SYNC-5: planned 보스 id — questSeeds 추가 예정 */
  plannedGameBossId?: string;
}

export const SCENARIO_COMPANIONS: readonly ScenarioCompanion[] = [
  {
    obsidianId: 'seraphine',
    name: '세라핀',
    role: '엘파리스 정찰병',
    joinChapter: 1,
    loyaltyThreshold: 50,
    gameNpcId: 'npc_seraphine',  // SYNC-7: questSeeds SQ_COMPANION_SERAPHINE 추가
  },
  {
    obsidianId: 'maestro_crio',
    name: '마에스트로 크리오',
    role: '200년 생존자 정보상',
    joinChapter: 1,
    loyaltyThreshold: 40,
    gameNpcId: 'npc_maestro_crio',  // SYNC-7: SQ_COMPANION_CRIO
  },
  {
    obsidianId: 'ignara',
    name: '이그나',
    role: '이프리타 족장의 딸',
    joinChapter: 3,
    loyaltyThreshold: 20,
    gameNpcId: 'npc_ignara',  // SYNC-7: SQ_COMPANION_IGNARA
  },
  {
    obsidianId: 'benjamin_cross',
    name: '벤자민 크로스',
    role: '전직 형사 / 정보 담당',
    joinChapter: 4,
    gameNpcId: 'npc_bernardo',
    gameBossId: 'boss_bernardo_corrupted',
    loyaltyThreshold: 40,
  },
  {
    obsidianId: 'reina',
    name: '레이나',
    role: '레테 교단 내부고발자',
    joinChapter: 4,
    loyaltyThreshold: 30,
    gameNpcId: 'npc_reina',  // SYNC-7: SQ_COMPANION_REINA
  },
  {
    obsidianId: 'urgrom',
    name: '우르그롬',
    role: '북방 기억석 사원 수호자',
    joinChapter: 4,
    loyaltyThreshold: 40,
    gameNpcId: 'npc_urgrom',  // SYNC-7: SQ_COMPANION_URGROM
  },
];

// ════════════════════════════════════════════════════════════════
// Obsidian Zone — 시나리오 지역
// ════════════════════════════════════════════════════════════════

export interface ScenarioZone {
  obsidianId: string;
  name: string;
  /** Obsidian 챕터 (Ch1~Ch5) */
  chapter: number;
  /** 게임 chronoField zone id (현재 매핑 완료) */
  gameZoneId?: string;
  /** 게임 questSeeds zone target (현재 매핑 완료) */
  gameQuestZoneTarget?: string;
  /** SYNC-5: planned questSeeds zone target — 게임 추가 예정 */
  plannedGameQuestZoneTarget?: string;
  /** SYNC-5: planned chronoField zone id — 게임 추가 예정 */
  plannedGameZoneId?: string;
}

export const SCENARIO_ZONES: readonly ScenarioZone[] = [
  {
    obsidianId: 'erebos',
    name: '에레보스',
    chapter: 1,
    gameQuestZoneTarget: 'zone_erebos_city',  // SYNC-8: SQ_EREBOS_RUINS
    plannedGameZoneId: 'erebos_ruins',  // chronoField 추가 예정 (다음 라운드)
  },
  {
    obsidianId: 'cantela_village',
    name: '칸텔라 마을',
    chapter: 1,
    gameQuestZoneTarget: 'zone_cantela_village',  // SYNC-8: SQ_CANTELA_RESCUE
  },
  {
    obsidianId: 'silvanheim',
    name: '실반헤임 (기억의 숲)',
    chapter: 2,
    gameZoneId: 'memory_forest',
    gameQuestZoneTarget: 'zone_veiled_forest',
  },
  {
    obsidianId: 'malatus_grove',
    name: '말라투스 고목 영역',
    chapter: 2,
    gameZoneId: 'malatus_sanctuary',
  },
  {
    obsidianId: 'solaris',
    name: '솔라리스 사막',
    chapter: 3,
    gameQuestZoneTarget: 'zone_solaris_desert',  // SYNC-8: SQ_SOLARIS_RAWAR
    plannedGameZoneId: 'solaris_dunes',  // chronoField 추가 예정
  },
  {
    obsidianId: 'argentium',
    name: '아르겐티움 제국',
    chapter: 4,
    gameZoneId: 'chrono_spire',
    gameQuestZoneTarget: 'zone_argentium_sewer',
  },
  {
    obsidianId: 'palatino_lab',
    name: '팔라티노 지하 연구소',
    chapter: 4,
    gameQuestZoneTarget: 'zone_ether_lab',
  },
  {
    obsidianId: 'oblivion_plateau',
    name: '망각의 고원',
    chapter: 5,
    gameZoneId: 'forgotten_citadel',
    gameQuestZoneTarget: 'zone_oblivion_throne',
  },
  {
    obsidianId: 'golden_ether_tower',
    name: '황금 에테르 탑',
    chapter: 5,
    gameZoneId: 'chrono_spire',
  },
];

// ════════════════════════════════════════════════════════════════
// 시나리오 보스 narrative
// ════════════════════════════════════════════════════════════════

export interface ScenarioBoss {
  obsidianId: string;
  name: string;
  chapter: number;
  /** 게임 chronoField 보스 id (현재 매핑 완료) */
  gameChronoBossId?: string;
  /** 게임 questSeeds 보스 target (현재 매핑 완료) */
  gameQuestBossId?: string;
  /** 페이즈 수 (Obsidian 명시) */
  phases?: number;
  /** SYNC-5: planned questSeeds 보스 — 게임 추가 예정 */
  plannedGameQuestBossId?: string;
  /** SYNC-5: planned chronoField 보스 — 게임 추가 예정 */
  plannedGameChronoBossId?: string;
}

export const SCENARIO_BOSSES: readonly ScenarioBoss[] = [
  {
    obsidianId: 'memory_golem',
    name: '기억의 골렘',
    chapter: 1,
    gameChronoBossId: 'ancient_relic_golem',
  },
  {
    obsidianId: 'malatus_ancient',
    name: '말라투스 (고목)',
    chapter: 2,
    gameChronoBossId: 'malatus_avatar',
    phases: 3,
  },
  {
    obsidianId: 'fallen_malatus',
    name: '타락한 말라투스',
    chapter: 2,
    gameChronoBossId: 'fallen_malatus',
  },
  {
    obsidianId: 'rawar',
    name: '라와르 (솔리안 왕)',
    chapter: 3,
    phases: 3,
    gameQuestBossId: 'boss_rawar',  // SYNC-8: SQ_SOLARIS_RAWAR
    plannedGameChronoBossId: 'rawar_ancient_king',  // chronoField 추가 예정
  },
  {
    obsidianId: 'kane',
    name: '케인 (기억 사냥꾼 간부)',
    chapter: 4,
    gameQuestBossId: 'boss_kane_corrupted',  // SYNC-8: SQ_KANE_HUNT
  },
  {
    obsidianId: 'corrupted_bernardo',
    name: '타락한 베르나르도',
    chapter: 4,
    gameQuestBossId: 'boss_bernardo_corrupted',
  },
  {
    obsidianId: 'time_watcher',
    name: '시간의 감시자',
    chapter: 5,
    gameQuestBossId: 'boss_time_watcher',
  },
  {
    obsidianId: 'gear_guardian',
    name: '톱니 수호자',
    chapter: 5,
    gameQuestBossId: 'boss_gear_guardian',
  },
  {
    obsidianId: 'lethe',
    name: '레테 (망각의 신)',
    chapter: 5,
    gameQuestBossId: 'boss_oblivion_lord',
    gameChronoBossId: 'aetherna_collapse',
    phases: 5,
  },
];

// ════════════════════════════════════════════════════════════════
// Obsidian 챕터 메타
// ════════════════════════════════════════════════════════════════

export interface ScenarioChapter {
  chapter: number;
  title: string;
  location: string;
  /** 게임 메인 퀘스트 매핑 (1:N) */
  gameMainQuests: readonly string[];
}

export const SCENARIO_CHAPTERS: readonly ScenarioChapter[] = [
  {
    chapter: 1,
    title: '잊혀진 도시의 목격자',
    location: '에레보스',
    gameMainQuests: ['MQ_CH01'],
  },
  {
    chapter: 2,
    title: '기억이 자라는 숲',
    location: '실반헤임',
    gameMainQuests: ['MQ_CH03'],
  },
  {
    chapter: 3,
    title: '불꽃과 모래 속의 진실',
    location: '솔라리스 사막',
    gameMainQuests: [],
  },
  {
    chapter: 4,
    title: '제국의 심장과 배신자',
    location: '아르겐티움',
    gameMainQuests: ['MQ_CH04', 'MQ_CH08', 'MQ_CH12'],
  },
  {
    chapter: 5,
    title: '에테르나의 마지막 기억',
    location: '망각의 고원',
    gameMainQuests: ['MQ_CH13', 'MQ_CH14', 'MQ_CH15'],
  },
];

// ════════════════════════════════════════════════════════════════
// 멀티 엔딩 narrative
// ════════════════════════════════════════════════════════════════

export type ScenarioEndingCode = 'A' | 'B' | 'C' | 'D' | 'FAIL';

export interface ScenarioEnding {
  code: ScenarioEndingCode;
  name: string;
  /** 신성 기억 파편 최소 수집량 */
  minFragments: number;
  /** 동료 전원 생존 필수 여부 */
  requireAllCompanions: boolean;
  /** narrative 시그니처 */
  signature: string;
}

export const SCENARIO_ENDINGS: readonly ScenarioEnding[] = [
  {
    code: 'A',
    name: '기억의 수호자',
    minFragments: 4,
    requireAllCompanions: true,
    signature: '레테 영원 봉인 + 동료 전원 생존',
  },
  {
    code: 'B',
    name: '마지막 증인의 선택',
    minFragments: 3,
    requireAllCompanions: false,
    signature: '레테 약화 + 기억/망각 균형',
  },
  {
    code: 'C',
    name: '망각의 선택',
    minFragments: 0,
    requireAllCompanions: false,
    signature: '레테 합의 + 부분 망각',
  },
  {
    code: 'D',
    name: '신들의 귀환',
    minFragments: 0,
    requireAllCompanions: false,
    signature: '12신 직접 개입 + 신화 시대 회귀',
  },
  {
    code: 'FAIL',
    name: '망각의 세계 (패배)',
    minFragments: 0,
    requireAllCompanions: false,
    signature: '레테 승리 + 세계 리셋',
  },
];

// ════════════════════════════════════════════════════════════════
// 헬퍼 함수 — Obsidian ↔ 게임 매핑 조회
// ════════════════════════════════════════════════════════════════

export function getCompanionByObsidianId(
  obsidianId: string,
): ScenarioCompanion | undefined {
  return SCENARIO_COMPANIONS.find((c) => c.obsidianId === obsidianId);
}

export function getZoneByObsidianId(
  obsidianId: string,
): ScenarioZone | undefined {
  return SCENARIO_ZONES.find((z) => z.obsidianId === obsidianId);
}

export function getBossByObsidianId(
  obsidianId: string,
): ScenarioBoss | undefined {
  return SCENARIO_BOSSES.find((b) => b.obsidianId === obsidianId);
}

export function listCompanionsByChapter(chapter: number): readonly ScenarioCompanion[] {
  return SCENARIO_COMPANIONS.filter((c) => c.joinChapter === chapter);
}

export function listBossesByChapter(chapter: number): readonly ScenarioBoss[] {
  return SCENARIO_BOSSES.filter((b) => b.chapter === chapter);
}

export function getChapterByNumber(chapter: number): ScenarioChapter | undefined {
  return SCENARIO_CHAPTERS.find((c) => c.chapter === chapter);
}

export function getEndingByCode(code: ScenarioEndingCode): ScenarioEnding | undefined {
  return SCENARIO_ENDINGS.find((e) => e.code === code);
}

/** Obsidian 인물/zone/보스 id 가 게임 코드와 매핑된 것만 반환 */
export function listSyncedCompanions(): readonly ScenarioCompanion[] {
  return SCENARIO_COMPANIONS.filter((c) => c.gameNpcId || c.gameBossId);
}

export function listSyncedZones(): readonly ScenarioZone[] {
  return SCENARIO_ZONES.filter((z) => z.gameZoneId || z.gameQuestZoneTarget);
}

export function listSyncedBosses(): readonly ScenarioBoss[] {
  return SCENARIO_BOSSES.filter((b) => b.gameChronoBossId || b.gameQuestBossId);
}

// ════════════════════════════════════════════════════════════════
// 신성 기억 파편 (Sacred Memory Fragments) — Ch1~Ch4 각 1개
// ════════════════════════════════════════════════════════════════

export interface ScenarioFragment {
  obsidianId: string;
  name: string;
  /** 봉인된 챕터 (Ch1~Ch4 각 1개) */
  chapter: number;
  /** 봉인 위치 (Obsidian zone obsidianId 참조) */
  zoneObsidianId: string;
  /** 200년 전 봉인한 12인 중 누구 */
  sealer: string;
  /** SYNC-9: 게임 questSeeds 보상 itemId 매핑 */
  gameItemId?: string;
  /** SYNC-9: 회수 sub quest code */
  gameQuestCode?: string;
}

export const SCENARIO_FRAGMENTS: readonly ScenarioFragment[] = [
  {
    obsidianId: 'fragment_erebos',
    name: '에레보스 파편 (대망각 진원지의 기억)',
    chapter: 1,
    zoneObsidianId: 'erebos',
    sealer: '카일 (주인공의 전생)',
    gameItemId: 'item_memory_fragment_ch1',  // SYNC-9
    gameQuestCode: 'SQ_EREBOS_RUINS',  // SYNC-8 에서 추가
  },
  {
    obsidianId: 'fragment_silvanheim',
    name: '실반헤임 파편 (말라투스의 기억)',
    chapter: 2,
    zoneObsidianId: 'silvanheim',
    sealer: '세라핀의 먼 선조 (엘파리스 기억 수호자)',
    gameItemId: 'item_memory_fragment_ch2',  // SYNC-9
    gameQuestCode: 'SQ_SILVANHEIM_FRAGMENT',  // SYNC-9 신규 추가
  },
  {
    obsidianId: 'fragment_solaris',
    name: '솔라리스 파편 (라와르 왕의 기억)',
    chapter: 3,
    zoneObsidianId: 'solaris',
    sealer: '라와르 (솔리안의 마지막 왕)',
    gameItemId: 'item_memory_fragment_ch3',  // SYNC-9
    gameQuestCode: 'SQ_SOLARIS_RAWAR',  // SYNC-8 에서 추가
  },
  {
    obsidianId: 'fragment_argentium',
    name: '아르겐티움 파편 (제국 황궁 지하)',
    chapter: 4,
    zoneObsidianId: 'argentium',
    sealer: '12인 중 1명 (이름 미공개)',
    gameItemId: 'item_memory_fragment_ch4',  // SYNC-9
    gameQuestCode: 'SQ_ARGENTIUM_FRAGMENT',  // SYNC-9 신규 추가
  },
];

// ════════════════════════════════════════════════════════════════
// 12 신화 신 (창세 11신 + 레테 배제)
// ════════════════════════════════════════════════════════════════

export interface ScenarioDeity {
  obsidianId: string;
  name: string;
  /** 관장 영역 */
  domain: string;
  /** 창세 11신에 포함되었는지 (false = 레테 배제) */
  inCreation: boolean;
}

export const SCENARIO_DEITIES: readonly ScenarioDeity[] = [
  { obsidianId: 'fabius',     name: '파비우스',   domain: '운명', inCreation: true },
  { obsidianId: 'chronai',    name: '크로나이',   domain: '시간', inCreation: true },
  { obsidianId: 'verda',      name: '베르다',     domain: '생명', inCreation: true },
  { obsidianId: 'ignarus',    name: '이그나루스', domain: '불꽃', inCreation: true },
  { obsidianId: 'akius',      name: '아키우스',   domain: '빛',   inCreation: true },
  { obsidianId: 'salome',     name: '살로메',     domain: '죽음', inCreation: true },
  { obsidianId: 'martius',    name: '마르티우스', domain: '전쟁', inCreation: true },
  { obsidianId: 'neptilus',   name: '넵틸루스',   domain: '바다', inCreation: true },
  { obsidianId: 'terus',      name: '테루스',     domain: '대지', inCreation: true },
  { obsidianId: 'aerus',      name: '아에루스',   domain: '바람', inCreation: true },
  { obsidianId: 'oneiros',    name: '오네이로스', domain: '꿈',   inCreation: true },
  { obsidianId: 'lethe',      name: '레테',       domain: '망각', inCreation: false },
];

// ════════════════════════════════════════════════════════════════
// 신뢰도 시스템 narrative
// ════════════════════════════════════════════════════════════════

export interface LoyaltyEvaluation {
  companionObsidianId: string;
  currentLoyalty: number;
  /** 이탈 여부 (threshold 미만 시 true) */
  hasLeft: boolean;
}

/** 동료의 현재 신뢰도를 평가하여 이탈 여부 판정 */
export function evaluateLoyalty(
  companionObsidianId: string,
  currentLoyalty: number,
): LoyaltyEvaluation {
  const companion = getCompanionByObsidianId(companionObsidianId);
  if (!companion) {
    return { companionObsidianId, currentLoyalty, hasLeft: false };
  }
  const hasLeft = currentLoyalty < companion.loyaltyThreshold;
  return { companionObsidianId, currentLoyalty, hasLeft };
}

// ════════════════════════════════════════════════════════════════
// SYNC-10: 신뢰도 시스템 game 로직 통합
// 동료 sub quest 의 reputation 보상 → companion loyalty 갱신 매핑
// ════════════════════════════════════════════════════════════════

export interface ReputationReward {
  /** 동료 obsidianId */
  companionObsidianId: string;
  /** reputation 보상 양 (sub quest reward.amount) */
  amount: number;
  /** 보상이 정의된 quest code */
  questCode: string;
}

/**
 * 동료 합류 sub quest 의 reputation 보상 → 신뢰도 가산 매핑.
 * 게임 questEngine 에서 quest 완료 시 호출되어 동료 loyalty 를 업데이트.
 */
export const COMPANION_REPUTATION_REWARDS: readonly ReputationReward[] = [
  { companionObsidianId: 'seraphine',    questCode: 'SQ_COMPANION_SERAPHINE', amount: 50 },
  { companionObsidianId: 'maestro_crio', questCode: 'SQ_COMPANION_CRIO',      amount: 40 },
  { companionObsidianId: 'ignara',       questCode: 'SQ_COMPANION_IGNARA',    amount: 20 },
  { companionObsidianId: 'reina',        questCode: 'SQ_COMPANION_REINA',     amount: 30 },
  { companionObsidianId: 'urgrom',       questCode: 'SQ_COMPANION_URGROM',    amount: 40 },
];

/**
 * 동료별 누적 reputation → loyalty 계산.
 * 동료 합류 sub quest 완료 시 reputation 보상 적립 → loyaltyThreshold 도달 여부 평가.
 */
export function applyReputationReward(
  companionObsidianId: string,
  currentLoyalty: number,
  questCode: string,
): { newLoyalty: number; meetsThreshold: boolean } {
  const reward = COMPANION_REPUTATION_REWARDS.find(
    (r) => r.companionObsidianId === companionObsidianId && r.questCode === questCode,
  );
  if (!reward) {
    return { newLoyalty: currentLoyalty, meetsThreshold: false };
  }
  const newLoyalty = currentLoyalty + reward.amount;
  const companion = getCompanionByObsidianId(companionObsidianId);
  const meetsThreshold = companion ? newLoyalty >= companion.loyaltyThreshold : false;
  return { newLoyalty, meetsThreshold };
}

/** companion 합류 sub quest 의 reputation 보상이 정확히 loyaltyThreshold 도달용 narrative 인지 확인 */
export function isReputationRewardSufficient(companionObsidianId: string): boolean {
  const companion = getCompanionByObsidianId(companionObsidianId);
  const reward = COMPANION_REPUTATION_REWARDS.find(
    (r) => r.companionObsidianId === companionObsidianId,
  );
  if (!companion || !reward) return false;
  return reward.amount >= companion.loyaltyThreshold;
}

// ════════════════════════════════════════════════════════════════
// SYNC-11: 파편 + 동료 → 엔딩 통합 게임 흐름
// ════════════════════════════════════════════════════════════════

export interface GameFlowState {
  /** 완료한 quest code 목록 (questEngine 의 completed) */
  completedQuests: ReadonlySet<string>;
  /** 동료별 현재 loyalty */
  companionLoyalty: Readonly<Record<string, number>>;
}

export interface GameFlowEvaluation {
  /** 수집한 파편 개수 (game item 보유 기준) */
  fragmentsCollected: number;
  /** 합류 + 유지 중인 동료 obsidianId 목록 */
  aliveCompanions: readonly string[];
  /** 이탈 동료 목록 */
  leftCompanions: readonly string[];
  /** 달성 가능한 엔딩 */
  achievableEnding: ScenarioEndingCode;
}

/**
 * questEngine + companion loyalty 상태 → 엔딩 평가.
 * 완료한 파편 회수 quest 카운트 + 동료별 loyalty threshold 비교.
 */
export function evaluateGameFlow(state: GameFlowState): GameFlowEvaluation {
  // 파편 회수 quest 완료 카운트
  const fragmentQuestCodes = new Set(
    SCENARIO_FRAGMENTS.map((f) => f.gameQuestCode).filter((c): c is string => !!c),
  );
  let fragmentsCollected = 0;
  for (const code of fragmentQuestCodes) {
    if (state.completedQuests.has(code)) fragmentsCollected += 1;
  }

  // 동료 생존 평가 — gameNpcId 가 있는 동료 중 loyalty >= threshold
  const aliveCompanions: string[] = [];
  const leftCompanions: string[] = [];
  for (const c of SCENARIO_COMPANIONS) {
    const loyalty = state.companionLoyalty[c.obsidianId] ?? 0;
    const evaluation = evaluateLoyalty(c.obsidianId, loyalty);
    if (evaluation.hasLeft) {
      leftCompanions.push(c.obsidianId);
    } else {
      aliveCompanions.push(c.obsidianId);
    }
  }

  const allAlive = leftCompanions.length === 0;
  const endingResult = evaluateEnding(fragmentsCollected, allAlive);

  return {
    fragmentsCollected,
    aliveCompanions,
    leftCompanions,
    achievableEnding: endingResult.achievableEnding,
  };
}

/** 엔딩 A 달성 조건 — 4 파편 quest 모두 완료 + 6 동료 모두 loyalty threshold */
export function checkEndingA(state: GameFlowState): boolean {
  const e = evaluateGameFlow(state);
  return e.achievableEnding === 'A';
}

// ════════════════════════════════════════════════════════════════
// SYNC-16: 엔딩 D (신화) + FAIL 시나리오 game-flow
// ════════════════════════════════════════════════════════════════

export interface AdvancedGameFlowState extends GameFlowState {
  /** 미네르바 신과의 만남 여부 (엔딩 D 필수 조건) */
  metMinerva?: boolean;
  /** 보유 신화 유물 카운트 */
  mythicRelicsCount?: number;
  /** 최종 보스 패배 여부 (FAIL 조건) */
  defeatedByLethe?: boolean;
}

export interface AdvancedEndingEvaluation {
  fragmentsCollected: number;
  aliveCompanions: readonly string[];
  leftCompanions: readonly string[];
  achievableEnding: ScenarioEndingCode;
  /** 엔딩 D 달성 가능 여부 (신화 조건 충족) */
  canAchieveEndingD: boolean;
  /** FAIL 시나리오 여부 */
  isFailure: boolean;
}

/**
 * 고급 엔딩 평가 — A/B/C 기본 + D (신화) + FAIL (레테 승리).
 *
 * 우선순위:
 * 1. defeatedByLethe = true → FAIL
 * 2. metMinerva + mythicRelics ≥ 2 → D (신화 우선)
 * 3. evaluateGameFlow → A/B/C
 */
export function evaluateAdvancedEnding(
  state: AdvancedGameFlowState,
): AdvancedEndingEvaluation {
  const baseFlow = evaluateGameFlow(state);

  // FAIL 우선 — 최종 보스 패배
  if (state.defeatedByLethe) {
    return {
      ...baseFlow,
      achievableEnding: 'FAIL',
      canAchieveEndingD: false,
      isFailure: true,
    };
  }

  // 엔딩 D 조건 — 미네르바 만남 + 신화 유물 ≥ 2
  const canAchieveEndingD =
    !!state.metMinerva && (state.mythicRelicsCount ?? 0) >= 2;

  // 엔딩 D 가 달성 가능하면 우선 (A 보다 우선순위 높음, 가장 거대 스케일)
  if (canAchieveEndingD) {
    return {
      ...baseFlow,
      achievableEnding: 'D',
      canAchieveEndingD: true,
      isFailure: false,
    };
  }

  return {
    ...baseFlow,
    canAchieveEndingD: false,
    isFailure: false,
  };
}

/** 엔딩별 narrative 요약 반환 */
export function getEndingSummary(code: ScenarioEndingCode): string {
  const ending = getEndingByCode(code);
  if (!ending) return '';
  return `${ending.code}: ${ending.name} — ${ending.signature}`;
}

// ════════════════════════════════════════════════════════════════
// SYNC-17: NPC 대화 SSOT — 동료 + 핵심 NPC 시그니처 대사
// 출처: 시나리오/NPC대화/챕터*_NPC_대화_스크립트.md
// ════════════════════════════════════════════════════════════════

export interface NpcDialogue {
  /** 대화 obsidianId (간단 식별자) */
  obsidianId: string;
  /** 게임 NPC id (npc_*) — 동기화된 동료 + Obsidian 인물 */
  gameNpcId: string;
  /** 대화 발생 챕터 (Ch1~Ch5) */
  chapter: number;
  /** 대화 한글 dialogue */
  line: string;
  /** 대화 발생 context (만남/합류/배신/이탈 등) */
  context: 'first_meet' | 'join' | 'trust_build' | 'betrayal' | 'leave' | 'final';
}

export const SCENARIO_DIALOGUES: readonly NpcDialogue[] = [
  // 세라핀 (Ch1 합류)
  {
    obsidianId: 'seraphine_first',
    gameNpcId: 'npc_seraphine',
    chapter: 1,
    line: '나는 그날 밤을 기억해. 세계력 3,200년 7월 14일. 에레보스의 불빛들이 하나씩 꺼지던 걸.',
    context: 'first_meet',
  },
  {
    obsidianId: 'seraphine_join',
    gameNpcId: 'npc_seraphine',
    chapter: 1,
    line: '에레보스에 들어가려면 안내인이 필요하잖아. 내가 도와줄게.',
    context: 'join',
  },
  // 마에스트로 크리오 (Ch1)
  {
    obsidianId: 'crio_first',
    gameNpcId: 'npc_maestro_crio',
    chapter: 1,
    line: '에레보스에서 왔어? ... 나는 에레보스에서 태어났어. 대망각 그날 밤, 갓난아기였지. 기억이 없었으니까 망각의 폭풍이 건너뛴 거야.',
    context: 'first_meet',
  },
  {
    obsidianId: 'crio_betrayal_resist',
    gameNpcId: 'npc_maestro_crio',
    chapter: 4,
    line: '내가 60년 동안 정보를 사고 팔았지만, 결국 가장 중요한 정보는 내 자신이었어.',
    context: 'trust_build',
  },
  // 이그나 (Ch3)
  {
    obsidianId: 'ignara_first',
    gameNpcId: 'npc_ignara',
    chapter: 3,
    line: '아버지 이그리스가 기억을 잃기 전, 마지막으로 한 말이 있어. "이프리타의 불꽃은 멈추지 않는다."',
    context: 'first_meet',
  },
  // 베르나르도 (Ch4 배신)
  {
    obsidianId: 'bernardo_betrayal',
    gameNpcId: 'npc_bernardo',
    chapter: 4,
    line: '미안해, 에리언. 나는 처음부터 레테 교단의 사람이었어. 밀리아를 위해서였지만, 결국...',
    context: 'betrayal',
  },
  {
    obsidianId: 'bernardo_final',
    gameNpcId: 'npc_bernardo_final',
    chapter: 4,
    line: '나를 구원하지 마. 나는 이미 너무 멀리 와버렸어.',
    context: 'final',
  },
  // 레이나 (Ch4)
  {
    obsidianId: 'reina_first',
    gameNpcId: 'npc_reina',
    chapter: 4,
    line: '레테 교단의 진정한 목표는 구원이 아니야. 신을 강림시키는 것이지.',
    context: 'first_meet',
  },
  // 우르그롬 (Ch4)
  {
    obsidianId: 'urgrom_first',
    gameNpcId: 'npc_urgrom',
    chapter: 4,
    line: '북방 기억석 사원은 200년 전 봉인의 마지막 보루야. 여기까지 와줘서 고맙다.',
    context: 'first_meet',
  },
  // SYNC-21: Ch2 실반헤임 narrative
  {
    obsidianId: 'silvanheim_elder',
    gameNpcId: 'npc_silvanheim_elder',
    chapter: 2,
    line: '말라투스는 수천 년 동안 우리의 기억을 지켜왔다. 이 숲 안에서는 망각의 폭풍도 들어오지 못해.',
    context: 'first_meet',
  },
  {
    obsidianId: 'seraphine_silvanheim_memory',
    gameNpcId: 'npc_seraphine',
    chapter: 2,
    line: '카엘... 내 죽은 연인이야. 말라투스가 그의 마지막 기억을 보여줬어. 그가 봉인 의식의 12인 중 하나였다는 걸.',
    context: 'trust_build',
  },
  // SYNC-21: Ch5 망각의 고원 narrative
  {
    obsidianId: 'kail_past_meet',
    gameNpcId: 'npc_kail',
    chapter: 5,
    line: '내가 너야. 200년 전, 봉인의 의식을 마지막으로 주도한 카일. 그리고 너는 나의 환생.',
    context: 'first_meet',
  },
  {
    obsidianId: 'lethe_final',
    gameNpcId: 'npc_lethe',
    chapter: 5,
    line: '기억은 고통이다. 망각이 곧 구원이다. 너희들이 거부하는 자비를 내가 강제로 주겠다.',
    context: 'final',
  },
  {
    obsidianId: 'minerva_encounter',
    gameNpcId: 'npc_minerva',
    chapter: 5,
    line: '에리언이여, 너는 신화의 시대를 다시 열어주는 자다. 내가 11신의 의지를 너에게 맡기겠다.',
    context: 'first_meet',
  },
  // SYNC-37: Ch3 솔라리스 추가 대화
  {
    obsidianId: 'ignara_father',
    gameNpcId: 'npc_ignara',
    chapter: 3,
    line: '아버지가 마지막으로 한 말... "이프리타의 불꽃은 어둠에 굴복하지 않는다." 나는 그 의미를 이제 알 것 같아.',
    context: 'trust_build',
  },
  {
    obsidianId: 'dario_pen',
    gameNpcId: 'npc_dario_pen',
    chapter: 3,
    line: '나는 솔리안 유적 발굴자다. 라와르 왕의 봉인 위치를 알지만, 깨우는 것이 옳은지는 모르겠다.',
    context: 'first_meet',
  },
  // SYNC-37: Ch4 추가 대화 (베르나르도 + 황제)
  {
    obsidianId: 'emperor_lenardo',
    gameNpcId: 'npc_emperor_lenardo',
    chapter: 4,
    line: '나는 황제다. 그리고 동시에 레테의 그릇이지. 너는 나를 죽일 수 있겠나, 에리언?',
    context: 'first_meet',
  },
];

export function getDialoguesByNpc(gameNpcId: string): readonly NpcDialogue[] {
  return SCENARIO_DIALOGUES.filter((d) => d.gameNpcId === gameNpcId);
}

export function getDialoguesByChapter(chapter: number): readonly NpcDialogue[] {
  return SCENARIO_DIALOGUES.filter((d) => d.chapter === chapter);
}

export function getDialoguesByContext(
  context: NpcDialogue['context'],
): readonly NpcDialogue[] {
  return SCENARIO_DIALOGUES.filter((d) => d.context === context);
}

// ════════════════════════════════════════════════════════════════
// SYNC-19: 신화 유물 SSOT + 엔딩 D 조건 narrative
// 출처: 01_코어기획/엔딩D_유물_목록.md
// ════════════════════════════════════════════════════════════════

export interface MythicRelic {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 봉인 위치 (zone obsidianId) */
  zoneObsidianId: string;
  /** 어느 신과 연결되는가 (deity obsidianId) */
  deityObsidianId: string;
  /** 게임 item id (있을 경우) */
  gameItemId?: string;
}

export const SCENARIO_MYTHIC_RELICS: readonly MythicRelic[] = [
  {
    obsidianId: 'relic_chronai_hourglass',
    name: '크로나이의 모래시계',
    zoneObsidianId: 'argentium',
    deityObsidianId: 'chronai',
  },
  {
    obsidianId: 'relic_ignarus_flame',
    name: '이그나루스의 영원불꽃',
    zoneObsidianId: 'solaris',
    deityObsidianId: 'ignarus',
  },
  {
    obsidianId: 'relic_verda_seed',
    name: '베르다의 생명 씨앗',
    zoneObsidianId: 'silvanheim',
    deityObsidianId: 'verda',
  },
  {
    obsidianId: 'relic_akius_lantern',
    name: '아키우스의 별빛 등불',
    zoneObsidianId: 'erebos',
    deityObsidianId: 'akius',
  },
];

/** 엔딩 D 미네르바 만남 조건 — 신화 유물 ≥ 2 + 특정 zone 탐사 */
export interface MinervaEncounterCondition {
  /** 필요 신화 유물 최소 개수 */
  minMythicRelics: number;
  /** 필요 zone 탐사 (Obsidian zone obsidianId) */
  requiredZones: readonly string[];
}

export const MINERVA_ENCOUNTER: MinervaEncounterCondition = {
  minMythicRelics: 2,
  requiredZones: ['golden_ether_tower'],
};

export function getMythicRelicByObsidianId(
  obsidianId: string,
): MythicRelic | undefined {
  return SCENARIO_MYTHIC_RELICS.find((r) => r.obsidianId === obsidianId);
}

export function listRelicsByDeity(deityObsidianId: string): readonly MythicRelic[] {
  return SCENARIO_MYTHIC_RELICS.filter((r) => r.deityObsidianId === deityObsidianId);
}

/** 엔딩 D 달성 조건 — 신화 유물 + 미네르바 만남 검증 */
export function canEncounterMinerva(
  collectedRelics: ReadonlySet<string>,
  exploredZones: ReadonlySet<string>,
): boolean {
  const relicCount = SCENARIO_MYTHIC_RELICS.filter((r) =>
    collectedRelics.has(r.obsidianId),
  ).length;
  if (relicCount < MINERVA_ENCOUNTER.minMythicRelics) return false;
  for (const z of MINERVA_ENCOUNTER.requiredZones) {
    if (!exploredZones.has(z)) return false;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════
// SYNC-22: 외전 문서 SSOT — 편지 / 도서 / 기억 조각
// 출처: 시나리오/세계관외전/세계관_외전_문서.md
// ════════════════════════════════════════════════════════════════

export type LoreDocumentType = 'letter' | 'book' | 'memory_fragment';

export interface LoreDocument {
  obsidianId: string;
  /** 문서 종류 */
  type: LoreDocumentType;
  /** 한글 제목 */
  title: string;
  /** 발견 zone (있을 경우) */
  zoneObsidianId?: string;
  /** 챕터 (게임 진행 추천) */
  chapter?: number;
  /** 짧은 요약 */
  summary: string;
}

export const SCENARIO_LORE_DOCUMENTS: readonly LoreDocument[] = [
  // 편지 시리즈
  {
    obsidianId: 'letter_001',
    type: 'letter',
    title: '[편지 001] 에테르나 신화 — 열두 신의 창세기',
    chapter: 1,
    summary: '12 신 창세 기록. 레테 배제 narrative 명시.',
  },
  {
    obsidianId: 'letter_002',
    type: 'letter',
    title: '[편지 002] 기억 사냥꾼의 비밀 보고서',
    chapter: 4,
    summary: '기억 사냥꾼 케인 부대 활동 기록.',
  },
  {
    obsidianId: 'letter_003',
    type: 'letter',
    title: '[편지 003] 황제 레나르도 4세 유언장',
    chapter: 4,
    summary: '제국 황제의 마지막 유언, 레테 교단 침투 경고.',
  },
  {
    obsidianId: 'letter_004',
    type: 'letter',
    title: '[편지 004] 레테 교단 입단 서약문',
    chapter: 1,
    summary: '교단 비밀 입단 의식 서약문, 망각의 구원론.',
  },
  {
    obsidianId: 'letter_005',
    type: 'letter',
    title: '[편지 005] 마에스트로 크리오의 일기',
    chapter: 1,
    summary: '200년 생존자의 60년 정보상 활동 회고.',
  },
  // 도서 시리즈
  {
    obsidianId: 'book_001',
    type: 'book',
    title: '[도서 001] 에테르나 신화 전집',
    summary: '12 신 + 에테르 결정 + 솔리안 문명 통합 신화 기록.',
  },
  {
    obsidianId: 'book_002',
    type: 'book',
    title: '[도서 002] 대망각의 날 사서 일기',
    chapter: 1,
    zoneObsidianId: 'erebos',
    summary: '에레보스 도서관 사서의 200년 전 마지막 일기.',
  },
  {
    obsidianId: 'book_003',
    type: 'book',
    title: '[도서 003] 솔리안 문명사',
    chapter: 3,
    zoneObsidianId: 'solaris',
    summary: '솔리안 황금기 + 레테 강림 + 라와르 봉인 의식 기록.',
  },
  {
    obsidianId: 'book_004',
    type: 'book',
    title: '[도서 004] 레테 교단의 역사적 기원',
    chapter: 4,
    summary: '레테 교단 형성 + 제국 침투 + 망각의 구원론 형성사.',
  },
  // 기억 조각 시리즈
  {
    obsidianId: 'memory_fragment_kail',
    type: 'memory_fragment',
    title: '카일의 과거 기억 조각',
    chapter: 5,
    summary: '에리언의 전생 카일의 200년 전 봉인 의식 기억.',
  },
  {
    obsidianId: 'memory_fragment_great_night',
    type: 'memory_fragment',
    title: '대망각 당일 밤의 기억편',
    chapter: 1,
    zoneObsidianId: 'erebos',
    summary: '에레보스 시민들의 마지막 순간 기억 조각.',
  },
];

export function getLoreDocumentByObsidianId(
  obsidianId: string,
): LoreDocument | undefined {
  return SCENARIO_LORE_DOCUMENTS.find((d) => d.obsidianId === obsidianId);
}

export function listLoreDocumentsByType(
  type: LoreDocumentType,
): readonly LoreDocument[] {
  return SCENARIO_LORE_DOCUMENTS.filter((d) => d.type === type);
}

export function listLoreDocumentsByChapter(chapter: number): readonly LoreDocument[] {
  return SCENARIO_LORE_DOCUMENTS.filter((d) => d.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-24: 시나리오 worldmap zone connections + 동선 narrative
// 출처: 시나리오/챕터/* + 01_코어기획/worldmap_design.md
// ════════════════════════════════════════════════════════════════

export interface ZoneConnection {
  /** 출발 zone obsidianId */
  from: string;
  /** 도착 zone obsidianId */
  to: string;
  /** 이동 narrative 설명 */
  travel: string;
  /** 잠금 해제 조건 (선행 chapter 또는 quest) */
  unlockCondition?: string;
}

export const SCENARIO_ZONE_CONNECTIONS: readonly ZoneConnection[] = [
  // Ch1 — 칸텔라 → 에레보스
  {
    from: 'cantela_village',
    to: 'erebos',
    travel: '칸텔라 마을에서 망각의 고원 기슭을 따라 도보 1일.',
    unlockCondition: 'MQ_CH01',
  },
  // Ch1→Ch2 — 에레보스 → 실반헤임
  {
    from: 'erebos',
    to: 'silvanheim',
    travel: '에레보스에서 동부 대륙 끝까지 약 7일. 엘파리스 영역 진입 외교 필요.',
    unlockCondition: 'SQ_EREBOS_RUINS',
  },
  // Ch2 — 실반헤임 → 말라투스 영역
  {
    from: 'silvanheim',
    to: 'malatus_grove',
    travel: '실반헤임 깊숙이 시간 지연 구역 통과 (1일 = 외부 3시간).',
    unlockCondition: 'MQ_CH03',
  },
  // Ch2→Ch3 — 실반헤임 → 솔라리스
  {
    from: 'silvanheim',
    to: 'solaris',
    travel: '실반헤임에서 남부 사막으로 약 10일. 신기루 + 에테르 발광 위험.',
    unlockCondition: 'SQ_SILVANHEIM_FRAGMENT',
  },
  // Ch3→Ch4 — 솔라리스 → 아르겐티움
  {
    from: 'solaris',
    to: 'argentium',
    travel: '솔라리스에서 중북부 평원으로 약 5일. 제국 검문소 통과 필요.',
    unlockCondition: 'SQ_SOLARIS_RAWAR',
  },
  // Ch4 — 아르겐티움 → 팔라티노 지하
  {
    from: 'argentium',
    to: 'palatino_lab',
    travel: '아르겐티움 황궁 지하 비밀 통로 진입.',
    unlockCondition: 'MQ_CH04',
  },
  // Ch4→Ch5 — 아르겐티움 → 망각의 고원
  {
    from: 'argentium',
    to: 'oblivion_plateau',
    travel: '아르겐티움에서 중앙-동부 경계 절벽 위로 약 3일. 현실 붕괴 시작.',
    unlockCondition: 'SQ_ARGENTIUM_FRAGMENT',
  },
  // Ch5 — 망각의 고원 → 황금 에테르 탑
  {
    from: 'oblivion_plateau',
    to: 'golden_ether_tower',
    travel: '고원 정상의 황금 탑 등반. 시간 왜곡 + 과거와 현재 겹침.',
    unlockCondition: 'MQ_CH13',
  },
];

export function getConnectionsFromZone(
  fromObsidianId: string,
): readonly ZoneConnection[] {
  return SCENARIO_ZONE_CONNECTIONS.filter((c) => c.from === fromObsidianId);
}

export function getConnectionsToZone(
  toObsidianId: string,
): readonly ZoneConnection[] {
  return SCENARIO_ZONE_CONNECTIONS.filter((c) => c.to === toObsidianId);
}

/** 챕터 진행 동선 — 시작 → 종결 zone 경로 */
export interface ChapterRoute {
  chapter: number;
  startZoneId: string;
  endZoneId: string;
}

export const SCENARIO_CHAPTER_ROUTES: readonly ChapterRoute[] = [
  { chapter: 1, startZoneId: 'cantela_village', endZoneId: 'erebos' },
  { chapter: 2, startZoneId: 'silvanheim',      endZoneId: 'malatus_grove' },
  { chapter: 3, startZoneId: 'solaris',         endZoneId: 'solaris' },
  { chapter: 4, startZoneId: 'argentium',       endZoneId: 'palatino_lab' },
  { chapter: 5, startZoneId: 'oblivion_plateau', endZoneId: 'golden_ether_tower' },
];

export function getRouteByChapter(chapter: number): ChapterRoute | undefined {
  return SCENARIO_CHAPTER_ROUTES.find((r) => r.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-27: SSOT 종합 보고서 generator + entity index helper
// ════════════════════════════════════════════════════════════════

export interface ScenarioRegistryStats {
  companions: number;
  zones: number;
  bosses: number;
  chapters: number;
  endings: number;
  fragments: number;
  deities: number;
  timeline: number;
  milestones: number;
  dialogues: number;
  reputationRewards: number;
  mythicRelics: number;
  loreDocuments: number;
  zoneConnections: number;
  chapterRoutes: number;
  /** SYNC-48: chapter III/V 신규 도메인 추가 */
  extraZones: number;
  extraBosses: number;
  classMappings: number;
  chapterRewards: number;
  storyArcs: number;
  chapterBgms: number;
  subPlots: number;
  chapterDifficulties: number;
  chapterVisuals: number;
  epicItems: number;
  /** 합계 (25 도메인) */
  totalEntities: number;
}

export function getScenarioRegistryStats(): ScenarioRegistryStats {
  const companions = SCENARIO_COMPANIONS.length;
  const zones = SCENARIO_ZONES.length;
  const bosses = SCENARIO_BOSSES.length;
  const chapters = SCENARIO_CHAPTERS.length;
  const endings = SCENARIO_ENDINGS.length;
  const fragments = SCENARIO_FRAGMENTS.length;
  const deities = SCENARIO_DEITIES.length;
  const timeline = SCENARIO_TIMELINE.length;
  const milestones = SCENARIO_MILESTONES.length;
  const dialogues = SCENARIO_DIALOGUES.length;
  const reputationRewards = COMPANION_REPUTATION_REWARDS.length;
  const mythicRelics = SCENARIO_MYTHIC_RELICS.length;
  const loreDocuments = SCENARIO_LORE_DOCUMENTS.length;
  const zoneConnections = SCENARIO_ZONE_CONNECTIONS.length;
  const chapterRoutes = SCENARIO_CHAPTER_ROUTES.length;
  // SYNC-48: 신규 도메인 추가
  const extraZones = SCENARIO_EXTRA_ZONES.length;
  const extraBosses = SCENARIO_EXTRA_BOSSES.length;
  const classMappings = COMPANION_CLASS_MAPPINGS.length;
  const chapterRewards = SCENARIO_CHAPTER_REWARDS.length;
  const storyArcs = COMPANION_STORY_ARCS.length;
  const chapterBgms = SCENARIO_CHAPTER_BGMS.length;
  const subPlots = SCENARIO_SUB_PLOTS.length;
  const chapterDifficulties = SCENARIO_CHAPTER_DIFFICULTIES.length;
  const chapterVisuals = SCENARIO_CHAPTER_VISUALS.length;
  const epicItems = SCENARIO_EPIC_ITEMS.length;
  const totalEntities =
    companions + zones + bosses + chapters + endings + fragments +
    deities + timeline + milestones + dialogues + reputationRewards +
    mythicRelics + loreDocuments + zoneConnections + chapterRoutes +
    extraZones + extraBosses + classMappings + chapterRewards + storyArcs +
    chapterBgms + subPlots + chapterDifficulties + chapterVisuals + epicItems;
  return {
    companions, zones, bosses, chapters, endings, fragments, deities,
    timeline, milestones, dialogues, reputationRewards, mythicRelics,
    loreDocuments, zoneConnections, chapterRoutes,
    extraZones, extraBosses, classMappings, chapterRewards, storyArcs,
    chapterBgms, subPlots, chapterDifficulties, chapterVisuals, epicItems,
    totalEntities,
  };
}

/** 전체 obsidianId index — 빠른 entity lookup (SYNC-46 확장) */
export function buildScenarioIndex(): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  SCENARIO_COMPANIONS.forEach((c) => index.set(c.obsidianId, 'companion'));
  SCENARIO_ZONES.forEach((z) => index.set(z.obsidianId, 'zone'));
  SCENARIO_BOSSES.forEach((b) => index.set(b.obsidianId, 'boss'));
  SCENARIO_FRAGMENTS.forEach((f) => index.set(f.obsidianId, 'fragment'));
  SCENARIO_DEITIES.forEach((d) => index.set(d.obsidianId, 'deity'));
  SCENARIO_TIMELINE.forEach((t) => index.set(t.obsidianId, 'timeline'));
  SCENARIO_DIALOGUES.forEach((d) => index.set(d.obsidianId, 'dialogue'));
  SCENARIO_MYTHIC_RELICS.forEach((r) => index.set(r.obsidianId, 'relic'));
  SCENARIO_LORE_DOCUMENTS.forEach((l) => index.set(l.obsidianId, 'lore'));
  // SYNC-46: 신규 도메인 추가
  SCENARIO_SUB_PLOTS.forEach((s) => index.set(s.obsidianId, 'sub_plot'));
  SCENARIO_EPIC_ITEMS.forEach((i) => index.set(i.obsidianId, 'epic_item'));
  return index;
}

/** obsidianId 로 entity 타입 조회 */
export function resolveEntityType(obsidianId: string): string | undefined {
  return buildScenarioIndex().get(obsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-33: chronoField extension — Obsidian 전용 zone/보스 SSOT
// (기존 chronoField 7×3=21 cross-product 변경 없이 별도 추가)
// ════════════════════════════════════════════════════════════════

export interface ScenarioExtraZone {
  obsidianId: string;
  name: string;
  /** Obsidian chapter (Ch1~Ch5) */
  chapter: number;
  /** chronoField 와 별개의 extension zone id */
  extensionZoneId: string;
}

/** chronoField 에 없지만 Obsidian narrative 에서만 등장하는 zone */
export const SCENARIO_EXTRA_ZONES: readonly ScenarioExtraZone[] = [
  {
    obsidianId: 'erebos',
    name: '에레보스 (대망각 진원지 폐허)',
    chapter: 1,
    extensionZoneId: 'erebos_ruins',
  },
  {
    obsidianId: 'solaris',
    name: '솔라리스 사막 (이프리타 영역)',
    chapter: 3,
    extensionZoneId: 'solaris_dunes',
  },
];

export interface ScenarioExtraBoss {
  obsidianId: string;
  name: string;
  /** chronoField 와 별개의 extension boss id */
  extensionBossId: string;
  /** 페이즈 수 (Obsidian narrative) */
  phases: number;
}

/** chronoField 에 없지만 Obsidian narrative 에서만 등장하는 보스 */
export const SCENARIO_EXTRA_BOSSES: readonly ScenarioExtraBoss[] = [
  {
    obsidianId: 'rawar',
    name: '라와르 (솔리안의 마지막 왕, 200년 봉인)',
    extensionBossId: 'rawar_ancient_king',
    phases: 3,
  },
];

export function getExtraZoneByObsidianId(
  obsidianId: string,
): ScenarioExtraZone | undefined {
  return SCENARIO_EXTRA_ZONES.find((z) => z.obsidianId === obsidianId);
}

export function getExtraBossByObsidianId(
  obsidianId: string,
): ScenarioExtraBoss | undefined {
  return SCENARIO_EXTRA_BOSSES.find((b) => b.obsidianId === obsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-34: 동료 ↔ 게임 클래스 narrative 매핑
// SCENARIO_COMPANIONS (Obsidian 인물) ↔ skillSeeds 6 클래스
// ════════════════════════════════════════════════════════════════

export type GameClass =
  | 'ether_knight'
  | 'time_knight'
  | 'shadow_weaver'
  | 'memory_weaver'
  | 'time_guardian'
  | 'void_wanderer'
  | 'memory_breaker';

export interface CompanionClassMapping {
  companionObsidianId: string;
  /** 동료의 게임 클래스 (Obsidian role narrative 기반 매핑) */
  gameClass: GameClass;
  /** 매핑 근거 narrative */
  rationale: string;
}

export const COMPANION_CLASS_MAPPINGS: readonly CompanionClassMapping[] = [
  {
    companionObsidianId: 'seraphine',
    gameClass: 'time_knight',
    rationale: '엘파리스 정찰병 — 빠른 시간 기반 검술 + 정찰 narrative',
  },
  {
    companionObsidianId: 'maestro_crio',
    gameClass: 'memory_weaver',
    rationale: '200년 생존자 정보상 — 기억 직조 + 정보 분석 narrative',
  },
  {
    companionObsidianId: 'ignara',
    gameClass: 'ether_knight',
    rationale: '이프리타 족장의 딸 — 에테르 결정 + 불꽃 시그니처',
  },
  {
    companionObsidianId: 'benjamin_cross',
    gameClass: 'shadow_weaver',
    rationale: '전직 형사 / 정보 담당 — 그림자 정보 수집 + 베르나르도 타락 narrative',
  },
  {
    companionObsidianId: 'reina',
    gameClass: 'memory_breaker',
    rationale: '레테 교단 내부고발자 — 교단 기억 봉인 파괴 narrative',
  },
  {
    companionObsidianId: 'urgrom',
    gameClass: 'time_guardian',
    rationale: '북방 기억석 사원 수호자 — 시간 봉인 수호 narrative',
  },
];

export function getCompanionClass(
  companionObsidianId: string,
): GameClass | undefined {
  return COMPANION_CLASS_MAPPINGS.find(
    (m) => m.companionObsidianId === companionObsidianId,
  )?.gameClass;
}

export function listCompanionsByClass(
  gameClass: GameClass,
): readonly CompanionClassMapping[] {
  return COMPANION_CLASS_MAPPINGS.filter((m) => m.gameClass === gameClass);
}

// ════════════════════════════════════════════════════════════════
// SYNC-35: 챕터별 종결 보상 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterReward {
  chapter: number;
  /** 챕터 종결 시 unlock 되는 game feature */
  unlockedFeature: string;
  /** 챕터 종결 보상 narrative */
  narrativeReward: string;
  /** 종결 후 진입 가능한 다음 zone (worldmap 동선) */
  nextZoneId?: string;
}

export const SCENARIO_CHAPTER_REWARDS: readonly ChapterReward[] = [
  {
    chapter: 1,
    unlockedFeature: '동료 시스템 + 신뢰도',
    narrativeReward: '첫 신성 기억 파편 (에레보스) + 세라핀/크리오 합류 + 기억 공명 능력 각성',
    nextZoneId: 'silvanheim',
  },
  {
    chapter: 2,
    unlockedFeature: '시간 지연 메커닉 + 말라투스 보스 패턴',
    narrativeReward: '실반헤임 파편 + 카엘 회상 + 엘파리스 외교 분기',
    nextZoneId: 'solaris',
  },
  {
    chapter: 3,
    unlockedFeature: '에테르 발광 + 신기루 메커닉 + 채광 기지 작전',
    narrativeReward: '솔라리스 파편 (라와르) + 이그나 합류 + 케인 추적 시작',
    nextZoneId: 'argentium',
  },
  {
    chapter: 4,
    unlockedFeature: '동료 이탈 분기 + 황금 에테르 탑 메커닉',
    narrativeReward: '아르겐티움 파편 + 벤자민/레이나/우르그롬 합류 + 케인/베르나르도 처치',
    nextZoneId: 'oblivion_plateau',
  },
  {
    chapter: 5,
    unlockedFeature: '현실 붕괴 + 다중 시간선 + 멀티 엔딩',
    narrativeReward: '4 파편 통합 + 레테 5페이즈 보스전 + 엔딩 A/B/C/D 분기',
  },
];

export function getChapterRewardByChapter(
  chapter: number,
): ChapterReward | undefined {
  return SCENARIO_CHAPTER_REWARDS.find((r) => r.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-36: 동료 개인 서사 personal story arc
// 각 동료의 깊은 이야기 + 핵심 회상 narrative
// ════════════════════════════════════════════════════════════════

export interface CompanionStoryArc {
  companionObsidianId: string;
  /** 개인 서사 핵심 비밀 / 회상 */
  coreSecret: string;
  /** 서사 노출 챕터 */
  revealChapter: number;
  /** 개인 서사 이탈 분기 narrative */
  betrayalRisk: string;
}

export const COMPANION_STORY_ARCS: readonly CompanionStoryArc[] = [
  {
    companionObsidianId: 'seraphine',
    coreSecret: '죽은 연인 카엘이 200년 전 봉인 의식 12인 중 한 명이었음',
    revealChapter: 2,
    betrayalRisk: '카엘의 진실 노출 시 엘파리스 외교 거부 가능성',
  },
  {
    companionObsidianId: 'maestro_crio',
    coreSecret: '대망각 당일 갓난아기로 살아남은 에레보스 유일 생존자, 60년 정보상',
    revealChapter: 1,
    betrayalRisk: '제국 침투 작전 거부 시 이탈 (Ch4)',
  },
  {
    companionObsidianId: 'ignara',
    coreSecret: '아버지 이그리스의 기억 소멸 원인이 이프리타 종족 내부 음모',
    revealChapter: 3,
    betrayalRisk: '신뢰도 20 미만 시 Ch4 합류 거부',
  },
  {
    companionObsidianId: 'benjamin_cross',
    coreSecret: '레테 교단 침투 정보원, 조카 밀리아가 교단에 잡혀있음',
    revealChapter: 4,
    betrayalRisk: '화해 거부 시 베르나르도 타락 → boss_bernardo_corrupted',
  },
  {
    companionObsidianId: 'reina',
    coreSecret: '레테 교단의 진짜 목적 = 12 신화 시대 회귀 (엔딩 D 단서)',
    revealChapter: 4,
    betrayalRisk: '교단 이탈 실패 시 Ch5 진입 전 이탈',
  },
  {
    companionObsidianId: 'urgrom',
    coreSecret: '북방 기억석 사원의 마지막 수호자, 200년 봉인 의식의 마지막 단서',
    revealChapter: 4,
    betrayalRisk: '북방 방문 미달 시 합류 거부',
  },
];

export function getStoryArcByCompanion(
  companionObsidianId: string,
): CompanionStoryArc | undefined {
  return COMPANION_STORY_ARCS.find(
    (a) => a.companionObsidianId === companionObsidianId,
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-37: 시나리오 BGM 매핑 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterBgm {
  chapter: number;
  /** 게임 BGM trackId */
  gameBgmTrack: string;
  /** BGM 분위기 narrative */
  mood: string;
}

export const SCENARIO_CHAPTER_BGMS: readonly ChapterBgm[] = [
  {
    chapter: 1,
    gameBgmTrack: 'bgm_erebos_ruins',
    mood: '에레보스 폐허 — 절망 + 200년 침묵',
  },
  {
    chapter: 2,
    gameBgmTrack: 'bgm_silvanheim_forest',
    mood: '실반헤임 — 신비 + 기억 수호',
  },
  {
    chapter: 3,
    gameBgmTrack: 'bgm_solaris_desert',
    mood: '솔라리스 사막 — 불꽃 + 거리감',
  },
  {
    chapter: 4,
    gameBgmTrack: 'bgm_argentium_palace',
    mood: '아르겐티움 황궁 — 음모 + 배신',
  },
  {
    chapter: 5,
    gameBgmTrack: 'bgm_final_boss',
    mood: '망각의 고원 — 최종 결전',
  },
];

export function getBgmByChapter(chapter: number): ChapterBgm | undefined {
  return SCENARIO_CHAPTER_BGMS.find((b) => b.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-38: 시나리오 sub-plot narrative
// 각 챕터별 메인 외 부 이야기 + 선택 분기 narrative
// ════════════════════════════════════════════════════════════════

export interface SubPlot {
  obsidianId: string;
  chapter: number;
  /** 한글 제목 */
  title: string;
  /** 핵심 narrative */
  narrative: string;
  /** 관련 동료 obsidianId (있을 경우) */
  relatedCompanion?: string;
}

export const SCENARIO_SUB_PLOTS: readonly SubPlot[] = [
  {
    obsidianId: 'subplot_ch1_seraphine_first',
    chapter: 1,
    title: '세라핀의 첫 신뢰',
    narrative: '에레보스 폐허 진입 전 세라핀의 카엘 회상이 처음 노출되는 회상 씬.',
    relatedCompanion: 'seraphine',
  },
  {
    obsidianId: 'subplot_ch2_elfaris_diplomacy',
    chapter: 2,
    title: '엘파리스 외교 분기',
    narrative: '엘파리스 영역 진입 시 평화/전투 선택지. 신뢰도 영향.',
  },
  {
    obsidianId: 'subplot_ch3_ifrita_mine',
    chapter: 3,
    title: '이프리타 채광 기지 작전',
    narrative: '제국 채광 기지를 정면 공격 vs 내부 공작 선택지. 이그나 신뢰도 영향.',
    relatedCompanion: 'ignara',
  },
  {
    obsidianId: 'subplot_ch3_rawar_choice',
    chapter: 3,
    title: '라와르의 처리',
    narrative: '라와르 봉인 해방 vs 재봉인 선택지. 솔라리스 파편 회수 방식.',
  },
  {
    obsidianId: 'subplot_ch4_bernardo_reconcile',
    chapter: 4,
    title: '베르나르도 화해/배신',
    narrative: '베르나르도 화해 선택 시 생존, 배신 선택 시 boss_bernardo_corrupted 분기.',
    relatedCompanion: 'benjamin_cross',
  },
  {
    obsidianId: 'subplot_ch4_urgrom_north',
    chapter: 4,
    title: '북방 기억석 사원 방문',
    narrative: '우르그롬 합류를 위한 북방 사원 방문 필수 분기. 미방문 시 엔딩 A 불가.',
    relatedCompanion: 'urgrom',
  },
  {
    obsidianId: 'subplot_ch5_kail_meet',
    chapter: 5,
    title: '카일과의 정신적 대면',
    narrative: '망각의 고원에서 200년 전 자신 카일과 정신적 만남. 봉인 의식 재현 결심.',
  },
];

export function getSubPlotsByChapter(chapter: number): readonly SubPlot[] {
  return SCENARIO_SUB_PLOTS.filter((s) => s.chapter === chapter);
}

export function listSubPlotsByCompanion(
  companionObsidianId: string,
): readonly SubPlot[] {
  return SCENARIO_SUB_PLOTS.filter(
    (s) => s.relatedCompanion === companionObsidianId,
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-41: 챕터 난이도 + 권장 레벨 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterDifficulty {
  chapter: number;
  /** 권장 최소 레벨 (Ch1 = 1 시작) */
  recommendedMinLevel: number;
  /** 권장 최대 레벨 */
  recommendedMaxLevel: number;
  /** 챕터 보스 난이도 (1~5) */
  bossDifficulty: number;
  /** 난이도 narrative */
  description: string;
}

export const SCENARIO_CHAPTER_DIFFICULTIES: readonly ChapterDifficulty[] = [
  {
    chapter: 1,
    recommendedMinLevel: 1,
    recommendedMaxLevel: 5,
    bossDifficulty: 1,
    description: '초반 진입 — 기억의 골렘 (chronoField ancient_relic_golem)',
  },
  {
    chapter: 2,
    recommendedMinLevel: 6,
    recommendedMaxLevel: 12,
    bossDifficulty: 2,
    description: '실반헤임 — 말라투스 3페이즈 (malatus_avatar)',
  },
  {
    chapter: 3,
    recommendedMinLevel: 13,
    recommendedMaxLevel: 22,
    bossDifficulty: 3,
    description: '솔라리스 — 라와르 3페이즈 (rawar_ancient_king)',
  },
  {
    chapter: 4,
    recommendedMinLevel: 23,
    recommendedMaxLevel: 40,
    bossDifficulty: 4,
    description: '아르겐티움 — 케인 + 베르나르도 (boss_bernardo_corrupted)',
  },
  {
    chapter: 5,
    recommendedMinLevel: 41,
    recommendedMaxLevel: 60,
    bossDifficulty: 5,
    description: '망각의 고원 — 레테 5페이즈 (aetherna_collapse / boss_oblivion_lord)',
  },
];

export function getDifficultyByChapter(
  chapter: number,
): ChapterDifficulty | undefined {
  return SCENARIO_CHAPTER_DIFFICULTIES.find((d) => d.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-43: 챕터별 시각/의상 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterVisual {
  chapter: number;
  /** 챕터 주 색상 (UI 테마) */
  primaryColor: string;
  /** 챕터 분위기 시각 narrative */
  visualMood: string;
  /** 에리언 의상 변화 (있을 경우) */
  aerienOutfit?: string;
}

export const SCENARIO_CHAPTER_VISUALS: readonly ChapterVisual[] = [
  {
    chapter: 1,
    primaryColor: '#4a4a52', // 에레보스 회색
    visualMood: '폐허/적적/안개 — 회색 톤 + 붉은 안개',
    aerienOutfit: '여행자 망토 — 초반 기본 의상',
  },
  {
    chapter: 2,
    primaryColor: '#2d5a3d', // 실반헤임 녹색
    visualMood: '숲/신비/시간 지연 — 녹색 + 황금빛 햇살',
    aerienOutfit: '엘파리스 망토 (외교 시)',
  },
  {
    chapter: 3,
    primaryColor: '#c9683a', // 솔라리스 주황
    visualMood: '사막/불꽃/신기루 — 주황 + 붉은 에테르 발광',
    aerienOutfit: '사막 의상 — 이프리타 천 망토',
  },
  {
    chapter: 4,
    primaryColor: '#1a3a6e', // 아르겐티움 청색
    visualMood: '제국 황궁/음모/금속 — 청색 + 황금 장식',
    aerienOutfit: '제국 침투복 + 가면',
  },
  {
    chapter: 5,
    primaryColor: '#9b4f96', // 망각의 고원 보라
    visualMood: '현실 붕괴/시간 왜곡 — 보라 + 분열된 색조',
    aerienOutfit: '카일 봉인 의식복 (전생 의상)',
  },
];

export function getVisualByChapter(chapter: number): ChapterVisual | undefined {
  return SCENARIO_CHAPTER_VISUALS.find((v) => v.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-44: 시나리오 epic 아이템 narrative
// ════════════════════════════════════════════════════════════════

export interface EpicItem {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 회수 챕터 */
  chapter: number;
  /** 게임 item id */
  gameItemId: string;
  /** 시그니처 narrative */
  narrative: string;
}

export const SCENARIO_EPIC_ITEMS: readonly EpicItem[] = [
  {
    obsidianId: 'item_kail_pendant',
    name: '카일의 펜던트',
    chapter: 1,
    gameItemId: 'item_kail_pendant',
    narrative: '에리언이 카일의 전생 기억과 공명하는 시작 아이템',
  },
  {
    obsidianId: 'item_malatus_seed',
    name: '말라투스 씨앗',
    chapter: 2,
    gameItemId: 'item_malatus_seed',
    narrative: '말라투스 고목에서 받은 기억 보호 아티팩트',
  },
  {
    obsidianId: 'item_rawar_crown',
    name: '라와르 왕관',
    chapter: 3,
    gameItemId: 'item_rawar_crown',
    narrative: '솔리안 왕의 봉인 의식 상징, 라와르 처리 분기 보상',
  },
  {
    obsidianId: 'item_argentium_seal',
    name: '아르겐티움 황궁 인장',
    chapter: 4,
    gameItemId: 'item_argentium_seal',
    narrative: '제국 잠입 작전의 핵심 증거 + 황금 에테르 탑 진입 키',
  },
  {
    obsidianId: 'item_aetherna_chronicle',
    name: '에테르나 크로니클',
    chapter: 5,
    gameItemId: 'item_aetherna_chronicle',
    narrative: '게임 제목 시그니처 — 4 파편 통합 후 생성되는 최종 신성 유물',
  },
];

export function getEpicItemByObsidianId(
  obsidianId: string,
): EpicItem | undefined {
  return SCENARIO_EPIC_ITEMS.find((i) => i.obsidianId === obsidianId);
}

export function getEpicItemsByChapter(chapter: number): readonly EpicItem[] {
  return SCENARIO_EPIC_ITEMS.filter((i) => i.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-51: 챕터별 추천 동료 조합 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterPartyComposition {
  chapter: number;
  /** 추천 동료 obsidianId 목록 (3인 파티) */
  recommendedCompanions: readonly string[];
  /** 조합 narrative */
  strategy: string;
}

export const SCENARIO_PARTY_COMPOSITIONS: readonly ChapterPartyComposition[] = [
  {
    chapter: 1,
    recommendedCompanions: ['seraphine', 'maestro_crio'],
    strategy: '에레보스 폐허 — 세라핀 정찰 + 크리오 정보. 초반 2인 파티.',
  },
  {
    chapter: 2,
    recommendedCompanions: ['seraphine', 'maestro_crio'],
    strategy: '실반헤임 — 세라핀 엘파리스 외교 + 크리오 정보. 말라투스 회상 cohesion.',
  },
  {
    chapter: 3,
    recommendedCompanions: ['seraphine', 'maestro_crio', 'ignara'],
    strategy: '솔라리스 — 이그나 이프리타 영역 + 채광 기지 작전. 첫 3인 파티.',
  },
  {
    chapter: 4,
    recommendedCompanions: ['benjamin_cross', 'reina', 'urgrom'],
    strategy: '아르겐티움 — 벤자민 정보망 + 레이나 교단 내부 + 우르그롬 북방. 강력 3인.',
  },
  {
    chapter: 5,
    recommendedCompanions: ['seraphine', 'ignara', 'benjamin_cross'],
    strategy: '망각의 고원 — 균형 3인 (정찰/이프리타/제국). 레테 5페이즈 최종 결전.',
  },
];

export function getPartyCompositionByChapter(
  chapter: number,
): ChapterPartyComposition | undefined {
  return SCENARIO_PARTY_COMPOSITIONS.find((p) => p.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-52: 시나리오 회상 (memory recall) narrative
// ════════════════════════════════════════════════════════════════

export interface MemoryRecall {
  obsidianId: string;
  /** 회상 대상 (인물 obsidianId or 'aerien' 주인공) */
  subject: string;
  chapter: number;
  /** 회상 narrative */
  narrative: string;
}

export const SCENARIO_MEMORY_RECALLS: readonly MemoryRecall[] = [
  {
    obsidianId: 'recall_aerien_kail_first',
    subject: 'aerien',
    chapter: 1,
    narrative: '에레보스 폐허에서 처음 카일 봉인 의식 환영을 본다. 양피지에 적는 손, 마지막 글자.',
  },
  {
    obsidianId: 'recall_seraphine_kael',
    subject: 'seraphine',
    chapter: 2,
    narrative: '말라투스 고목이 세라핀에게 카엘의 마지막 기억을 보여준다. 봉인 의식 12인 중 한 명이었던 카엘.',
  },
  {
    obsidianId: 'recall_crio_great_night',
    subject: 'maestro_crio',
    chapter: 1,
    narrative: '크리오가 갓난아기 시절 살아남은 대망각 당일 밤. 의식 후 침묵의 도시.',
  },
  {
    obsidianId: 'recall_ignara_father',
    subject: 'ignara',
    chapter: 3,
    narrative: '이그나가 아버지 이그리스의 기억 소멸 직전 마지막 말 — "이프리타의 불꽃은 멈추지 않는다".',
  },
  {
    obsidianId: 'recall_rawar_solian',
    subject: 'rawar',
    chapter: 3,
    narrative: '솔라리스 유적에서 라와르 왕의 솔리안 멸망 회상. 자기희생 봉인 의식.',
  },
  {
    obsidianId: 'recall_aerien_kail_full',
    subject: 'aerien',
    chapter: 5,
    narrative: '망각의 고원에서 카일과의 완전한 정신적 대면. 200년 전 봉인 의식 재현 결심.',
  },
];

export function getMemoryRecallByObsidianId(
  obsidianId: string,
): MemoryRecall | undefined {
  return SCENARIO_MEMORY_RECALLS.find((r) => r.obsidianId === obsidianId);
}

export function listMemoryRecallsByChapter(
  chapter: number,
): readonly MemoryRecall[] {
  return SCENARIO_MEMORY_RECALLS.filter((r) => r.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-53: 시나리오 분기 선택지 narrative
// ════════════════════════════════════════════════════════════════

export interface ScenarioChoice {
  obsidianId: string;
  chapter: number;
  /** 선택지 한글 prompt */
  prompt: string;
  /** 옵션 A 결과 narrative */
  optionA: string;
  /** 옵션 B 결과 narrative */
  optionB: string;
  /** 영향받는 동료 obsidianId (있을 경우) */
  affectsCompanion?: string;
}

export const SCENARIO_CHOICES: readonly ScenarioChoice[] = [
  {
    obsidianId: 'choice_ch2_elfaris_diplomacy',
    chapter: 2,
    prompt: '실반헤임 입구 — 엘파리스 경비병과 평화 vs 전투',
    optionA: '평화 — 외교 성공, 세라핀 신뢰도 +20',
    optionB: '전투 — 강제 진입, 세라핀 신뢰도 -30',
    affectsCompanion: 'seraphine',
  },
  {
    obsidianId: 'choice_ch3_ifrita_base',
    chapter: 3,
    prompt: '솔라리스 채광 기지 — 정면 공격 vs 내부 공작',
    optionA: '정면 공격 — 전투 보상 +, 이그나 신뢰도 -10',
    optionB: '내부 공작 — 정보 입수 +, 이그나 신뢰도 +20',
    affectsCompanion: 'ignara',
  },
  {
    obsidianId: 'choice_ch3_rawar',
    chapter: 3,
    prompt: '라와르 처리 — 기억 해방 vs 재봉인',
    optionA: '기억 해방 — 라와르의 의지 해방, 솔리안 영혼 자유',
    optionB: '재봉인 — 라와르 영원 봉인, 신성 기억 파편만 회수',
  },
  {
    obsidianId: 'choice_ch4_bernardo',
    chapter: 4,
    prompt: '베르나르도 — 화해 vs 배신 처치',
    optionA: '화해 — 베르나르도 생존, 엔딩 A 가능',
    optionB: '배신 처치 — boss_bernardo_corrupted, 엔딩 A 불가',
    affectsCompanion: 'benjamin_cross',
  },
  {
    obsidianId: 'choice_ch4_emperor',
    chapter: 4,
    prompt: '황제 레나르도 — 구원 vs 제거',
    optionA: '구원 — 레테 그릇에서 해방, 제국 안정',
    optionB: '제거 — 레테와 함께 처치, 제국 혼란',
  },
  {
    obsidianId: 'choice_ch5_final',
    chapter: 5,
    prompt: '레테와의 최종 대전 — 기억 수호 vs 망각 받아들임 vs 신화 회귀',
    optionA: '기억 수호 — 엔딩 A 또는 B (파편 수에 따라)',
    optionB: '망각 받아들임 — 엔딩 C (수용 엔딩)',
  },
];

export function getChoiceByObsidianId(
  obsidianId: string,
): ScenarioChoice | undefined {
  return SCENARIO_CHOICES.find((c) => c.obsidianId === obsidianId);
}

export function listChoicesByChapter(
  chapter: number,
): readonly ScenarioChoice[] {
  return SCENARIO_CHOICES.filter((c) => c.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-54: 시나리오 종족 + 세력 narrative
// ════════════════════════════════════════════════════════════════

export type FactionAlignment = 'protagonist' | 'neutral' | 'antagonist';

export interface ScenarioFaction {
  obsidianId: string;
  name: string;
  /** 진영 */
  alignment: FactionAlignment;
  /** 핵심 zone obsidianId */
  baseZoneId?: string;
  /** narrative 설명 */
  description: string;
}

export const SCENARIO_FACTIONS: readonly ScenarioFaction[] = [
  {
    obsidianId: 'faction_elfaris',
    name: '엘파리스 (실반헤임)',
    alignment: 'neutral',
    baseZoneId: 'silvanheim',
    description: '실반헤임 영역의 종족, 말라투스 고목 수호 + 기억 수호 전통.',
  },
  {
    obsidianId: 'faction_ifrita',
    name: '이프리타 (솔라리스)',
    alignment: 'neutral',
    baseZoneId: 'solaris',
    description: '솔라리스 사막의 종족, 이그나루스 신의 \'최초의 불꽃\' 후예.',
  },
  {
    obsidianId: 'faction_solian',
    name: '솔리안 (멸망)',
    alignment: 'neutral',
    baseZoneId: 'solaris',
    description: '3,000년 전 솔리안 황금기 문명, 레테 강림으로 한 밤에 멸망.',
  },
  {
    obsidianId: 'faction_kalimar_empire',
    name: '칼리마르 제국',
    alignment: 'antagonist',
    baseZoneId: 'argentium',
    description: '아르겐티움 중심 제국, 레테 교단 침투 받음.',
  },
  {
    obsidianId: 'faction_lethe_cult',
    name: '레테 교단',
    alignment: 'antagonist',
    description: '망각의 신 레테 추종 종교, 기억 소멸 통한 \'구원\' 추구.',
  },
  {
    obsidianId: 'faction_memory_guardian',
    name: '기억의 수호자단',
    alignment: 'protagonist',
    baseZoneId: 'erebos',
    description: '에레보스 폐광 비밀 본부, 카일 봉인 의식 계승 + 에리언 지원.',
  },
  {
    obsidianId: 'faction_memory_hunter',
    name: '기억 사냥꾼 부대',
    alignment: 'antagonist',
    description: '레테 교단 무력 부대, 케인 간부 이끔, 신성 기억 파편 추적.',
  },
];

export function getFactionByObsidianId(
  obsidianId: string,
): ScenarioFaction | undefined {
  return SCENARIO_FACTIONS.find((f) => f.obsidianId === obsidianId);
}

export function listFactionsByAlignment(
  alignment: FactionAlignment,
): readonly ScenarioFaction[] {
  return SCENARIO_FACTIONS.filter((f) => f.alignment === alignment);
}

// ════════════════════════════════════════════════════════════════
// SYNC-56: 시나리오 prerequisite 그래프 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterPrerequisite {
  chapter: number;
  /** 선행 챕터 (모두 완료 필요) */
  prerequisiteChapters: readonly number[];
  /** 필요 fragment obsidianId */
  requiredFragments: readonly string[];
  /** narrative 잠금 설명 */
  unlockNarrative: string;
}

export const SCENARIO_PREREQUISITES: readonly ChapterPrerequisite[] = [
  {
    chapter: 1,
    prerequisiteChapters: [],
    requiredFragments: [],
    unlockNarrative: '게임 시작 — 칸텔라 마을 사건 + 기억 공명 능력 각성',
  },
  {
    chapter: 2,
    prerequisiteChapters: [1],
    requiredFragments: ['fragment_erebos'],
    unlockNarrative: '실반헤임 진입 — 에레보스 파편 회수 후 동부 대륙 여행',
  },
  {
    chapter: 3,
    prerequisiteChapters: [1, 2],
    requiredFragments: ['fragment_erebos', 'fragment_silvanheim'],
    unlockNarrative: '솔라리스 사막 — 첫 2 파편 회수 후 남부 사막 진입',
  },
  {
    chapter: 4,
    prerequisiteChapters: [1, 2, 3],
    requiredFragments: ['fragment_erebos', 'fragment_silvanheim', 'fragment_solaris'],
    unlockNarrative: '아르겐티움 — 3 파편 + 동료 모집 후 제국 잠입',
  },
  {
    chapter: 5,
    prerequisiteChapters: [1, 2, 3, 4],
    requiredFragments: ['fragment_erebos', 'fragment_silvanheim', 'fragment_solaris', 'fragment_argentium'],
    unlockNarrative: '망각의 고원 — 4 파편 모두 회수 후 황금 에테르 탑 진입',
  },
];

export function getPrerequisiteByChapter(
  chapter: number,
): ChapterPrerequisite | undefined {
  return SCENARIO_PREREQUISITES.find((p) => p.chapter === chapter);
}

/** 챕터 진입 가능 여부 평가 */
export function canEnterChapter(
  chapter: number,
  completedChapters: ReadonlySet<number>,
  collectedFragments: ReadonlySet<string>,
): boolean {
  const prereq = getPrerequisiteByChapter(chapter);
  if (!prereq) return false;
  for (const ch of prereq.prerequisiteChapters) {
    if (!completedChapters.has(ch)) return false;
  }
  for (const f of prereq.requiredFragments) {
    if (!collectedFragments.has(f)) return false;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════
// SYNC-59: 게임 시작 / 5 엔딩 종결 시퀀스 narrative
// ════════════════════════════════════════════════════════════════

export interface IntroSequence {
  /** 시퀀스 단계 (1부터) */
  step: number;
  /** 한글 narrative 텍스트 */
  text: string;
  /** 배경 zone obsidianId (있을 경우) */
  bgZoneId?: string;
}

export const GAME_INTRO_SEQUENCE: readonly IntroSequence[] = [
  { step: 1, text: '세계력 3,412년. 200년 전 그날 밤, 에레보스가 한 밤에 멸망했다.' },
  { step: 2, text: '망각의 폭풍은 지금도 대륙을 휩쓸고 있고...' },
  { step: 3, text: '나, 에리언. 칸텔라 마을에서 평범한 삶을 살고 있었다.', bgZoneId: 'cantela_village' },
  { step: 4, text: '그러나 그날, 폭풍이 우리 마을을 덮쳤다.', bgZoneId: 'cantela_village' },
  { step: 5, text: '그리고 처음, 나는 카일의 봉인 의식 환영을 보았다.' },
];

export interface EndingSequence {
  endingCode: ScenarioEndingCode;
  sequence: readonly string[];
}

export const ENDING_FINAL_SEQUENCES: readonly EndingSequence[] = [
  {
    endingCode: 'A',
    sequence: [
      '4 신성 기억 파편이 통합된다. 황금 에테르 탑 정상에서.',
      '레테는 망각의 폭풍과 함께 사라지고, 6 동료가 에리언 곁에 선다.',
      '세계의 기억이 회복된다. 완전한 엔딩.',
    ],
  },
  {
    endingCode: 'B',
    sequence: [
      '3 파편 통합으로 레테의 일부만 봉인할 수 있다.',
      '동료 일부 이탈, 일부 사망. 부분적 승리.',
      '망각의 폭풍은 완전히 사라지지 않는다.',
    ],
  },
  {
    endingCode: 'C',
    sequence: [
      '2 파편 이하로 봉인 불가. 에리언은 레테의 \'구원\'을 받아들인다.',
      '망각이 모두를 감싼다. 평화롭지만 공허한 세계.',
      '수용의 엔딩 — 다른 색의 결말.',
    ],
  },
  {
    endingCode: 'D',
    sequence: [
      '신화 유물 통합으로 미네르바와 만난다.',
      '11신의 의지로 신화 시대 회귀. 4 파편을 통한 시간선 분기.',
      '에리언은 카일과 통합되어 신화의 후예가 된다. 가장 거대한 결말.',
    ],
  },
  {
    endingCode: 'FAIL',
    sequence: [
      '레테와의 5페이즈 최종 결전에서 패배.',
      '망각의 폭풍이 모든 기억을 삼킨다.',
      '에테르나는 영원한 침묵의 세계로 변한다.',
    ],
  },
];

export function getEndingSequence(
  code: ScenarioEndingCode,
): readonly string[] | undefined {
  return ENDING_FINAL_SEQUENCES.find((e) => e.endingCode === code)?.sequence;
}

// ════════════════════════════════════════════════════════════════
// SYNC-61: GameProgress 마스터 evaluator — 종합 reporter
// ════════════════════════════════════════════════════════════════

export interface GameProgressInput {
  /** 현재 chapter (1~5) */
  currentChapter: number;
  /** 완료된 quest codes */
  completedQuests: ReadonlySet<string>;
  /** 동료 신뢰도 (obsidianId → 값) */
  companionLoyalty: Record<string, number>;
  /** 수집한 fragment obsidianId */
  collectedFragments: ReadonlySet<string>;
  /** 수집한 mythic relic obsidianId */
  collectedRelics?: ReadonlySet<string>;
  /** 탐사한 zone obsidianId */
  exploredZones?: ReadonlySet<string>;
  /** 완료된 chapter (1~5) */
  completedChapters?: ReadonlySet<number>;
  /** 미네르바 만남 여부 */
  metMinerva?: boolean;
  /** 레테 패배 여부 */
  defeatedByLethe?: boolean;
}

export interface GameProgressReport {
  currentChapter: number;
  chapterProgress: ChapterProgress;
  canEnterNextChapter: boolean;
  achievableEnding: ScenarioEndingCode;
  isFailure: boolean;
  canAchieveEndingD: boolean;
  aliveCompanions: readonly string[];
  leftCompanions: readonly string[];
  fragmentsCollected: number;
  mythicRelicsCollected: number;
  /** 전체 진행률 (0~1) */
  totalProgress: number;
}

// ════════════════════════════════════════════════════════════════
// SYNC-62: 시나리오 achievement narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface ScenarioAchievement {
  obsidianId: string;
  /** 한글 제목 */
  title: string;
  /** 달성 조건 narrative */
  condition: string;
  /** 보상 점수 */
  points: number;
  /** 숨김 achievement 여부 (엔딩 D 등) */
  hidden?: boolean;
}

export const SCENARIO_ACHIEVEMENTS: readonly ScenarioAchievement[] = [
  {
    obsidianId: 'achievement_first_fragment',
    title: '첫 신성 파편 회수',
    condition: 'Ch1 fragment_erebos 회수',
    points: 10,
  },
  {
    obsidianId: 'achievement_all_companions',
    title: '6 동료 모두 합류',
    condition: '6 동료 모두 신뢰도 threshold 충족',
    points: 30,
  },
  {
    obsidianId: 'achievement_all_fragments',
    title: '4 파편 통합',
    condition: '4 신성 기억 파편 모두 회수',
    points: 50,
  },
  {
    obsidianId: 'achievement_ending_a',
    title: '엔딩 A — 완전한 승리',
    condition: '4 파편 + 6 동료 + 레테 처치',
    points: 100,
  },
  {
    obsidianId: 'achievement_ending_b',
    title: '엔딩 B — 부분 승리',
    condition: '3 파편으로 레테 일부 봉인',
    points: 70,
  },
  {
    obsidianId: 'achievement_ending_c',
    title: '엔딩 C — 수용의 엔딩',
    condition: '2 파편 이하 - 망각 수용',
    points: 50,
  },
  {
    obsidianId: 'achievement_ending_d',
    title: '엔딩 D — 신화의 후예',
    condition: '신화 유물 ≥2 + 미네르바 만남',
    points: 150,
    hidden: true,
  },
  {
    obsidianId: 'achievement_no_betrayal',
    title: '베르나르도 화해',
    condition: 'Ch4 베르나르도 화해 선택',
    points: 20,
  },
  {
    obsidianId: 'achievement_all_relics',
    title: '4 신화 유물 회수',
    condition: '크로나이/이그나루스/베르다/아키우스 유물 모두',
    points: 60,
    hidden: true,
  },
];

export function getAchievementByObsidianId(
  obsidianId: string,
): ScenarioAchievement | undefined {
  return SCENARIO_ACHIEVEMENTS.find((a) => a.obsidianId === obsidianId);
}

export function listVisibleAchievements(): readonly ScenarioAchievement[] {
  return SCENARIO_ACHIEVEMENTS.filter((a) => !a.hidden);
}

export function listHiddenAchievements(): readonly ScenarioAchievement[] {
  return SCENARIO_ACHIEVEMENTS.filter((a) => a.hidden);
}

// ════════════════════════════════════════════════════════════════
// SYNC-63: quest log preview narrative
// ════════════════════════════════════════════════════════════════

export interface QuestLogPreview {
  chapter: number;
  /** 챕터 진행 단계별 narrative */
  steps: readonly string[];
  /** 챕터 종결 narrative */
  conclusion: string;
}

export const SCENARIO_QUEST_LOG: readonly QuestLogPreview[] = [
  {
    chapter: 1,
    steps: [
      '칸텔라 마을 기억 폭풍 사건 + 에리언 능력 각성',
      '에레보스 폐허 진입 + 세라핀/크리오 만남',
      '에레보스 폐허 탐사 + 첫 파편 회수',
    ],
    conclusion: '에레보스의 침묵 — 첫 신성 기억 파편 회수, 동료 2인 합류',
  },
  {
    chapter: 2,
    steps: [
      '실반헤임 외교 분기 + 엘파리스와의 접촉',
      '말라투스 고목 + 세라핀 카엘 회상',
      '말라투스 보스전 + 실반헤임 파편 회수',
    ],
    conclusion: '실반헤임의 신비 — 2 파편 + 말라투스 봉인',
  },
  {
    chapter: 3,
    steps: [
      '솔라리스 사막 진입 + 이그나 합류',
      '이프리타 채광 기지 작전 (정면/공작)',
      '라와르 봉인 의식 + 솔라리스 파편 회수',
    ],
    conclusion: '솔라리스의 불꽃 — 3 파편 + 이그나 동료',
  },
  {
    chapter: 4,
    steps: [
      '아르겐티움 잠입 + 벤자민/레이나/우르그롬 합류',
      '제국 황궁 침투 + 케인 처치',
      '베르나르도 화해/배신 분기 + 아르겐티움 파편',
    ],
    conclusion: '아르겐티움의 음모 — 4 파편 + 동료 6 완성',
  },
  {
    chapter: 5,
    steps: [
      '망각의 고원 진입 + 카일과 정신적 대면',
      '황금 에테르 탑 등반 + 4 파편 통합',
      '레테 5페이즈 최종 결전',
    ],
    conclusion: '에테르나의 운명 — 엔딩 A/B/C/D/FAIL 중 하나로 결정',
  },
];

export function getQuestLogByChapter(chapter: number): QuestLogPreview | undefined {
  return SCENARIO_QUEST_LOG.find((q) => q.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-65: cinematic / cutscene narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface Cinematic {
  obsidianId: string;
  /** 한글 제목 */
  title: string;
  chapter: number;
  /** 컷씬 발생 시점 (start/mid/end) */
  timing: 'chapter_start' | 'chapter_mid' | 'chapter_end' | 'optional';
  /** 핵심 narrative */
  narrative: string;
}

export const SCENARIO_CINEMATICS: readonly Cinematic[] = [
  {
    obsidianId: 'cinematic_ch1_opening',
    title: '오프닝 — 칸텔라 폭풍',
    chapter: 1,
    timing: 'chapter_start',
    narrative: '에리언 시점의 칸텔라 마을 기억 폭풍 발생 + 능력 각성 cinematic.',
  },
  {
    obsidianId: 'cinematic_ch1_erebos_first',
    title: '에레보스 첫 진입',
    chapter: 1,
    timing: 'chapter_mid',
    narrative: '200년 침묵의 에레보스 폐허 진입 + 회상된 마지막 순간들.',
  },
  {
    obsidianId: 'cinematic_ch2_malatus_awaken',
    title: '말라투스 각성',
    chapter: 2,
    timing: 'chapter_mid',
    narrative: '말라투스 고목이 세라핀의 회상을 일으키고 보스전 트리거.',
  },
  {
    obsidianId: 'cinematic_ch3_rawar_unseal',
    title: '라와르 봉인 해방',
    chapter: 3,
    timing: 'chapter_end',
    narrative: '솔리안 왕 라와르의 200년 봉인 의식 환영 + 봉인 해방/재봉인 분기.',
  },
  {
    obsidianId: 'cinematic_ch4_bernardo_reveal',
    title: '베르나르도의 진실',
    chapter: 4,
    timing: 'chapter_mid',
    narrative: '베르나르도가 레테 교단 내부자임을 밝히는 충격적 폭로.',
  },
  {
    obsidianId: 'cinematic_ch5_kail_meet',
    title: '카일과의 정신적 대면',
    chapter: 5,
    timing: 'chapter_mid',
    narrative: '망각의 고원에서 200년 전 자신 카일과 정신적 대화 + 봉인 의식 재현.',
  },
  {
    obsidianId: 'cinematic_ch5_minerva',
    title: '미네르바와의 만남',
    chapter: 5,
    timing: 'optional',
    narrative: '신화 유물 2+ 보유 시 황금 에테르 탑에서 미네르바 신과 만남. 엔딩 D 분기.',
  },
];

export function getCinematicByObsidianId(
  obsidianId: string,
): Cinematic | undefined {
  return SCENARIO_CINEMATICS.find((c) => c.obsidianId === obsidianId);
}

export function listCinematicsByChapter(
  chapter: number,
): readonly Cinematic[] {
  return SCENARIO_CINEMATICS.filter((c) => c.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-67: 시나리오 SFX / ambient sound narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface AmbientSound {
  chapter: number;
  /** 게임 ambient track id */
  gameAmbientId: string;
  /** ambient 분위기 narrative */
  description: string;
}

export const SCENARIO_AMBIENT_SOUNDS: readonly AmbientSound[] = [
  {
    chapter: 1,
    gameAmbientId: 'ambient_erebos_wind',
    description: '에레보스 폐허 — 200년 침묵의 바람 + 망각 폭풍 잔향',
  },
  {
    chapter: 2,
    gameAmbientId: 'ambient_silvanheim_forest',
    description: '실반헤임 — 시간 지연 숲 + 말라투스 고목 잎새 소리',
  },
  {
    chapter: 3,
    gameAmbientId: 'ambient_solaris_desert',
    description: '솔라리스 사막 — 모래 바람 + 신기루 에테르 발광 소리',
  },
  {
    chapter: 4,
    gameAmbientId: 'ambient_argentium_palace',
    description: '아르겐티움 황궁 — 음모의 침묵 + 금속 발자국',
  },
  {
    chapter: 5,
    gameAmbientId: 'ambient_oblivion_void',
    description: '망각의 고원 — 현실 붕괴 잡음 + 시간 왜곡 echo',
  },
];

export function getAmbientByChapter(chapter: number): AmbientSound | undefined {
  return SCENARIO_AMBIENT_SOUNDS.find((a) => a.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-68: 동료별 personal companion quest narrative
// ════════════════════════════════════════════════════════════════

export interface PersonalQuest {
  obsidianId: string;
  companionObsidianId: string;
  /** 게임 quest code (existing SQ_COMPANION_*) */
  gameQuestCode: string;
  /** 한글 quest 제목 */
  title: string;
  /** 개인 quest narrative */
  narrative: string;
}

export const COMPANION_PERSONAL_QUESTS: readonly PersonalQuest[] = [
  {
    obsidianId: 'pq_seraphine',
    companionObsidianId: 'seraphine',
    gameQuestCode: 'SQ_COMPANION_SERAPHINE',
    title: '카엘의 마지막 흔적',
    narrative: '실반헤임 깊은 곳에서 카엘이 남긴 봉인 의식 흔적을 추적한다.',
  },
  {
    obsidianId: 'pq_crio',
    companionObsidianId: 'maestro_crio',
    gameQuestCode: 'SQ_COMPANION_CRIO',
    title: '에레보스 정보망의 비밀',
    narrative: '60년 정보상 인맥 네트워크 + 대망각 당일 진실 단서 회수.',
  },
  {
    obsidianId: 'pq_ignara',
    companionObsidianId: 'ignara',
    gameQuestCode: 'SQ_COMPANION_IGNARA',
    title: '이프리타 종족 음모',
    narrative: '아버지 이그리스의 기억 소멸 배후 — 이프리타 내부 음모 추적.',
  },
  {
    obsidianId: 'pq_benjamin',
    companionObsidianId: 'benjamin_cross',
    gameQuestCode: 'MQ_CH04',
    title: '밀리아 구출 작전',
    narrative: '레테 교단에 잡혀있는 조카 밀리아를 구출하는 작전 — 메인 chain Ch4 통합.',
  },
  {
    obsidianId: 'pq_reina',
    companionObsidianId: 'reina',
    gameQuestCode: 'SQ_COMPANION_REINA',
    title: '교단 내부고발 증거',
    narrative: '레테 교단 진정한 목적 (12 신화 회귀) 증거 수집.',
  },
  {
    obsidianId: 'pq_urgrom',
    companionObsidianId: 'urgrom',
    gameQuestCode: 'SQ_COMPANION_URGROM',
    title: '북방 기억석 사원 봉인',
    narrative: '200년 전 봉인 의식의 마지막 보루 + 사원 비밀 보호.',
  },
];

export function getPersonalQuestByCompanion(
  companionObsidianId: string,
): PersonalQuest | undefined {
  return COMPANION_PERSONAL_QUESTS.find(
    (q) => q.companionObsidianId === companionObsidianId,
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-71: 시나리오 status effect narrative
// ════════════════════════════════════════════════════════════════

export type StatusEffectType = 'debuff' | 'buff' | 'environment';

export interface ScenarioStatusEffect {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 타입 */
  type: StatusEffectType;
  /** 발생 zone obsidianId (있을 경우) */
  zoneObsidianId?: string;
  /** 한글 narrative */
  description: string;
}

export const SCENARIO_STATUS_EFFECTS: readonly ScenarioStatusEffect[] = [
  {
    obsidianId: 'status_memory_storm',
    name: '기억 폭풍',
    type: 'debuff',
    description: '망각의 폭풍 접근 — 모든 캐릭터 기억 일부 소멸 위험.',
  },
  {
    obsidianId: 'status_ether_glow',
    name: '에테르 발광',
    type: 'environment',
    zoneObsidianId: 'solaris',
    description: '솔라리스 사막 — 에테르 결정 발광으로 시야 왜곡.',
  },
  {
    obsidianId: 'status_time_dilation',
    name: '시간 지연',
    type: 'environment',
    zoneObsidianId: 'silvanheim',
    description: '실반헤임 — 시간이 외부보다 느리게 흐름 (1일=외부 3시간).',
  },
  {
    obsidianId: 'status_aerien_resonance',
    name: '에리언 기억 공명',
    type: 'buff',
    description: '신성 기억 파편 회수 시 에리언의 기억 공명 능력 강화.',
  },
  {
    obsidianId: 'status_reality_collapse',
    name: '현실 붕괴',
    type: 'environment',
    zoneObsidianId: 'oblivion_plateau',
    description: '망각의 고원 — 현실과 과거가 겹침, 카일 환영 빈도 증가.',
  },
  {
    obsidianId: 'status_lethe_whisper',
    name: '레테의 속삭임',
    type: 'debuff',
    description: '레테 교단 근접 시 망각의 유혹 — 의지 약화 위험.',
  },
  {
    obsidianId: 'status_companion_bond',
    name: '동료 유대',
    type: 'buff',
    description: '6 동료 신뢰도 threshold 달성 시 파티 능력치 강화.',
  },
];

export function getStatusEffectByObsidianId(
  obsidianId: string,
): ScenarioStatusEffect | undefined {
  return SCENARIO_STATUS_EFFECTS.find((s) => s.obsidianId === obsidianId);
}

export function listStatusEffectsByType(
  type: StatusEffectType,
): readonly ScenarioStatusEffect[] {
  return SCENARIO_STATUS_EFFECTS.filter((s) => s.type === type);
}

// ════════════════════════════════════════════════════════════════
// SYNC-72: 시나리오 진영 평판 (faction reputation) narrative
// ════════════════════════════════════════════════════════════════

export interface FactionReputation {
  factionObsidianId: string;
  /** 평판 시작 값 */
  startingReputation: number;
  /** 평판 +/- 영향 narrative */
  influence: string;
}

export const FACTION_REPUTATIONS: readonly FactionReputation[] = [
  {
    factionObsidianId: 'faction_elfaris',
    startingReputation: 0,
    influence: 'Ch2 평화 선택 +20, 전투 선택 -30. 외교 진입 영향.',
  },
  {
    factionObsidianId: 'faction_ifrita',
    startingReputation: 0,
    influence: 'Ch3 채광 기지 내부 공작 +20, 정면 공격 -10. 이그나 신뢰 영향.',
  },
  {
    factionObsidianId: 'faction_solian',
    startingReputation: 0,
    influence: 'Ch3 라와르 해방 +30, 재봉인 +10. 솔리안 영혼 자유 narrative.',
  },
  {
    factionObsidianId: 'faction_kalimar_empire',
    startingReputation: -10,
    influence: 'Ch4 황제 구원 +30, 제거 -20. 제국 안정/혼란 narrative.',
  },
  {
    factionObsidianId: 'faction_lethe_cult',
    startingReputation: -50,
    influence: '모든 교단 활동 적대적. 베르나르도/레이나 분기 영향.',
  },
  {
    factionObsidianId: 'faction_memory_guardian',
    startingReputation: 30,
    influence: '에리언 시작 +30, 4 파편 회수 시마다 +20. 엔딩 A 영향.',
  },
  {
    factionObsidianId: 'faction_memory_hunter',
    startingReputation: -30,
    influence: 'Ch4 케인 처치 +50 평판 회복. 기억 사냥꾼 패배 narrative.',
  },
];

export function getFactionReputationByObsidianId(
  factionObsidianId: string,
): FactionReputation | undefined {
  return FACTION_REPUTATIONS.find((r) => r.factionObsidianId === factionObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-73: 동료 시작 status narrative
// ════════════════════════════════════════════════════════════════

export interface CompanionStartingStats {
  companionObsidianId: string;
  /** 합류 시 시작 level */
  startingLevel: number;
  /** 주력 능력치 (game class 기반 narrative) */
  primaryStat: '근접 공격' | '원거리 공격' | '마법' | '방어' | '지원';
  /** 시작 status narrative */
  narrative: string;
}

export const COMPANION_STARTING_STATS: readonly CompanionStartingStats[] = [
  {
    companionObsidianId: 'seraphine',
    startingLevel: 1,
    primaryStat: '원거리 공격',
    narrative: '엘파리스 정찰병 — 시간 가속 검술 + 정찰 시야. lv1 시작.',
  },
  {
    companionObsidianId: 'maestro_crio',
    startingLevel: 3,
    primaryStat: '지원',
    narrative: '200년 생존 정보상 — 기억 직조 지원형. lv3 시작 (정보망 인맥).',
  },
  {
    companionObsidianId: 'ignara',
    startingLevel: 12,
    primaryStat: '마법',
    narrative: '이프리타 족장의 딸 — 에테르 결정 불꽃 마법. Ch3 lv12 합류.',
  },
  {
    companionObsidianId: 'benjamin_cross',
    startingLevel: 22,
    primaryStat: '근접 공격',
    narrative: '전직 형사 — 그림자 잠입 + 정보 수집. Ch4 lv22 합류.',
  },
  {
    companionObsidianId: 'reina',
    startingLevel: 24,
    primaryStat: '마법',
    narrative: '레테 교단 내부고발자 — 기억 봉인 파괴. Ch4 lv24 합류.',
  },
  {
    companionObsidianId: 'urgrom',
    startingLevel: 25,
    primaryStat: '방어',
    narrative: '북방 사원 수호자 — 시간 봉인 방어. Ch4 lv25 합류 (가장 강력).',
  },
];

export function getStartingStatsByCompanion(
  companionObsidianId: string,
): CompanionStartingStats | undefined {
  return COMPANION_STARTING_STATS.find(
    (s) => s.companionObsidianId === companionObsidianId,
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-74: 시나리오 enemy archetype narrative
// ════════════════════════════════════════════════════════════════

export interface EnemyArchetype {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 출현 chapter (시작) */
  fromChapter: number;
  /** 한글 narrative */
  description: string;
}

export const SCENARIO_ENEMY_ARCHETYPES: readonly EnemyArchetype[] = [
  {
    obsidianId: 'enemy_memory_remnant',
    name: '기억 잔영',
    fromChapter: 1,
    description: '에레보스 폐허에서 출현 — 200년 전 죽은 자들의 기억 응결체.',
  },
  {
    obsidianId: 'enemy_oblivion_wraith',
    name: '망각의 원혼',
    fromChapter: 1,
    description: '레테 교단 영향으로 망각된 영혼 — 모든 chapter 출현.',
  },
  {
    obsidianId: 'enemy_forest_guardian',
    name: '실반헤임 수호자',
    fromChapter: 2,
    description: '말라투스 영역 시간 지연 사용 + 식물 마법.',
  },
  {
    obsidianId: 'enemy_sand_phantom',
    name: '솔라리스 신기루',
    fromChapter: 3,
    description: '솔라리스 사막 환영 + 에테르 발광으로 시야 왜곡.',
  },
  {
    obsidianId: 'enemy_imperial_guard',
    name: '제국 근위병',
    fromChapter: 4,
    description: '아르겐티움 근위대 + 케인 부대 정예 병력.',
  },
  {
    obsidianId: 'enemy_lethe_inquisitor',
    name: '레테 심문관',
    fromChapter: 4,
    description: '레테 교단 정예 무력 — 기억 사냥꾼 + 케인 부대 상위.',
  },
  {
    obsidianId: 'enemy_reality_fractured',
    name: '현실 분열체',
    fromChapter: 5,
    description: '망각의 고원 — 현실 붕괴로 인한 비현실적 적.',
  },
];

export function getEnemyArchetypeByObsidianId(
  obsidianId: string,
): EnemyArchetype | undefined {
  return SCENARIO_ENEMY_ARCHETYPES.find((e) => e.obsidianId === obsidianId);
}

export function listEnemyArchetypesFromChapter(
  chapter: number,
): readonly EnemyArchetype[] {
  return SCENARIO_ENEMY_ARCHETYPES.filter((e) => e.fromChapter <= chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-76: 시나리오 NPC vendor / 상점 narrative SSOT
// ════════════════════════════════════════════════════════════════

export type VendorType = 'weapon' | 'armor' | 'consumable' | 'mixed' | 'information';

export interface ScenarioVendor {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 위치 zone obsidianId */
  zoneObsidianId: string;
  /** vendor 타입 */
  vendorType: VendorType;
  /** 한글 narrative */
  description: string;
}

export const SCENARIO_VENDORS: readonly ScenarioVendor[] = [
  {
    obsidianId: 'vendor_cantela_general',
    name: '칸텔라 잡화상',
    zoneObsidianId: 'cantela_village',
    vendorType: 'mixed',
    description: '시작 마을 잡화 상점 — 기본 회복 약품 + 초기 장비.',
  },
  {
    obsidianId: 'vendor_silvanheim_herbalist',
    name: '실반헤임 약초사',
    zoneObsidianId: 'silvanheim',
    vendorType: 'consumable',
    description: '엘파리스 약초사 — 자연 회복 약 + 시간 지연 해독제.',
  },
  {
    obsidianId: 'vendor_solaris_armory',
    name: '솔라리스 무기 상점',
    zoneObsidianId: 'solaris',
    vendorType: 'weapon',
    description: '이프리타 무기 — 에테르 결정 무기 + 화염 속성 장비.',
  },
  {
    obsidianId: 'vendor_argentium_smith',
    name: '아르겐티움 황궁 대장간',
    zoneObsidianId: 'argentium',
    vendorType: 'armor',
    description: '제국 정예 갑옷 — 황금 에테르 방어구 + 침투복.',
  },
  {
    obsidianId: 'vendor_crio_informant',
    name: '마에스트로 크리오의 정보망',
    zoneObsidianId: 'erebos',
    vendorType: 'information',
    description: '60년 정보상 — gold 대신 정보로 거래. 비밀 위치/적 정보.',
  },
];

export function getVendorByObsidianId(
  obsidianId: string,
): ScenarioVendor | undefined {
  return SCENARIO_VENDORS.find((v) => v.obsidianId === obsidianId);
}

export function listVendorsByZone(
  zoneObsidianId: string,
): readonly ScenarioVendor[] {
  return SCENARIO_VENDORS.filter((v) => v.zoneObsidianId === zoneObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-77: 시나리오 sub-location narrative SSOT
// ════════════════════════════════════════════════════════════════

export type SubLocationType = 'village' | 'fortress' | 'ruin' | 'sanctuary' | 'lab';

export interface SubLocation {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 상위 zone obsidianId */
  zoneObsidianId: string;
  type: SubLocationType;
  /** 한글 narrative */
  description: string;
}

export const SCENARIO_SUB_LOCATIONS: readonly SubLocation[] = [
  {
    obsidianId: 'sub_cantela_house',
    name: '에리언의 집',
    zoneObsidianId: 'cantela_village',
    type: 'village',
    description: '주인공 에리언의 칸텔라 마을 집 — 게임 시작점.',
  },
  {
    obsidianId: 'sub_erebos_library',
    name: '에레보스 도서관',
    zoneObsidianId: 'erebos',
    type: 'ruin',
    description: '대망각 당일 사서의 마지막 일기가 발견된 도서관 폐허.',
  },
  {
    obsidianId: 'sub_silvanheim_grove',
    name: '말라투스 고목',
    zoneObsidianId: 'silvanheim',
    type: 'sanctuary',
    description: '실반헤임 중심 — 수천 년 기억을 수호하는 거대 고목.',
  },
  {
    obsidianId: 'sub_solaris_mine',
    name: '이프리타 채광 기지',
    zoneObsidianId: 'solaris',
    type: 'fortress',
    description: '제국 점령 에테르 결정 채광 기지 — Ch3 작전 분기 위치.',
  },
  {
    obsidianId: 'sub_argentium_palace',
    name: '아르겐티움 황궁',
    zoneObsidianId: 'argentium',
    type: 'fortress',
    description: '칼리마르 제국 황궁 — Ch4 잠입 + 황제 대결 위치.',
  },
  {
    obsidianId: 'sub_palatino_lab',
    name: '팔라티노 비밀 연구소',
    zoneObsidianId: 'argentium',
    type: 'lab',
    description: '황궁 지하 — 레테 교단 비밀 실험실 + 베르나르도 마지막 대결.',
  },
  {
    obsidianId: 'sub_north_temple',
    name: '북방 기억석 사원',
    zoneObsidianId: 'argentium',
    type: 'sanctuary',
    description: '200년 봉인 의식 마지막 보루 — 우르그롬 합류 위치.',
  },
];

export function getSubLocationByObsidianId(
  obsidianId: string,
): SubLocation | undefined {
  return SCENARIO_SUB_LOCATIONS.find((l) => l.obsidianId === obsidianId);
}

export function listSubLocationsByZone(
  zoneObsidianId: string,
): readonly SubLocation[] {
  return SCENARIO_SUB_LOCATIONS.filter((l) => l.zoneObsidianId === zoneObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-79: 게임 내 시간 / 일자 진행 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterTimespan {
  chapter: number;
  /** 챕터 시작 시점 narrative */
  startMoment: string;
  /** 챕터 진행 기간 (대략) */
  duration: string;
  /** 챕터 종료 시점 narrative */
  endMoment: string;
}

export const SCENARIO_CHAPTER_TIMESPANS: readonly ChapterTimespan[] = [
  {
    chapter: 1,
    startMoment: '세계력 3,412년 봄 — 칸텔라 마을 기억 폭풍 발생',
    duration: '약 14일',
    endMoment: '에레보스 폐허 탐사 종결 + 첫 파편 회수',
  },
  {
    chapter: 2,
    startMoment: '세계력 3,412년 늦봄 — 실반헤임 진입',
    duration: '약 21일 (시간 지연 영역 포함)',
    endMoment: '말라투스 보스전 + 실반헤임 파편 회수',
  },
  {
    chapter: 3,
    startMoment: '세계력 3,412년 여름 — 솔라리스 사막 도착',
    duration: '약 28일',
    endMoment: '라와르 봉인 + 솔라리스 파편 + 이그나 합류',
  },
  {
    chapter: 4,
    startMoment: '세계력 3,412년 가을 — 아르겐티움 잠입',
    duration: '약 30일',
    endMoment: '베르나르도 분기 + 아르겐티움 파편 + 6 동료 완성',
  },
  {
    chapter: 5,
    startMoment: '세계력 3,412년 늦가을 — 망각의 고원 진입',
    duration: '약 7일',
    endMoment: '레테 최종 결전 + 엔딩 분기',
  },
];

export function getTimespanByChapter(chapter: number): ChapterTimespan | undefined {
  return SCENARIO_CHAPTER_TIMESPANS.find((t) => t.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-81: zone별 random encounter 패턴 narrative
// ════════════════════════════════════════════════════════════════

export interface RandomEncounter {
  zoneObsidianId: string;
  /** 가능한 적 archetype obsidianId 목록 */
  enemyArchetypes: readonly string[];
  /** 인카운터 빈도 (low/medium/high) */
  frequency: 'low' | 'medium' | 'high';
  /** narrative 설명 */
  description: string;
}

export const SCENARIO_RANDOM_ENCOUNTERS: readonly RandomEncounter[] = [
  {
    zoneObsidianId: 'cantela_village',
    enemyArchetypes: [],
    frequency: 'low',
    description: '평화로운 마을 — 전투 없음 (시작점).',
  },
  {
    zoneObsidianId: 'erebos',
    enemyArchetypes: ['enemy_memory_remnant', 'enemy_oblivion_wraith'],
    frequency: 'high',
    description: '에레보스 폐허 — 기억 잔영 + 망각 원혼 빈번 출현.',
  },
  {
    zoneObsidianId: 'silvanheim',
    enemyArchetypes: ['enemy_forest_guardian', 'enemy_oblivion_wraith'],
    frequency: 'medium',
    description: '실반헤임 — 수호자 + 시간 지연 영역 원혼.',
  },
  {
    zoneObsidianId: 'solaris',
    enemyArchetypes: ['enemy_sand_phantom', 'enemy_oblivion_wraith'],
    frequency: 'medium',
    description: '솔라리스 사막 — 신기루 + 에테르 발광 원혼.',
  },
  {
    zoneObsidianId: 'argentium',
    enemyArchetypes: ['enemy_imperial_guard', 'enemy_lethe_inquisitor'],
    frequency: 'high',
    description: '아르겐티움 — 제국 근위 + 레테 심문관 적대.',
  },
  {
    zoneObsidianId: 'oblivion_plateau',
    enemyArchetypes: ['enemy_reality_fractured', 'enemy_oblivion_wraith'],
    frequency: 'high',
    description: '망각의 고원 — 현실 분열체 + 망각 원혼 절정.',
  },
  {
    zoneObsidianId: 'golden_ether_tower',
    enemyArchetypes: ['enemy_reality_fractured', 'enemy_lethe_inquisitor'],
    frequency: 'medium',
    description: '황금 에테르 탑 — 최종 결전 위치, 정예 적만 출현.',
  },
];

export function getRandomEncounterByZone(
  zoneObsidianId: string,
): RandomEncounter | undefined {
  return SCENARIO_RANDOM_ENCOUNTERS.find((e) => e.zoneObsidianId === zoneObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-82: 동료 합류 trigger event narrative
// ════════════════════════════════════════════════════════════════

export interface CompanionJoinTrigger {
  companionObsidianId: string;
  /** trigger zone obsidianId */
  triggerZoneId: string;
  /** trigger 조건 narrative */
  triggerCondition: string;
  /** 합류 직후 narrative */
  joinNarrative: string;
}

export const COMPANION_JOIN_TRIGGERS: readonly CompanionJoinTrigger[] = [
  {
    companionObsidianId: 'seraphine',
    triggerZoneId: 'erebos',
    triggerCondition: 'Ch1 에레보스 진입 후 첫 만남 + 안내인 제안 수락',
    joinNarrative: '엘파리스 정찰병 — 에레보스 폐허 안내인 자처.',
  },
  {
    companionObsidianId: 'maestro_crio',
    triggerZoneId: 'erebos',
    triggerCondition: 'Ch1 에레보스 도서관 발견 + 60년 정보망 거래 성공',
    joinNarrative: '200년 생존자 정보상 — 에리언 기억 공명 능력 인정.',
  },
  {
    companionObsidianId: 'ignara',
    triggerZoneId: 'solaris',
    triggerCondition: 'Ch3 솔라리스 진입 + 아버지 이그리스 회상 트리거',
    joinNarrative: '이프리타 족장의 딸 — 부족 음모 진실 추적 동행.',
  },
  {
    companionObsidianId: 'benjamin_cross',
    triggerZoneId: 'argentium',
    triggerCondition: 'Ch4 아르겐티움 잠입 + 밀리아 구출 정보 교환',
    joinNarrative: '전직 형사 — 레테 교단 정보 + 밀리아 구출 동맹.',
  },
  {
    companionObsidianId: 'reina',
    triggerZoneId: 'argentium',
    triggerCondition: 'Ch4 황궁 침투 + 교단 내부고발 결심',
    joinNarrative: '레테 교단 내부고발자 — 12 신화 회귀 음모 폭로.',
  },
  {
    companionObsidianId: 'urgrom',
    triggerZoneId: 'argentium',
    triggerCondition: 'Ch4 북방 기억석 사원 방문 + 봉인 협력 약속',
    joinNarrative: '북방 사원 수호자 — 200년 봉인 의식 마지막 단서 전달.',
  },
];

export function getJoinTriggerByCompanion(
  companionObsidianId: string,
): CompanionJoinTrigger | undefined {
  return COMPANION_JOIN_TRIGGERS.find(
    (t) => t.companionObsidianId === companionObsidianId,
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-84: 시나리오 보스 페이즈 narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface BossPhase {
  bossObsidianId: string;
  /** 페이즈 번호 (1부터) */
  phase: number;
  /** 페이즈 narrative */
  description: string;
}

export const SCENARIO_BOSS_PHASES: readonly BossPhase[] = [
  // 말라투스 3 페이즈
  { bossObsidianId: 'malatus_ancient', phase: 1, description: '말라투스 1페이즈 — 시간 지연 + 식물 마법 기본 공격' },
  { bossObsidianId: 'malatus_ancient', phase: 2, description: '말라투스 2페이즈 — 카엘 회상 환영 + 세라핀 정신 공격' },
  { bossObsidianId: 'malatus_ancient', phase: 3, description: '말라투스 3페이즈 — 천 년의 분노 + 광역 식물 폭주' },
  // 라와르 3 페이즈
  { bossObsidianId: 'rawar', phase: 1, description: '라와르 1페이즈 — 솔리안 의식 + 불꽃 패턴' },
  { bossObsidianId: 'rawar', phase: 2, description: '라와르 2페이즈 — 자기희생 봉인 narrative 공명' },
  { bossObsidianId: 'rawar', phase: 3, description: '라와르 3페이즈 — 200년 영혼 분열 + 최종 봉인 의식' },
  // 베르나르도 (타락 형태)
  { bossObsidianId: 'benjamin_cross', phase: 1, description: '베르나르도 1페이즈 — 형사 검술 + 그림자 잠입' },
  { bossObsidianId: 'benjamin_cross', phase: 2, description: '베르나르도 2페이즈 — 레테 교단 타락 + 망각 검술 발현' },
  // 레테 5 페이즈
  { bossObsidianId: 'lethe', phase: 1, description: '레테 1페이즈 — 망각의 안개 + 기억 침식 시작' },
  { bossObsidianId: 'lethe', phase: 2, description: '레테 2페이즈 — 4 파편 무력화 시도 + 동료 환영 공격' },
  { bossObsidianId: 'lethe', phase: 3, description: '레테 3페이즈 — 12 신화 회귀 패턴 + 시간 왜곡 광역기' },
  { bossObsidianId: 'lethe', phase: 4, description: '레테 4페이즈 — 에리언 카일 회상 침투 + 의지 시험' },
  { bossObsidianId: 'lethe', phase: 5, description: '레테 5페이즈 — 4 파편 통합 최종 봉인 or 엔딩 분기' },
];

export function listBossPhases(bossObsidianId: string): readonly BossPhase[] {
  return SCENARIO_BOSS_PHASES.filter((p) => p.bossObsidianId === bossObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-86: 챕터별 메인 적대자 narrative
// ════════════════════════════════════════════════════════════════

export interface ChapterAntagonist {
  chapter: number;
  /** 적대자 obsidianId (boss or NPC) */
  antagonistObsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 핵심 motivation narrative */
  motivation: string;
}

export const SCENARIO_CHAPTER_ANTAGONISTS: readonly ChapterAntagonist[] = [
  {
    chapter: 1,
    antagonistObsidianId: 'memory_golem',
    name: '기억의 골렘',
    motivation: '에레보스 폐허 수호 + 200년 전 죽은 자들의 마지막 의지.',
  },
  {
    chapter: 2,
    antagonistObsidianId: 'malatus_ancient',
    name: '말라투스 (각성 형태)',
    motivation: '실반헤임 수호 + 시간 지연 영역 침범자 처단.',
  },
  {
    chapter: 3,
    antagonistObsidianId: 'rawar',
    name: '라와르 (솔리안 왕)',
    motivation: '200년 봉인 의식의 마지막 보루 + 솔리안 영혼 해방.',
  },
  {
    chapter: 4,
    antagonistObsidianId: 'kane',
    name: '케인 (기억 사냥꾼)',
    motivation: '레테 교단 정예 + 신성 기억 파편 회수 임무.',
  },
  {
    chapter: 5,
    antagonistObsidianId: 'lethe',
    name: '레테 (망각의 신)',
    motivation: '망각을 통한 \'구원\' + 12 신화 시대 회귀.',
  },
];

export function getChapterAntagonist(chapter: number): ChapterAntagonist | undefined {
  return SCENARIO_CHAPTER_ANTAGONISTS.find((a) => a.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-87: 동료 친밀도 이벤트 narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface AffinityEvent {
  obsidianId: string;
  companionObsidianId: string;
  /** 발생 chapter */
  chapter: number;
  /** 친밀도 변화량 */
  affinityDelta: number;
  /** narrative 설명 */
  narrative: string;
}

export const COMPANION_AFFINITY_EVENTS: readonly AffinityEvent[] = [
  {
    obsidianId: 'affinity_seraphine_kael_share',
    companionObsidianId: 'seraphine',
    chapter: 2,
    affinityDelta: 30,
    narrative: '말라투스 고목에서 세라핀이 카엘 회상 공유 — 신뢰 형성.',
  },
  {
    obsidianId: 'affinity_crio_information_trust',
    companionObsidianId: 'maestro_crio',
    chapter: 1,
    affinityDelta: 20,
    narrative: '크리오에게 첫 정보 거래 성공 — 60년 정보망 일부 공개.',
  },
  {
    obsidianId: 'affinity_ignara_father_truth',
    companionObsidianId: 'ignara',
    chapter: 3,
    affinityDelta: 25,
    narrative: '이그나의 아버지 진실 함께 추적 — 이프리타 내부 음모 확인.',
  },
  {
    obsidianId: 'affinity_benjamin_milia_rescue',
    companionObsidianId: 'benjamin_cross',
    chapter: 4,
    affinityDelta: 40,
    narrative: '벤자민 조카 밀리아 구출 협력 — 평생 빚 narrative.',
  },
  {
    obsidianId: 'affinity_reina_cult_betray',
    companionObsidianId: 'reina',
    chapter: 4,
    affinityDelta: 30,
    narrative: '레이나 교단 배신 결심 함께 지원 — 12 신화 진실 공유.',
  },
  {
    obsidianId: 'affinity_urgrom_temple_seal',
    companionObsidianId: 'urgrom',
    chapter: 4,
    affinityDelta: 35,
    narrative: '우르그롬 북방 사원 봉인 의식 협력 — 200년 마지막 단서 전달.',
  },
];

export function getAffinityEventByObsidianId(
  obsidianId: string,
): AffinityEvent | undefined {
  return COMPANION_AFFINITY_EVENTS.find((e) => e.obsidianId === obsidianId);
}

export function listAffinityEventsByCompanion(
  companionObsidianId: string,
): readonly AffinityEvent[] {
  return COMPANION_AFFINITY_EVENTS.filter(
    (e) => e.companionObsidianId === companionObsidianId,
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-88: 챕터별 임시 사건 (incidental event) narrative
// ════════════════════════════════════════════════════════════════

export interface IncidentalEvent {
  obsidianId: string;
  chapter: number;
  /** 한글 제목 */
  title: string;
  /** 사건 narrative */
  description: string;
}

export const SCENARIO_INCIDENTAL_EVENTS: readonly IncidentalEvent[] = [
  {
    obsidianId: 'incident_ch1_cantela_storm',
    chapter: 1,
    title: '칸텔라 마을 기억 폭풍',
    description: '게임 시작 시 칸텔라 마을 전역 기억 소멸 폭풍 — 일부 마을민 사라짐.',
  },
  {
    obsidianId: 'incident_ch2_elfaris_blockade',
    chapter: 2,
    title: '엘파리스 경비대 봉쇄',
    description: '실반헤임 진입 경비대 봉쇄 — 평화/전투 분기 사건.',
  },
  {
    obsidianId: 'incident_ch3_ifrita_clan_split',
    chapter: 3,
    title: '이프리타 부족 내분',
    description: '솔라리스 채광 기지 사건 이후 이프리타 부족 분열.',
  },
  {
    obsidianId: 'incident_ch4_emperor_collapse',
    chapter: 4,
    title: '황제 레나르도 발작',
    description: '황궁 내부 황제 레나르도 레테 그릇 발작 — 제국 혼란.',
  },
  {
    obsidianId: 'incident_ch5_reality_break',
    chapter: 5,
    title: '현실 파열',
    description: '망각의 고원 진입 시 현실 일부 파열 — 시간 왜곡 발생.',
  },
];

export function getIncidentalEventByObsidianId(
  obsidianId: string,
): IncidentalEvent | undefined {
  return SCENARIO_INCIDENTAL_EVENTS.find((e) => e.obsidianId === obsidianId);
}

export function listIncidentalEventsByChapter(
  chapter: number,
): readonly IncidentalEvent[] {
  return SCENARIO_INCIDENTAL_EVENTS.filter((e) => e.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-89: 게임 day-by-day timeline narrative
// ════════════════════════════════════════════════════════════════

export interface DayTimeline {
  /** 게임 시작 후 일자 (1부터) */
  day: number;
  chapter: number;
  /** 그 날의 핵심 사건 narrative */
  event: string;
}

export const SCENARIO_DAY_TIMELINE: readonly DayTimeline[] = [
  { day: 1, chapter: 1, event: '게임 시작 — 칸텔라 마을 폭풍 사건' },
  { day: 3, chapter: 1, event: '에레보스 폐허 진입 + 세라핀 만남' },
  { day: 7, chapter: 1, event: '에레보스 도서관 발견 + 크리오 만남' },
  { day: 14, chapter: 1, event: 'Ch1 종결 — 에레보스 파편 회수' },
  { day: 15, chapter: 2, event: 'Ch2 시작 — 실반헤임 진입' },
  { day: 28, chapter: 2, event: '말라투스 보스전' },
  { day: 35, chapter: 2, event: 'Ch2 종결 — 실반헤임 파편 회수' },
  { day: 36, chapter: 3, event: 'Ch3 시작 — 솔라리스 사막 도착' },
  { day: 50, chapter: 3, event: '이그나 합류 + 채광 기지 작전' },
  { day: 63, chapter: 3, event: 'Ch3 종결 — 라와르 봉인 + 솔라리스 파편' },
  { day: 64, chapter: 4, event: 'Ch4 시작 — 아르겐티움 잠입' },
  { day: 80, chapter: 4, event: '벤자민/레이나/우르그롬 합류' },
  { day: 93, chapter: 4, event: 'Ch4 종결 — 아르겐티움 파편 + 베르나르도 분기' },
  { day: 94, chapter: 5, event: 'Ch5 시작 — 망각의 고원 진입' },
  { day: 100, chapter: 5, event: 'Ch5 종결 — 레테 최종 결전' },
];

export function getDayEvent(day: number): DayTimeline | undefined {
  return SCENARIO_DAY_TIMELINE.find((d) => d.day === day);
}

export function listDayEventsByChapter(chapter: number): readonly DayTimeline[] {
  return SCENARIO_DAY_TIMELINE.filter((d) => d.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-91: 시나리오 collectible 모음품 narrative
// ════════════════════════════════════════════════════════════════

export interface Collectible {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** 발견 zone obsidianId */
  zoneObsidianId: string;
  /** 한글 narrative */
  description: string;
}

export const SCENARIO_COLLECTIBLES: readonly Collectible[] = [
  {
    obsidianId: 'collectible_cantela_old_diary',
    name: '오래된 일기장',
    zoneObsidianId: 'cantela_village',
    description: '에리언 어머니의 일기장 — 200년 전 봉인 의식 단서 일부 포함.',
  },
  {
    obsidianId: 'collectible_erebos_torn_letter',
    name: '찢어진 편지',
    zoneObsidianId: 'erebos',
    description: '대망각 당일 마지막 편지 — 에레보스 시민의 마지막 작별.',
  },
  {
    obsidianId: 'collectible_silvanheim_petal',
    name: '말라투스 꽃잎',
    zoneObsidianId: 'silvanheim',
    description: '말라투스 고목에서 떨어진 꽃잎 — 천 년 기억 잔재.',
  },
  {
    obsidianId: 'collectible_solaris_crystal',
    name: '솔라리스 에테르 결정',
    zoneObsidianId: 'solaris',
    description: '이프리타 영역의 발광 에테르 결정 — 이그나의 부족 유물.',
  },
  {
    obsidianId: 'collectible_argentium_imperial_seal',
    name: '제국 인장 조각',
    zoneObsidianId: 'argentium',
    description: '아르겐티움 황궁의 부서진 인장 — 황제 레나르도 비밀 단서.',
  },
  {
    obsidianId: 'collectible_oblivion_kail_token',
    name: '카일의 봉인 토큰',
    zoneObsidianId: 'oblivion_plateau',
    description: '카일이 200년 전 남긴 봉인 의식 토큰 — Ch5 진입 마커.',
  },
];

export function getCollectibleByObsidianId(
  obsidianId: string,
): Collectible | undefined {
  return SCENARIO_COLLECTIBLES.find((c) => c.obsidianId === obsidianId);
}

export function listCollectiblesByZone(
  zoneObsidianId: string,
): readonly Collectible[] {
  return SCENARIO_COLLECTIBLES.filter((c) => c.zoneObsidianId === zoneObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-93: 시나리오 save slot marker narrative
// ════════════════════════════════════════════════════════════════

export interface SaveSlot {
  /** 추천 save slot 번호 (1부터) */
  slotNumber: number;
  /** save 시점 chapter */
  chapter: number;
  /** save 시점 narrative */
  context: string;
}

export const SCENARIO_SAVE_SLOTS: readonly SaveSlot[] = [
  {
    slotNumber: 1,
    chapter: 1,
    context: 'Ch1 진입 직후 — 칸텔라 마을 시작 + 능력 각성 직후',
  },
  {
    slotNumber: 2,
    chapter: 2,
    context: 'Ch2 시작 — 실반헤임 외교 분기 직전',
  },
  {
    slotNumber: 3,
    chapter: 3,
    context: 'Ch3 진입 — 솔라리스 사막 + 라와르 분기 직전',
  },
  {
    slotNumber: 4,
    chapter: 4,
    context: 'Ch4 잠입 — 아르겐티움 + 베르나르도 분기 직전 (가장 분기 풍부)',
  },
  {
    slotNumber: 5,
    chapter: 5,
    context: 'Ch5 진입 — 황금 에테르 탑 + 엔딩 분기 직전 (최종 분기점)',
  },
];

export function getSaveSlotByChapter(chapter: number): SaveSlot | undefined {
  return SCENARIO_SAVE_SLOTS.find((s) => s.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-94: 시나리오 tutorial narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface TutorialStep {
  /** tutorial 단계 번호 */
  step: number;
  /** 한글 제목 */
  title: string;
  /** 학습 내용 narrative */
  content: string;
}

export const SCENARIO_TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    step: 1,
    title: '게임 시작 — 칸텔라 마을',
    content: '에리언의 기억 공명 능력 각성 + 기본 이동/대화 학습.',
  },
  {
    step: 2,
    title: '첫 전투 — 기억 잔영',
    content: 'ATB 전투 시스템 + 기본 공격/방어 학습.',
  },
  {
    step: 3,
    title: '동료 합류 — 세라핀',
    content: '파티 시스템 + 동료 신뢰도 도입.',
  },
  {
    step: 4,
    title: '에테르 결정 + 인벤토리',
    content: '아이템 사용 + 인벤토리 관리 + 장비 교체.',
  },
  {
    step: 5,
    title: '스킬 트리 + 클래스 시스템',
    content: 'STORY 7 클래스 + 스킬 트리 + 진로 학습.',
  },
  {
    step: 6,
    title: '신성 기억 파편 회수',
    content: '4 파편 시스템 + 엔딩 분기 영향 narrative.',
  },
];

export function getTutorialStepByNumber(step: number): TutorialStep | undefined {
  return SCENARIO_TUTORIAL_STEPS.find((t) => t.step === step);
}

// ════════════════════════════════════════════════════════════════
// SYNC-96: 시나리오 advanced 보상 트리 narrative
// ════════════════════════════════════════════════════════════════

export interface RewardTreeNode {
  obsidianId: string;
  chapter: number;
  /** 한글 보상 이름 */
  rewardName: string;
  /** 선행 노드 obsidianId (있을 경우) */
  prerequisite?: string;
  /** 보상 narrative */
  description: string;
}

export const SCENARIO_REWARD_TREE: readonly RewardTreeNode[] = [
  {
    obsidianId: 'reward_ch1_first_resonance',
    chapter: 1,
    rewardName: '첫 기억 공명',
    description: 'Ch1 진입 시 에리언 기억 공명 능력 초기 unlock.',
  },
  {
    obsidianId: 'reward_ch1_seraphine_join',
    chapter: 1,
    rewardName: '세라핀 합류 + 정찰 시야',
    prerequisite: 'reward_ch1_first_resonance',
    description: '세라핀 합류 후 정찰 시야 시스템 활성화.',
  },
  {
    obsidianId: 'reward_ch2_silvanheim_blessing',
    chapter: 2,
    rewardName: '실반헤임 축복',
    prerequisite: 'reward_ch1_seraphine_join',
    description: '말라투스 보스전 종결 후 시간 지연 면역 부여.',
  },
  {
    obsidianId: 'reward_ch3_ifrita_flame',
    chapter: 3,
    rewardName: '이프리타 불꽃',
    prerequisite: 'reward_ch2_silvanheim_blessing',
    description: '이그나 합류 후 화염 마법 + 에테르 결정 활용.',
  },
  {
    obsidianId: 'reward_ch4_empire_seal',
    chapter: 4,
    rewardName: '제국 인장 + 6 동료 결성',
    prerequisite: 'reward_ch3_ifrita_flame',
    description: '6 동료 완성 + 황금 에테르 탑 진입 키 회수.',
  },
  {
    obsidianId: 'reward_ch5_fragment_integration',
    chapter: 5,
    rewardName: '4 파편 통합',
    prerequisite: 'reward_ch4_empire_seal',
    description: '4 파편 통합 + 레테 5페이즈 결전 자격.',
  },
];

export function getRewardTreeNodeByObsidianId(
  obsidianId: string,
): RewardTreeNode | undefined {
  return SCENARIO_REWARD_TREE.find((n) => n.obsidianId === obsidianId);
}

export function listRewardTreeByChapter(chapter: number): readonly RewardTreeNode[] {
  return SCENARIO_REWARD_TREE.filter((n) => n.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-97: 시나리오 이스터에그 narrative
// ════════════════════════════════════════════════════════════════

export interface EasterEgg {
  obsidianId: string;
  /** 발견 zone obsidianId */
  zoneObsidianId: string;
  /** 한글 이스터에그 narrative */
  description: string;
  /** 트리거 조건 */
  trigger: string;
}

export const SCENARIO_EASTER_EGGS: readonly EasterEgg[] = [
  {
    obsidianId: 'egg_crio_developer_diary',
    zoneObsidianId: 'erebos',
    description: '에레보스 도서관 깊은 곳 — hotbit 개발자 일기장 발견.',
    trigger: 'Ch1 에레보스 도서관에서 특정 책장 3번 상호작용.',
  },
  {
    obsidianId: 'egg_silvanheim_chrono_trigger',
    zoneObsidianId: 'silvanheim',
    description: '말라투스 고목 옆 작은 공동 — \'크로노 트리거\' 헌사.',
    trigger: 'Ch2 말라투스 고목 뒤편 숨겨진 길.',
  },
  {
    obsidianId: 'egg_solaris_ff6_atb',
    zoneObsidianId: 'solaris',
    description: '솔라리스 모래 폭풍 — FF6 ATB 시그니처 헌사.',
    trigger: 'Ch3 솔라리스 모래 폭풍 중 특정 위치 대기.',
  },
  {
    obsidianId: 'egg_argentium_aeterna_team',
    zoneObsidianId: 'argentium',
    description: '아르겐티움 황궁 비밀 방 — 에테르나 팀 표지판.',
    trigger: 'Ch4 황궁 침투 시 비밀 방 열기.',
  },
  {
    obsidianId: 'egg_oblivion_kail_signature',
    zoneObsidianId: 'oblivion_plateau',
    description: '망각의 고원 — 카일의 봉인 의식 시그니처 (200년 전).',
    trigger: 'Ch5 황금 에테르 탑 진입 직전 특정 좌표.',
  },
];

export function getEasterEggByObsidianId(
  obsidianId: string,
): EasterEgg | undefined {
  return SCENARIO_EASTER_EGGS.find((e) => e.obsidianId === obsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-98: New Game+ narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface NewGamePlusBonus {
  obsidianId: string;
  /** 한글 이름 */
  name: string;
  /** unlock 조건 (선행 엔딩 code) */
  unlockedByEnding: ScenarioEndingCode;
  /** narrative 설명 */
  description: string;
}

export const SCENARIO_NEW_GAME_PLUS: readonly NewGamePlusBonus[] = [
  {
    obsidianId: 'ng_plus_ending_a',
    name: '완전한 승리 회상',
    unlockedByEnding: 'A',
    description: '엔딩 A 클리어 후 — 차회차에서 모든 동료 회상 시그니처 unlock.',
  },
  {
    obsidianId: 'ng_plus_ending_b',
    name: '부분 봉인 회상',
    unlockedByEnding: 'B',
    description: '엔딩 B 클리어 후 — 차회차에서 신성 파편 시각 효과 강화.',
  },
  {
    obsidianId: 'ng_plus_ending_c',
    name: '수용의 회상',
    unlockedByEnding: 'C',
    description: '엔딩 C 클리어 후 — 차회차에서 망각 narrative 추가 dialogue unlock.',
  },
  {
    obsidianId: 'ng_plus_ending_d',
    name: '신화의 후예 회상',
    unlockedByEnding: 'D',
    description: '엔딩 D 클리어 후 — 차회차에서 12 신화 시대 chapter 0 unlock.',
  },
  {
    obsidianId: 'ng_plus_ending_fail',
    name: '망각의 침묵',
    unlockedByEnding: 'FAIL',
    description: '엔딩 FAIL 후 — 레테 시점 부 시나리오 unlock.',
  },
];

export function getNewGamePlusByEnding(
  ending: ScenarioEndingCode,
): NewGamePlusBonus | undefined {
  return SCENARIO_NEW_GAME_PLUS.find((n) => n.unlockedByEnding === ending);
}

// ════════════════════════════════════════════════════════════════
// SYNC-99: credits roll narrative SSOT
// ════════════════════════════════════════════════════════════════

export interface CreditsSection {
  /** 순서 */
  order: number;
  /** 한글 섹션 제목 */
  section: string;
  /** 내용 narrative */
  content: string;
}

export const SCENARIO_CREDITS: readonly CreditsSection[] = [
  {
    order: 1,
    section: '에테르나 크로니클',
    content: '게임 제목 시그니처 + 메인 테마 narrative.',
  },
  {
    order: 2,
    section: '주요 등장 인물',
    content: '에리언/카일/세라핀/크리오/이그나/벤자민/레이나/우르그롬/레테/미네르바.',
  },
  {
    order: 3,
    section: '세계 — 에테르나 대륙',
    content: '에레보스/실반헤임/솔라리스/아르겐티움/망각의 고원/황금 에테르 탑.',
  },
  {
    order: 4,
    section: '신화 — 12 신',
    content: '창세 11신 (크로나이/이그나루스/베르다/아키우스 외) + 배제된 레테.',
  },
  {
    order: 5,
    section: '신성 기억 파편',
    content: '에레보스/실반헤임/솔라리스/아르겐티움 4 파편 통합.',
  },
  {
    order: 6,
    section: '제작 — hotbit',
    content: '에테르나 팀 + Claude Code 협업 narrative.',
  },
];

export function getCreditsByOrder(order: number): CreditsSection | undefined {
  return SCENARIO_CREDITS.find((c) => c.order === order);
}

/**
 * 종합 game state → 단일 GameProgressReport.
 *
 * 모든 game-flow evaluator (chapter progress, advanced ending,
 * fragment count, companion alive/left, minerva check) 통합.
 */
export function evaluateGameProgress(
  input: GameProgressInput,
): GameProgressReport {
  const chapterProgress = evaluateChapterProgress(input.currentChapter, input.completedQuests);

  // 다음 chapter 진입 가능 여부
  const nextChapter = input.currentChapter + 1;
  const completedChapters = input.completedChapters ?? new Set<number>();
  const canEnterNextChapter = nextChapter <= 5
    ? canEnterChapter(nextChapter, completedChapters, input.collectedFragments)
    : false;

  // 고급 엔딩 평가
  const mythicRelicsCount = input.collectedRelics
    ? SCENARIO_MYTHIC_RELICS.filter((r) => input.collectedRelics!.has(r.obsidianId)).length
    : 0;
  const advancedEval = evaluateAdvancedEnding({
    completedQuests: input.completedQuests,
    companionLoyalty: input.companionLoyalty,
    metMinerva: input.metMinerva,
    mythicRelicsCount,
    defeatedByLethe: input.defeatedByLethe,
  });

  // 전체 진행률 (chapter 5 = 1.0)
  const totalProgress = Math.min(
    1,
    ((input.currentChapter - 1) + chapterProgress.progressRatio) / 5,
  );

  return {
    currentChapter: input.currentChapter,
    chapterProgress,
    canEnterNextChapter,
    achievableEnding: advancedEval.achievableEnding,
    isFailure: advancedEval.isFailure,
    canAchieveEndingD: advancedEval.canAchieveEndingD,
    aliveCompanions: advancedEval.aliveCompanions,
    leftCompanions: advancedEval.leftCompanions,
    fragmentsCollected: advancedEval.fragmentsCollected,
    mythicRelicsCollected: mythicRelicsCount,
    totalProgress,
  };
}

// ════════════════════════════════════════════════════════════════
// SYNC-13: 시나리오 연대표 timeline + 핵심 이벤트
// 출처: 시나리오/연대표_역사기록.md + 시나리오 마스터 문서
// ════════════════════════════════════════════════════════════════

export type ScenarioEra =
  | 'creation'        // 창세 시대
  | 'ancient_myth'    // 고대 신화 시대
  | 'solian'          // 솔리안 문명 시대
  | 'kalimar'         // 칼리마르 제국 시대
  | 'great_forgetting'// 대망각 (세계력 3,200년)
  | 'post_forgetting' // 망각 이후 (세계력 3,200~3,412년)
  | 'present';        // 현재 (세계력 3,412년, 게임 시작)

export interface TimelineEvent {
  obsidianId: string;
  /** 이벤트 한글 이름 */
  name: string;
  /** 시대 분류 */
  era: ScenarioEra;
  /** 세계력 년도 (적용 가능 시) */
  worldYear?: number;
  /** 이벤트 narrative 요약 */
  summary: string;
}

export const SCENARIO_TIMELINE: readonly TimelineEvent[] = [
  {
    obsidianId: 'twelve_gods_creation',
    name: '열두 신의 세계 창조',
    era: 'creation',
    summary: '파비우스/크로나이/베르다 외 11신이 세계 창조. 레테(망각)만 배제 — 모든 비극의 씨앗.',
  },
  {
    obsidianId: 'ether_crystal_birth',
    name: '에테르 결정의 탄생',
    era: 'creation',
    summary: '세계가 완성되자 에테르 에너지가 흐르기 시작하여 에테르 결정 형성. 미래 문명의 기초.',
  },
  {
    obsidianId: 'ifrita_first_flame',
    name: '이프리타 \'최초의 불꽃\' 수여',
    era: 'ancient_myth',
    summary: '이프리타족 시조 카를라가 이그나루스 신으로부터 최초의 불꽃 수여. 솔라리스 사막 문화 기초.',
  },
  {
    obsidianId: 'malatus_awakening',
    name: '실반헤임의 말라투스 나무 각성',
    era: 'ancient_myth',
    summary: '말라투스 고목이 기억을 흡수하기 시작. 엘파리스족이 신성한 존재로 수호. 기억 소멸 유일 안전 구역.',
  },
  {
    obsidianId: 'lethe_belief_formation',
    name: '레테의 신념 형성',
    era: 'ancient_myth',
    summary: '레테는 세계의 기억들이 쌓여가는 것을 관찰. "기억은 고통이다, 기억이 없다면 아픔도 없다" — 망각 구원론.',
  },
  {
    obsidianId: 'solian_golden_age',
    name: '솔리안 황금기',
    era: 'solian',
    worldYear: -3000,
    summary: '솔라리스 사막에 에테르 결정 신전 도시 건설. 라와르 왕 통치 — 현명하고 자비로운 군주.',
  },
  {
    obsidianId: 'solian_collapse',
    name: '레테 강림 + 솔리안 멸망 + 라와르 봉인',
    era: 'solian',
    summary: '레테가 거대한 눈들의 집합체로 하강. 기억 소멸 폭풍으로 솔리안 한 밤에 파괴. 라와르의 자기희생 봉인 의식 → 영원한 수면.',
  },
  {
    obsidianId: 'kalimar_founding',
    name: '칼리마르 제국 건설',
    era: 'kalimar',
    summary: '솔리안 멸망 후 새로운 문명. 아르겐티움 중심 칼리마르 제국 확립.',
  },
  {
    obsidianId: 'lethe_cult_formation',
    name: '레테 교단 태동',
    era: 'kalimar',
    worldYear: 3000,
    summary: '망각의 신 레테 추종 종교 조직 형성. 기억 소멸을 통한 세계의 "구원" 목표. 비밀스럽게 제국 잠식.',
  },
  {
    obsidianId: 'great_forgetting_event',
    name: '대망각 (200년 전 봉인 의식)',
    era: 'great_forgetting',
    worldYear: 3200,
    summary: '레테 재강림 방지 봉인 의식. 12인이 신성 기억 파편 4개 봉인 (에레보스/실반헤임/솔라리스/아르겐티움). 카일은 환생.',
  },
  {
    obsidianId: 'empire_dark_age',
    name: '제국 암흑기 + MDS 확산',
    era: 'post_forgetting',
    summary: '기억 소멸 충격으로 문명 퇴보. 레테 교단이 제국 지배층에 깊숙이 침투. MDS (기억 소멸 증후군) 세계 전역 확산.',
  },
  {
    obsidianId: 'aerien_birth',
    name: '에리언 탄생',
    era: 'post_forgetting',
    worldYear: 3374,
    summary: '주인공 에리언이 약 38세가 되는 시점이 게임 시작. 카일의 전생으로서 기억 공명 능력 각성 대기.',
  },
  {
    obsidianId: 'game_start_cantela',
    name: '게임 시작 — 칸텔라 마을 사건',
    era: 'present',
    worldYear: 3412,
    summary: '칸텔라 마을의 기억 소멸 폭풍으로 게임 시작. 에리언은 카일의 전생으로서 기억 공명 능력 각성. 신성 기억 파편 4개 회수 사명.',
  },
];

export function getTimelineEventByObsidianId(
  obsidianId: string,
): TimelineEvent | undefined {
  return SCENARIO_TIMELINE.find((e) => e.obsidianId === obsidianId);
}

export function listTimelineEventsByEra(era: ScenarioEra): readonly TimelineEvent[] {
  return SCENARIO_TIMELINE.filter((e) => e.era === era);
}

// ════════════════════════════════════════════════════════════════
// SYNC-15: 챕터별 game-flow milestone
// 각 챕터 진행에 따른 게임 상태 변화 narrative (수주→완료 순서)
// ════════════════════════════════════════════════════════════════

export interface ChapterMilestone {
  chapter: number;
  /** 챕터 시작 시 plot beat */
  startBeat: string;
  /** 챕터 종료 시 plot beat */
  endBeat: string;
  /** 챕터 완료 전 필수 quest codes (모두 완료 시 chapter 종결) */
  requiredQuests: readonly string[];
  /** 챕터 종결 시 합류하는 동료 obsidianId */
  unlockedCompanions: readonly string[];
  /** 챕터에서 회수하는 파편 obsidianId (있을 경우) */
  collectedFragment?: string;
}

export const SCENARIO_MILESTONES: readonly ChapterMilestone[] = [
  {
    chapter: 1,
    startBeat: '칸텔라 마을 기억 소멸 폭풍 → 에리언 기억 공명 능력 각성',
    endBeat: '에레보스 폐허 탐사 → 첫 신성 기억 파편 (에레보스) 회수',
    requiredQuests: ['MQ_CH01', 'SQ_COMPANION_SERAPHINE', 'SQ_COMPANION_CRIO', 'SQ_EREBOS_RUINS'],
    unlockedCompanions: ['seraphine', 'maestro_crio'],
    collectedFragment: 'fragment_erebos',
  },
  {
    chapter: 2,
    startBeat: '실반헤임 (장막의 숲) 진입 + 엘파리스 외교 분기',
    endBeat: '말라투스 고목 보스전 → 실반헤임 파편 회수',
    requiredQuests: ['MQ_CH03', 'SQ_SILVANHEIM_FRAGMENT'],
    unlockedCompanions: [],
    collectedFragment: 'fragment_silvanheim',
  },
  {
    chapter: 3,
    startBeat: '솔라리스 사막 진입 + 이그나 합류 + 채광 기지 작전',
    endBeat: '솔리안 유적 탐사 → 라와르 봉인 → 솔라리스 파편 회수',
    requiredQuests: ['SQ_COMPANION_IGNARA', 'SQ_SOLARIS_RAWAR'],
    unlockedCompanions: ['ignara'],
    collectedFragment: 'fragment_solaris',
  },
  {
    chapter: 4,
    startBeat: '아르겐티움 제국 잠입 + 황궁 침투 + 베르나르도 / 레이나 / 우르그롬 합류',
    endBeat: '케인 처치 + 베르나르도 최후 대결 + 아르겐티움 파편 회수',
    requiredQuests: [
      'MQ_CH04',
      'SQ_COMPANION_REINA',
      'SQ_COMPANION_URGROM',
      'SQ_KANE_HUNT',
      'SQ_ARGENTIUM_FRAGMENT',
      'MQ_CH12',
    ],
    unlockedCompanions: ['benjamin_cross', 'reina', 'urgrom'],
    collectedFragment: 'fragment_argentium',
  },
  {
    chapter: 5,
    startBeat: '망각의 고원 + 황금 에테르 탑 침입 + 4 파편 통합',
    endBeat: '레테 최종 대전 (5페이즈) → 엔딩 분기 (A/B/C/D)',
    requiredQuests: ['MQ_CH13', 'MQ_CH14', 'MQ_CH15'],
    unlockedCompanions: [],
  },
];

export function getMilestoneByChapter(chapter: number): ChapterMilestone | undefined {
  return SCENARIO_MILESTONES.find((m) => m.chapter === chapter);
}

/** 챕터 milestone 진행 상태 평가 */
export interface ChapterProgress {
  chapter: number;
  isComplete: boolean;
  /** 미완료 quest codes */
  pendingQuests: readonly string[];
  /** 진행률 (0~1) */
  progressRatio: number;
}

export function evaluateChapterProgress(
  chapter: number,
  completedQuests: ReadonlySet<string>,
): ChapterProgress {
  const milestone = getMilestoneByChapter(chapter);
  if (!milestone) {
    return { chapter, isComplete: false, pendingQuests: [], progressRatio: 0 };
  }
  const pending = milestone.requiredQuests.filter((q) => !completedQuests.has(q));
  return {
    chapter,
    isComplete: pending.length === 0,
    pendingQuests: pending,
    progressRatio: (milestone.requiredQuests.length - pending.length) / milestone.requiredQuests.length,
  };
}

// ════════════════════════════════════════════════════════════════
// 엔딩 판정 helper — 파편 수집 + 동료 생존
// ════════════════════════════════════════════════════════════════

export interface EndingEvaluation {
  fragmentsCollected: number;
  allCompanionsAlive: boolean;
  /** 달성 가능한 엔딩 (A 가장 좋고 FAIL 패배) */
  achievableEnding: ScenarioEndingCode;
}

/**
 * 신성 기억 파편 수집량 + 동료 생존 상태로 달성 가능한 엔딩 산출.
 * 엔딩 D (신화 시대 회귀) 는 별도 신화 조건이라 본 함수에서 제외.
 */
export function evaluateEnding(
  fragmentsCollected: number,
  allCompanionsAlive: boolean,
): EndingEvaluation {
  // 파편 0 + 동료 이탈 → C (수용)
  // 파편 1~2 → C (수용)
  // 파편 3 → B (증언)
  // 파편 4 + 전원 생존 → A (수호)
  // 파편 4 + 동료 일부 이탈 → B (전원 조건 미달)
  let achievableEnding: ScenarioEndingCode = 'FAIL';

  if (fragmentsCollected >= 4 && allCompanionsAlive) {
    achievableEnding = 'A';
  } else if (fragmentsCollected >= 3) {
    achievableEnding = 'B';
  } else {
    achievableEnding = 'C';
  }

  return {
    fragmentsCollected,
    allCompanionsAlive,
    achievableEnding,
  };
}

// ════════════════════════════════════════════════════════════════
// 추가 헬퍼 — 정량 sanity
// ════════════════════════════════════════════════════════════════

export function getFragmentByObsidianId(
  obsidianId: string,
): ScenarioFragment | undefined {
  return SCENARIO_FRAGMENTS.find((f) => f.obsidianId === obsidianId);
}

export function getDeityByObsidianId(
  obsidianId: string,
): ScenarioDeity | undefined {
  return SCENARIO_DEITIES.find((d) => d.obsidianId === obsidianId);
}

export function listCreationDeities(): readonly ScenarioDeity[] {
  return SCENARIO_DEITIES.filter((d) => d.inCreation);
}

export function listExcludedDeities(): readonly ScenarioDeity[] {
  return SCENARIO_DEITIES.filter((d) => !d.inCreation);
}

// ════════════════════════════════════════════════════════════════
// SYNC-5: planned 매핑 헬퍼 — 미동기 항목 추적
// ════════════════════════════════════════════════════════════════

/** planned ID 가 부여된 미동기 동료 (게임 추가 예정) */
export function listPlannedCompanions(): readonly ScenarioCompanion[] {
  return SCENARIO_COMPANIONS.filter(
    (c) => c.plannedGameNpcId || c.plannedGameBossId,
  );
}

/** planned ID 가 부여된 미동기 zone */
export function listPlannedZones(): readonly ScenarioZone[] {
  return SCENARIO_ZONES.filter(
    (z) => z.plannedGameQuestZoneTarget || z.plannedGameZoneId,
  );
}

/** planned ID 가 부여된 미동기 보스 */
export function listPlannedBosses(): readonly ScenarioBoss[] {
  return SCENARIO_BOSSES.filter(
    (b) => b.plannedGameQuestBossId || b.plannedGameChronoBossId,
  );
}

export interface SyncCompletionReport {
  companions: { total: number; synced: number; planned: number; orphan: number };
  zones: { total: number; synced: number; planned: number; orphan: number };
  bosses: { total: number; synced: number; planned: number; orphan: number };
  /** 전체 entity 의 sync+planned 백분율 (0~100) */
  coveragePercent: number;
}

/**
 * 시나리오 SSOT entity 의 sync/planned/orphan 카운트 + 전체 커버리지 계산.
 * - synced: 게임 코드 매핑 완료 (planned 도 보유 가능)
 * - planned: sync 없이 planned ID 만 있음 (exclusive)
 * - orphan: sync 도 planned 도 없는 entity
 */
export function getSyncCompletionReport(): SyncCompletionReport {
  // sync = 모든 sync 보유 entity
  const companionsSync = listSyncedCompanions().length;
  // planned-only = sync 없이 planned ID 만 있는 entity (exclusive)
  const companionsPlannedOnly = SCENARIO_COMPANIONS.filter(
    (c) => !c.gameNpcId && !c.gameBossId && (c.plannedGameNpcId || c.plannedGameBossId),
  ).length;
  const companionsOrphan = SCENARIO_COMPANIONS.filter(
    (c) => !c.gameNpcId && !c.gameBossId && !c.plannedGameNpcId && !c.plannedGameBossId,
  ).length;
  const companionsTotal = SCENARIO_COMPANIONS.length;

  const zonesSync = listSyncedZones().length;
  const zonesPlannedOnly = SCENARIO_ZONES.filter(
    (z) => !z.gameZoneId && !z.gameQuestZoneTarget &&
           (z.plannedGameZoneId || z.plannedGameQuestZoneTarget),
  ).length;
  const zonesOrphan = SCENARIO_ZONES.filter(
    (z) => !z.gameZoneId && !z.gameQuestZoneTarget &&
           !z.plannedGameZoneId && !z.plannedGameQuestZoneTarget,
  ).length;
  const zonesTotal = SCENARIO_ZONES.length;

  const bossesSync = listSyncedBosses().length;
  const bossesPlannedOnly = SCENARIO_BOSSES.filter(
    (b) => !b.gameChronoBossId && !b.gameQuestBossId &&
           (b.plannedGameChronoBossId || b.plannedGameQuestBossId),
  ).length;
  const bossesOrphan = SCENARIO_BOSSES.filter(
    (b) => !b.gameChronoBossId && !b.gameQuestBossId &&
           !b.plannedGameChronoBossId && !b.plannedGameQuestBossId,
  ).length;
  const bossesTotal = SCENARIO_BOSSES.length;

  const totalEntities = companionsTotal + zonesTotal + bossesTotal;
  const totalOrphan = companionsOrphan + zonesOrphan + bossesOrphan;
  const covered = totalEntities - totalOrphan;

  return {
    companions: {
      total: companionsTotal,
      synced: companionsSync,
      planned: companionsPlannedOnly,
      orphan: companionsOrphan,
    },
    zones: {
      total: zonesTotal,
      synced: zonesSync,
      planned: zonesPlannedOnly,
      orphan: zonesOrphan,
    },
    bosses: {
      total: bossesTotal,
      synced: bossesSync,
      planned: bossesPlannedOnly,
      orphan: bossesOrphan,
    },
    coveragePercent: Math.round((covered / totalEntities) * 100),
  };
}

// ════════════════════════════════════════════════════════════════
// SYNC-102: 필드 NPC 대화 narrative — role default + npc 특화 override
// zoneSeeds 의 필드 NPC (npc_*) 가 대화 인터랙션 시 사용하는 narrative SSOT.
// `{name}` 토큰은 런타임에 NPC 이름으로 치환된다.
// ════════════════════════════════════════════════════════════════

export type FieldNpcRole = 'shop' | 'quest' | 'craft' | 'dialogue' | 'boss';

export interface FieldNpcChoice {
  /** 선택지 id (A/B/C/CLOSE) */
  choiceId: string;
  /** 선택지 label */
  label: string;
}

export interface FieldNpcChoiceResult {
  /** 선택지 id — 'CLOSE' 또는 매칭되는 결과 없으면 대화 종료 */
  choiceId: string;
  /** 결과 대사 — null/누락이면 후속 대사 없이 종료 */
  resultLine: string | null;
}

export interface FieldNpcDialogueTemplate {
  /** role default 면 FieldNpcRole, 특화 NPC 면 npc_* id */
  key: FieldNpcRole | string;
  /** 종류: role 기본 / npc 특화 */
  kind: 'role' | 'npc';
  /** 도입 대사 */
  openingLine: string;
  /** 사용자 선택지 */
  choices: readonly FieldNpcChoice[];
  /** 선택지별 결과 narrative */
  results: readonly FieldNpcChoiceResult[];
}

const FIELD_NPC_ROLE_TEMPLATES: readonly FieldNpcDialogueTemplate[] = [
  {
    key: 'shop',
    kind: 'role',
    openingLine: '필요한 물건이 있다면 둘러보세요. 오래 머뭇거리면 좋은 물건부터 사라집니다.',
    choices: [
      { choiceId: 'A', label: '거래하기' },
      { choiceId: 'B', label: '추천 물품 묻기' },
      { choiceId: 'C', label: '닫기' },
    ],
    results: [
      { choiceId: 'A', resultLine: '{name}의 거래품을 확인했습니다. 회복 물자, 지역 보급품, 희귀 재료 목록이 준비되어 있습니다.' },
      { choiceId: 'B', resultLine: '{name}이 추천 물품을 골라 줬습니다. 현재 지역에서는 회복 물자와 귀환석을 먼저 챙기는 편이 안전합니다.' },
      { choiceId: 'C', resultLine: null },
    ],
  },
  {
    key: 'quest',
    kind: 'role',
    openingLine: '도움이 필요합니다. 준비가 되었다면 의뢰 내용을 확인해 주세요.',
    choices: [
      { choiceId: 'A', label: '의뢰를 확인한다.' },
      { choiceId: 'B', label: '나중에 온다.' },
    ],
    results: [
      { choiceId: 'A', resultLine: '{name}의 의뢰 내용을 확인했습니다. 목표 지점과 위험 요소가 퀘스트 기록에 정리되었습니다.' },
      { choiceId: 'B', resultLine: '{name}이 고개를 끄덕였습니다. 준비가 끝나면 다시 찾아오라고 합니다.' },
    ],
  },
  {
    key: 'craft',
    kind: 'role',
    openingLine: '재료 상태를 확인해 보겠습니다. 무리한 제작은 장비 내구도를 빠르게 깎습니다.',
    choices: [
      { choiceId: 'A', label: '제작을 맡긴다.' },
      { choiceId: 'B', label: '재료를 확인한다.' },
      { choiceId: 'C', label: '그만둔다.' },
    ],
    results: [
      { choiceId: 'A', resultLine: '{name}이 제작 도구를 점검했습니다. 제작 가능한 장비와 강화 재료를 확인할 수 있습니다.' },
      { choiceId: 'B', resultLine: '{name}이 필요한 재료를 짚어 줬습니다. 부족한 재료는 필드 채집과 전투 보상으로 보충해야 합니다.' },
      { choiceId: 'C', resultLine: '{name}이 작업대를 정리했습니다. 제작이 필요해지면 다시 말을 걸어 주세요.' },
    ],
  },
  {
    key: 'dialogue',
    kind: 'role',
    openingLine: '무슨 일로 찾아왔나요? 필요한 이야기가 있다면 짧게 말씀해 주세요.',
    choices: [
      { choiceId: 'A', label: '대화한다.' },
      { choiceId: 'B', label: '지나간다.' },
    ],
    results: [
      { choiceId: 'A', resultLine: '{name}이 현재 지역의 소문과 주의할 징후를 알려 줬습니다. 지도와 퀘스트 동선을 함께 확인하세요.' },
      { choiceId: 'B', resultLine: '{name}과의 대화를 마쳤습니다. 주변 상황은 변하지 않았습니다.' },
    ],
  },
  {
    key: 'boss',
    kind: 'role',
    openingLine: '봉인의 기척이 짙습니다. 섣불리 건드리면 전장이 흔들릴 수 있습니다.',
    choices: [
      { choiceId: 'A', label: '봉인을 조사한다.' },
      { choiceId: 'B', label: '물러난다.' },
    ],
    results: [
      { choiceId: 'A', resultLine: '{name}의 봉인 반응을 조사했습니다. 강한 공명이 감지되며, 전투 준비 후 접근하는 편이 안전합니다.' },
      { choiceId: 'B', resultLine: '{name}에게서 물러났습니다. 봉인은 그대로 유지되고 있습니다.' },
    ],
  },
];

const FIELD_NPC_OVERRIDE_TEMPLATES: readonly FieldNpcDialogueTemplate[] = [
  {
    key: 'npc_ghost_merchant',
    kind: 'npc',
    openingLine: '산 자의 발소리는 오랜만이군. 그림자 안쪽에 오래된 물건들이 남아 있다네.',
    choices: [
      { choiceId: 'A', label: '거래한다.' },
      { choiceId: 'B', label: '희귀 물건을 얻는다.' },
      { choiceId: 'C', label: '지금은 지나간다.' },
    ],
    results: [
      {
        choiceId: 'A',
        resultLine: [
          '고로디가 낡은 궤짝을 열어 거래품을 펼쳤습니다.',
          '[희귀] 망각의 은화 · [고급] 유령 도시 귀환석 · [일반] 영혼 등불',
          '정식 상점 장부가 열리기 전까지는 이 목록에서 필요한 물건을 확인하세요.',
        ].join('\n'),
      },
      {
        choiceId: 'B',
        resultLine: '고로디가 낡은 포장을 풀고 [희귀] 망각의 은화를 건넸습니다. 희귀 물건을 획득했습니다.',
      },
      {
        choiceId: 'C',
        resultLine: '고로디가 궤짝을 닫고 그림자 속으로 한 걸음 물러섰습니다. 필요해지면 다시 말을 걸어 주세요.',
      },
    ],
  },
];

export const SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES: readonly FieldNpcDialogueTemplate[] = [
  ...FIELD_NPC_ROLE_TEMPLATES,
  ...FIELD_NPC_OVERRIDE_TEMPLATES,
];

export function getFieldNpcRoleTemplate(role: string): FieldNpcDialogueTemplate | undefined {
  return SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES.find(
    (t) => t.kind === 'role' && t.key === role,
  );
}

export function getFieldNpcOverrideTemplate(npcId: string): FieldNpcDialogueTemplate | undefined {
  return SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES.find(
    (t) => t.kind === 'npc' && t.key === npcId,
  );
}

export function resolveFieldNpcTemplate(
  npcId: string,
  role: string,
): FieldNpcDialogueTemplate | undefined {
  return getFieldNpcOverrideTemplate(npcId) ?? getFieldNpcRoleTemplate(role);
}

export function applyFieldNpcNameToken(text: string, name: string): string {
  return text.replace(/\{name\}/g, name);
}

// ════════════════════════════════════════════════════════════════
// SYNC-103: zone 진입 narrative — 첫 방문 시 분위기 anchor + 추천 행동
// SCENARIO_ZONES 9개 한정. obsidianId 기준으로 1:1 매칭한다.
// ════════════════════════════════════════════════════════════════

export interface ZoneEntryNarrative {
  /** SCENARIO_ZONES.obsidianId 와 1:1 매칭 */
  zoneObsidianId: string;
  /** 진입 분위기 anchor (1~2 문장) */
  mood: string;
  /** 추천 행동 hint (퀘스트/탐사/전투 방향) */
  suggestion: string;
}

export const SCENARIO_ZONE_ENTRY_NARRATIVES: readonly ZoneEntryNarrative[] = [
  {
    zoneObsidianId: 'erebos',
    mood: '꺼진 가로등이 검은 운하 위로 흔들리고, 기억을 잃은 도시의 그림자가 발자국마다 따라붙습니다.',
    suggestion: '운하변 폐허에서 첫 신성 기억 파편의 단서를 찾아보세요. 야간 순찰조와의 충돌은 우회가 가능합니다.',
  },
  {
    zoneObsidianId: 'cantela_village',
    mood: '아침 안개 사이로 기억 소멸 폭풍의 잔열이 가시지 않은 광장이 보입니다. 비어 있는 집의 문들이 반쯤 열려 있습니다.',
    suggestion: '광장 중앙의 종탑부터 살펴 NPC 생존자와 대화하세요. 폭풍의 진원이 종탑 지하에 있을 가능성이 높습니다.',
  },
  {
    zoneObsidianId: 'silvanheim',
    mood: '말라투스 고목의 잎이 햇빛을 걸러 초록과 금빛이 교차합니다. 숲은 외부의 망각으로부터 안전한 마지막 피난처입니다.',
    suggestion: '엘파리스 외교 분기 NPC 를 먼저 만나 통과 허가를 얻으세요. 깊은 숲은 안내인 없이 진입하면 길을 잃습니다.',
  },
  {
    zoneObsidianId: 'malatus_grove',
    mood: '거대한 고목의 뿌리가 바닥을 가르고 흐릅니다. 기억의 진동이 잎새 끝마다 가벼운 빛으로 맺힙니다.',
    suggestion: '고목 둘레의 봉인 의식 흔적을 따라가면 실반헤임 파편 단서가 드러납니다. 보스전 전 회복 자원을 보충하세요.',
  },
  {
    zoneObsidianId: 'solaris',
    mood: '모래 폭풍이 지평선을 흐리고, 이프리타족의 불꽃 봉헌물이 길을 따라 줄지어 있습니다. 발걸음마다 마른 열기가 올라옵니다.',
    suggestion: '오아시스 마을에서 보급을 마치고 솔리안 유적 입구로 향하세요. 라와르 봉인 의식의 단서가 사막 깊은 곳에 있습니다.',
  },
  {
    zoneObsidianId: 'argentium',
    mood: '황궁의 첨탑이 잿빛 하늘을 가르고, 거리의 시민들은 표정 없이 같은 동선을 반복합니다. 도시 전체가 무거운 침묵에 잠겨 있습니다.',
    suggestion: '하수도 입구를 통한 잠입 동선이 안전합니다. 정문 경비대는 통행증 없이는 통과할 수 없습니다.',
  },
  {
    zoneObsidianId: 'palatino_lab',
    mood: '지하 연구소의 에테르 결정이 청록빛으로 명멸합니다. 실험대 위의 자료들은 황급히 떠난 흔적만 남기고 있습니다.',
    suggestion: '연구 일지를 회수해 케인의 동선을 추적하세요. 통제실의 봉인 장치를 해제하지 않으면 깊은 구역은 진입 불가입니다.',
  },
  {
    zoneObsidianId: 'oblivion_plateau',
    mood: '고원의 바람이 기억의 잔재를 흩날립니다. 발 아래 땅은 한때 봉인 의식이 행해졌던 흔적이 또렷합니다.',
    suggestion: '4 파편을 모두 모은 뒤 진입하세요. 황금 에테르 탑으로 향하는 길은 파편 공명이 있어야 열립니다.',
  },
  {
    zoneObsidianId: 'golden_ether_tower',
    mood: '탑 내부의 황금빛 에테르 흐름이 모든 층을 관통합니다. 위로 올라갈수록 시간의 흐름이 느리고 무거워집니다.',
    suggestion: '레테 최종 5페이즈 전 모든 동료의 생존을 확인하세요. 엔딩 A 조건은 4 파편 + 전원 생존입니다.',
  },
];

export function getZoneEntryNarrative(
  zoneObsidianId: string,
): ZoneEntryNarrative | undefined {
  return SCENARIO_ZONE_ENTRY_NARRATIVES.find(
    (n) => n.zoneObsidianId === zoneObsidianId,
  );
}

export function listZoneEntryNarrativesByChapter(chapter: number): readonly ZoneEntryNarrative[] {
  const zoneIdsInChapter = new Set(
    SCENARIO_ZONES.filter((z) => z.chapter === chapter).map((z) => z.obsidianId),
  );
  return SCENARIO_ZONE_ENTRY_NARRATIVES.filter((n) => zoneIdsInChapter.has(n.zoneObsidianId));
}

// ════════════════════════════════════════════════════════════════
// SYNC-104: BGM narrative — zoneSeeds bgm id 별 분위기 intent
// 42 unique bgm id 1:1 매핑. zoneSeeds.bgm 에서 참조하는 모든 id 커버.
// ════════════════════════════════════════════════════════════════

export type BgmIntensity = 'calm' | 'mystery' | 'tension' | 'combat' | 'climactic';

export interface BgmNarrative {
  /** zoneSeeds.bgm 와 1:1 매칭 */
  bgmId: string;
  /** 곡 분위기 한글 명 */
  mood: string;
  /** 곡이 의도하는 narrative 효과 */
  intent: string;
  /** 강도 분류 (UI/loadout 결정에 사용) */
  intensity: BgmIntensity;
}

export const SCENARIO_BGM_NARRATIVES: readonly BgmNarrative[] = [
  { bgmId: 'argentium_theme', mood: '제국의 그림자', intent: '잿빛 황궁의 무거운 통제 — 시민의 침묵을 음으로 압축.', intensity: 'tension' },
  { bgmId: 'dungeon_sewer', mood: '하수도 잠입', intent: '물방울과 저음 드론으로 잠입 긴장도 유지.', intensity: 'mystery' },
  { bgmId: 'golden_tower', mood: '황금 탑', intent: '시간이 느려지는 탑 내부 — 신성과 위협을 동시에 환기.', intensity: 'climactic' },
  { bgmId: 'silvanhome_theme', mood: '엘파리스의 숲', intent: '말라투스 잎새 사이 빛의 떨림 — 안전과 신비의 균형.', intensity: 'calm' },
  { bgmId: 'ancient_tree', mood: '고목의 호흡', intent: '말라투스 고목 둘레의 봉인 공명 — 저음 합창 중심.', intensity: 'mystery' },
  { bgmId: 'mist_swamp', mood: '안개 늪지', intent: '낮은 현 + 휘파람 모티프로 길 잃은 감각 유도.', intensity: 'mystery' },
  { bgmId: 'elf_sanctum', mood: '엘프 성소', intent: '하프와 합창 — 위계와 외교의 무게.', intensity: 'calm' },
  { bgmId: 'crystal_cave', mood: '결정 동굴', intent: '에테르 결정 공명 — 글래스 hits 중심의 청량한 미스터리.', intensity: 'mystery' },
  { bgmId: 'erebos_theme', mood: '에레보스 폐허', intent: '꺼진 도시의 잔향 — 운하 위 검은 물결을 첼로로 묘사.', intensity: 'mystery' },
  { bgmId: 'ruins_center', mood: '폐허 중심부', intent: '에레보스 깊은 곳 — 신성 기억 파편의 진동을 저음으로 암시.', intensity: 'tension' },
  { bgmId: 'forgotten_cathedral', mood: '잊혀진 대성당', intent: '오르간 + 합창 — 망각의 신앙이 가시화되는 순간.', intensity: 'tension' },
  { bgmId: 'catacomb_dark', mood: '카타콤의 정적', intent: '거의 무음에 가까운 저음 드론 — 발자국의 무게.', intensity: 'mystery' },
  { bgmId: 'solaris_theme', mood: '솔라리스 사막', intent: '이프리타족 타악기 + 두둠 — 모래의 열기와 부족의 자부심.', intensity: 'calm' },
  { bgmId: 'storm_desert', mood: '모래 폭풍', intent: '강한 타악 + 휘몰아치는 현 — 시야 차단 위기감.', intensity: 'tension' },
  { bgmId: 'aether_mine', mood: '에테르 채광 기지', intent: '기계음 + 인부의 노동가 — 자원 통제의 긴장.', intensity: 'tension' },
  { bgmId: 'ancient_temple', mood: '고대 신전', intent: '솔리안 황금기 잔향 — 라와르 봉인의 신성한 호흡.', intensity: 'mystery' },
  { bgmId: 'northland_theme', mood: '북방 설원', intent: '얼음 바람 + 합창 — 프레야 부족의 고독한 위엄.', intensity: 'calm' },
  { bgmId: 'ice_cave', mood: '얼음 동굴', intent: '글래스 + 크리스털 hits — 미끄러지는 정적.', intensity: 'mystery' },
  { bgmId: 'crystal_peak', mood: '결정 봉우리', intent: '높은 음역대 합창 + 종소리 — 고지의 청정.', intensity: 'mystery' },
  { bgmId: 'aether_lake', mood: '에테르 호수', intent: '느린 신스 패드 + 물의 반향 — 시간 정지 환영.', intensity: 'calm' },
  { bgmId: 'britallia_theme', mood: '브리탈리아 항구', intent: '아코디언 + 갈매기 — 항해와 거래의 활기.', intensity: 'calm' },
  { bgmId: 'black_market', mood: '암시장', intent: '낮은 현 + 빠른 베이스라인 — 은밀한 거래의 긴장.', intensity: 'tension' },
  { bgmId: 'pirate_lair', mood: '해적 은신처', intent: '거친 드럼 + 어쿠스틱 — 자유와 위험의 공존.', intensity: 'tension' },
  { bgmId: 'arena_battle', mood: '투기장', intent: '강한 호른 + 군중 함성 샘플 — 결투 직전의 흥분.', intensity: 'combat' },
  { bgmId: 'oblivion_theme', mood: '망각의 고원', intent: '거대한 합창 + 저음 종 — 4 파편 통합 직전의 무게.', intensity: 'climactic' },
  { bgmId: 'time_rift', mood: '시간 균열', intent: '리버스 효과 + 신스 — 과거/현재 중첩 감각.', intensity: 'mystery' },
  { bgmId: 'final_sanctum', mood: '최종 성역', intent: '레테 강림 직전 — 모든 모티프 회상.', intensity: 'climactic' },
  { bgmId: 'mist_sea_calm', mood: '안개 바다 잔잔', intent: '낮은 현 + 파도 — 항해 휴식 구간.', intensity: 'calm' },
  { bgmId: 'mist_sea_mystery', mood: '안개 바다 신비', intent: '하프 + 잔향 — 등대지기 회상 톤.', intensity: 'mystery' },
  { bgmId: 'mist_sea_eerie', mood: '안개 바다 음산', intent: '불협 + 휘파람 — 유령선 접근 경고.', intensity: 'tension' },
  { bgmId: 'mist_sea_spire_theme', mood: '안개 바다 첨탑', intent: '느린 호른 + 합창 — 봉인 첨탑의 신성.', intensity: 'mystery' },
  { bgmId: 'mist_sea_abyss_theme', mood: '안개 바다 심연', intent: '강한 저음 + 리버스 — 심해 접근 위기.', intensity: 'tension' },
  { bgmId: 'abyss_gate_theme', mood: '심연의 문', intent: '거대한 저음 종 + 합창 — 심해 진입 의식.', intensity: 'climactic' },
  { bgmId: 'sunken_city_theme', mood: '침몰 도시', intent: '리버스 물소리 + 합창 — 망각된 문명의 잔향.', intensity: 'mystery' },
  { bgmId: 'library_theme', mood: '심해 도서관', intent: '하프 + 페이지 넘기는 효과 — 학자의 정적.', intensity: 'calm' },
  { bgmId: 'trial_hall_theme', mood: '시험의 전당', intent: '점진적 빌드업 + 합창 — 봉인 시험 진행.', intensity: 'tension' },
  { bgmId: 'abyss_core_theme', mood: '심연의 핵', intent: '모든 저음 통합 + 종 + 합창 — 최종 봉인 대전.', intensity: 'combat' },
  { bgmId: 'bgm_temporal_rift_threshold', mood: '시간 균열 입구', intent: '느린 리버스 + 글래스 — 시공 경계.', intensity: 'mystery' },
  { bgmId: 'bgm_mirror_city', mood: '거울 도시', intent: '에코 + 더블링 신스 — 자기 잔상과 마주.', intensity: 'mystery' },
  { bgmId: 'bgm_frozen_battlefield', mood: '얼어붙은 전장', intent: '얼음 hits + 군중 함성 잔향 — 과거 전투 재현.', intensity: 'combat' },
  { bgmId: 'bgm_reverse_forest', mood: '역행의 숲', intent: '리버스 새소리 + 거꾸로 흐르는 현 — 시간 역행 감각.', intensity: 'mystery' },
  { bgmId: 'bgm_rift_core', mood: '균열의 핵', intent: '모든 시간 모티프 통합 + 거대한 저음 — 시간 보스전.', intensity: 'combat' },
];

export function getBgmNarrative(bgmId: string): BgmNarrative | undefined {
  return SCENARIO_BGM_NARRATIVES.find((b) => b.bgmId === bgmId);
}

export function listBgmNarrativesByIntensity(intensity: BgmIntensity): readonly BgmNarrative[] {
  return SCENARIO_BGM_NARRATIVES.filter((b) => b.intensity === intensity);
}

// ════════════════════════════════════════════════════════════════
// SYNC-105: ambient sound narrative — zoneSeeds ambientSound id 별 의도
// 43 unique ambient id 1:1 매핑. zoneSeeds.ambientSound 전수 커버.
// ════════════════════════════════════════════════════════════════

export type AmbientCategory = 'urban' | 'wild' | 'water' | 'machine' | 'sacred' | 'occult';

export interface AmbientNarrative {
  /** zoneSeeds.ambientSound 와 1:1 매칭 */
  ambientId: string;
  /** 짧은 한글 설명 */
  description: string;
  /** 분류 */
  category: AmbientCategory;
}

export const SCENARIO_AMBIENT_NARRATIVES: readonly AmbientNarrative[] = [
  { ambientId: 'city_crowd', description: '제국 도시의 발자국과 낮은 대화', category: 'urban' },
  { ambientId: 'market_bustle', description: '시장 외침과 동전 부딪는 소리', category: 'urban' },
  { ambientId: 'dripping_water', description: '하수도 천장의 일정한 물방울', category: 'water' },
  { ambientId: 'wind_tower', description: '첨탑 꼭대기를 휘감는 높은 바람', category: 'wild' },
  { ambientId: 'forest_birds', description: '말라투스 숲의 잔잔한 새소리', category: 'wild' },
  { ambientId: 'ancient_hum', description: '고목 봉인이 발산하는 저음 공명', category: 'sacred' },
  { ambientId: 'swamp_fog', description: '안개 늪의 축축한 발소리와 개구리', category: 'wild' },
  { ambientId: 'holy_chime', description: '엘프 성소의 청량한 풍경 소리', category: 'sacred' },
  { ambientId: 'crystal_resonance', description: '에테르 결정의 미세한 진동음', category: 'sacred' },
  { ambientId: 'ghost_wind', description: '에레보스 운하를 가로지르는 한기 어린 바람', category: 'occult' },
  { ambientId: 'ruins_echo', description: '폐허 회랑에서 반사되는 발소리', category: 'occult' },
  { ambientId: 'cathedral_organ', description: '잊혀진 대성당의 멀리서 울리는 오르간', category: 'sacred' },
  { ambientId: 'catacomb_drip', description: '카타콤 천장의 차가운 물방울', category: 'occult' },
  { ambientId: 'oasis_water', description: '오아시스 분수의 잔잔한 물결', category: 'water' },
  { ambientId: 'sandstorm', description: '시야를 가리는 모래 폭풍의 거센 바람', category: 'wild' },
  { ambientId: 'mine_drill', description: '에테르 채광기의 일정한 진동', category: 'machine' },
  { ambientId: 'temple_chant', description: '고대 신전의 멀리서 들리는 성가', category: 'sacred' },
  { ambientId: 'blizzard_soft', description: '북방 설원의 부드러운 눈보라', category: 'wild' },
  { ambientId: 'ice_crack', description: '얼음 동굴의 미세한 균열음', category: 'wild' },
  { ambientId: 'peak_wind', description: '결정 봉우리의 날카로운 고지대 바람', category: 'wild' },
  { ambientId: 'frozen_lake', description: '얼어붙은 호수면의 길게 끄는 진동', category: 'water' },
  { ambientId: 'harbor_seagull', description: '항구의 갈매기와 파도 부딪는 소리', category: 'water' },
  { ambientId: 'underground_whisper', description: '암시장 통로의 속삭임과 발소리', category: 'urban' },
  { ambientId: 'cave_waves', description: '해적 동굴 안쪽의 깊은 파도', category: 'water' },
  { ambientId: 'crowd_cheer', description: '투기장 관중의 함성', category: 'urban' },
  { ambientId: 'time_distortion', description: '시간이 일그러질 때의 미세한 리버스 음', category: 'occult' },
  { ambientId: 'rift_echo', description: '시간 균열에서 새어 나오는 다중 에코', category: 'occult' },
  { ambientId: 'aether_pulse', description: '에테르 결정 응집지의 일정한 박동', category: 'sacred' },
  { ambientId: 'ocean_mist', description: '안개 바다의 짠 공기와 잔물결', category: 'water' },
  { ambientId: 'lighthouse_wind', description: '등대 주변의 회전하는 바람', category: 'wild' },
  { ambientId: 'shipwreck_creak', description: '난파선의 삐걱이는 목재', category: 'occult' },
  { ambientId: 'seal_resonance', description: '봉인 첨탑이 발산하는 저음 공명', category: 'sacred' },
  { ambientId: 'abyss_rumble', description: '심해 접근 시 들려오는 깊은 진동', category: 'occult' },
  { ambientId: 'deep_sea_ambient', description: '심해의 압력감 있는 정적', category: 'water' },
  { ambientId: 'sunken_ruins', description: '침몰 도시 잔해의 물 흐름', category: 'water' },
  { ambientId: 'underwater_library', description: '심해 도서관의 부유 음향', category: 'sacred' },
  { ambientId: 'mystical_hall', description: '시험의 전당의 신비로운 공명', category: 'sacred' },
  { ambientId: 'void_pulse', description: '심연 핵의 거대한 저음 박동', category: 'occult' },
  { ambientId: 'rift_hum', description: '균열 입구의 일정한 저음 윙윙거림', category: 'occult' },
  { ambientId: 'echo_voices', description: '거울 도시의 자기 목소리 잔향', category: 'occult' },
  { ambientId: 'frozen_silence', description: '얼어붙은 전장의 완전한 정적', category: 'occult' },
  { ambientId: 'reverse_waterfall', description: '역행 숲의 거꾸로 흐르는 폭포', category: 'occult' },
  { ambientId: 'void_whisper', description: '균열의 핵에서 들려오는 단편적 속삭임', category: 'occult' },
];

export function getAmbientNarrative(ambientId: string): AmbientNarrative | undefined {
  return SCENARIO_AMBIENT_NARRATIVES.find((a) => a.ambientId === ambientId);
}

export function listAmbientNarrativesByCategory(category: AmbientCategory): readonly AmbientNarrative[] {
  return SCENARIO_AMBIENT_NARRATIVES.filter((a) => a.category === category);
}

// ════════════════════════════════════════════════════════════════
// SYNC-106: 로딩 화면 narrative 팁 — chapter 1~5 별 게임 mechanic + lore 결합
// 각 챕터 3개 = 15 tip. 로딩 사이 사이 player 가 현재 상황을 환기할 수 있도록.
// ════════════════════════════════════════════════════════════════

export type LoadScreenTipKind = 'mechanic' | 'lore' | 'tactical';

export interface LoadScreenTip {
  tipId: string;
  /** 등장 챕터 (1~5). 0 = 모든 챕터 공통 */
  chapter: number;
  /** 분류 */
  kind: LoadScreenTipKind;
  /** 짧은 본문 (1~2 문장) */
  body: string;
}

export const SCENARIO_LOAD_SCREEN_TIPS: readonly LoadScreenTip[] = [
  // Chapter 1 — 칸텔라/에레보스
  { tipId: 'ch1_mechanic_atb', chapter: 1, kind: 'mechanic', body: 'ATB 게이지가 가득 차면 행동을 선택할 수 있습니다. 대기열을 활용해 동료 행동 순서를 조율하세요.' },
  { tipId: 'ch1_lore_memory_resonance', chapter: 1, kind: 'lore', body: '에리언의 기억 공명 능력은 카일의 전생에서 비롯됩니다. 폐허의 잔향을 듣는 데 사용하세요.' },
  { tipId: 'ch1_tactical_seraphine', chapter: 1, kind: 'tactical', body: '세라핀의 안내가 있으면 에레보스 순찰조와의 직접 충돌을 우회할 수 있습니다.' },
  // Chapter 2 — 실반헤임
  { tipId: 'ch2_mechanic_skill_tree', chapter: 2, kind: 'mechanic', body: '스킬 포인트는 30개 한도 안에서 자유롭게 재분배할 수 있습니다. 보스전 전에 빌드를 조정하세요.' },
  { tipId: 'ch2_lore_malatus', chapter: 2, kind: 'lore', body: '말라투스 고목은 기억 소멸 폭풍으로부터 안전한 마지막 피난처입니다. 잎새의 빛이 약해지면 봉인이 흔들리고 있다는 신호입니다.' },
  { tipId: 'ch2_tactical_elf_diplomacy', chapter: 2, kind: 'tactical', body: '엘파리스 외교 분기에서 호의를 얻으면 깊은 숲 안내인이 동행해 길 잃음을 막아 줍니다.' },
  // Chapter 3 — 솔라리스
  { tipId: 'ch3_mechanic_combo', chapter: 3, kind: 'mechanic', body: '동료 2~3명이 같은 ATB 타이밍에 행동하면 콤보가 발동합니다. 30종의 콤보가 준비되어 있습니다.' },
  { tipId: 'ch3_lore_ifrita', chapter: 3, kind: 'lore', body: '이프리타족의 최초의 불꽃은 이그나루스 신이 시조 카를라에게 직접 수여한 신성한 유산입니다.' },
  { tipId: 'ch3_tactical_sandstorm', chapter: 3, kind: 'tactical', body: '모래 폭풍 구간에서는 시야가 줄어 적의 선제권이 올라갑니다. 폭풍이 잦아드는 야간에 이동하세요.' },
  // Chapter 4 — 아르겐티움
  { tipId: 'ch4_mechanic_branch', chapter: 4, kind: 'mechanic', body: '4 챕터부터 동료별 분기 신뢰도가 갈립니다. 베르나르도/레이나의 대화를 놓치지 마세요.' },
  { tipId: 'ch4_lore_lethe_cult', chapter: 4, kind: 'lore', body: '레테 교단의 진정한 목표는 구원이 아니라 망각의 신 강림입니다. 황궁의 침묵은 우연이 아닙니다.' },
  { tipId: 'ch4_tactical_sewer_route', chapter: 4, kind: 'tactical', body: '하수도 잠입 동선이 정문 돌파보다 자원 손실이 적습니다. 통행증이 없다면 정문은 통과할 수 없습니다.' },
  // Chapter 5 — 망각의 고원 + 황금 탑
  { tipId: 'ch5_mechanic_passive', chapter: 5, kind: 'mechanic', body: '14종 패시브 효과가 자동으로 발동합니다. SkillTreeUI 디테일 패널에서 발동 조건을 확인하세요.' },
  { tipId: 'ch5_lore_endings', chapter: 5, kind: 'lore', body: '엔딩 A 조건은 4 파편 회수 + 전원 동료 생존입니다. 한 명이라도 이탈하면 B 엔딩으로 분기됩니다.' },
  { tipId: 'ch5_tactical_lethe_phases', chapter: 5, kind: 'tactical', body: '레테 최종 5페이즈는 각각 다른 저항 패턴을 가집니다. 페이즈 시작 직후 BGM 변화를 신호로 빌드를 전환하세요.' },
];

export function getLoadScreenTipById(tipId: string): LoadScreenTip | undefined {
  return SCENARIO_LOAD_SCREEN_TIPS.find((t) => t.tipId === tipId);
}

export function listLoadScreenTipsByChapter(chapter: number): readonly LoadScreenTip[] {
  return SCENARIO_LOAD_SCREEN_TIPS.filter((t) => t.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-107: 챕터 오프닝 cinematic narrative — 챕터 시작 시 화면에 표시
// 5 챕터 × (title + subtitle + 3 narrative line) 구조.
// ════════════════════════════════════════════════════════════════

export interface ChapterOpeningNarrative {
  chapter: number;
  /** 화면 상단 제목 */
  title: string;
  /** 부제 (시대/위치 anchor) */
  subtitle: string;
  /** 3줄 cinematic 본문 (낭송 가능한 호흡 단위) */
  lines: readonly [string, string, string];
}

export const SCENARIO_CHAPTER_OPENING_NARRATIVES: readonly ChapterOpeningNarrative[] = [
  {
    chapter: 1,
    title: '첫 번째 장 — 꺼진 도시',
    subtitle: '세계력 3,412년, 칸텔라 마을 + 에레보스 폐허',
    lines: [
      '기억 소멸 폭풍이 칸텔라의 새벽을 휩쓸었습니다. 발자국이 지워진 거리에서 에리언은 처음으로 자기 자신의 호흡을 의심합니다.',
      '카일의 전생은 가까이 있고, 공명은 이미 손끝에서 흔들립니다.',
      '꺼진 운하 도시 에레보스로의 길이 열립니다 — 첫 번째 신성 기억 파편이 그 안에서 잠들어 있습니다.',
    ],
  },
  {
    chapter: 2,
    title: '두 번째 장 — 잎새 사이의 안전',
    subtitle: '실반헤임, 말라투스 고목의 영역',
    lines: [
      '망각이 닿지 않는 마지막 숲이 가까워집니다. 잎새 사이로 새어 드는 빛은 신중하고 무겁습니다.',
      '엘파리스의 외교가 길을 결정합니다 — 호의는 안내를, 무시는 미궁을 가져옵니다.',
      '말라투스 고목 아래에 두 번째 파편의 봉인이 흔들리고 있습니다.',
    ],
  },
  {
    chapter: 3,
    title: '세 번째 장 — 모래의 불꽃',
    subtitle: '솔라리스 사막, 솔리안 유적',
    lines: [
      '이프리타족의 최초의 불꽃이 길을 따라 줄지어 타오릅니다. 그 빛은 안내이자 시험입니다.',
      '이그나의 합류는 채광 기지의 통제선을 흔들고, 라와르의 봉인이 사막 아래에서 응답합니다.',
      '세 번째 파편이 솔리안 유적의 가장 깊은 방에서 기다리고 있습니다.',
    ],
  },
  {
    chapter: 4,
    title: '네 번째 장 — 잿빛 침묵',
    subtitle: '아르겐티움 제국, 팔라티노 지하 연구소',
    lines: [
      '제국의 첨탑이 잿빛 하늘을 가르고, 시민들은 같은 동선을 반복합니다. 침묵은 우연이 아닙니다.',
      '베르나르도의 정체와 레이나의 진실, 우르그롬의 약속 — 세 사람의 신뢰가 동시에 시험됩니다.',
      '네 번째 파편은 황궁 가장 깊은 곳에서 케인의 그림자 아래 봉인되어 있습니다.',
    ],
  },
  {
    chapter: 5,
    title: '다섯 번째 장 — 황금 탑의 정점',
    subtitle: '망각의 고원, 황금 에테르 탑',
    lines: [
      '네 파편이 응답하기 시작합니다. 고원의 바람은 봉인 의식의 잔재를 흩날립니다.',
      '황금 에테르 탑의 위층마다 시간이 더 느리게 흐릅니다. 모든 동료의 호흡을 확인하세요.',
      '레테가 다섯 페이즈에 걸쳐 강림합니다. 어떤 엔딩으로 마침표가 찍힐지는 — 이 자리의 선택에 달렸습니다.',
    ],
  },
];

export function getChapterOpeningNarrative(chapter: number): ChapterOpeningNarrative | undefined {
  return SCENARIO_CHAPTER_OPENING_NARRATIVES.find((c) => c.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-108: 🎯 보스 등장 narrative — SCENARIO_BOSSES 9 종 도입부
// 보스 등장 직전 화면 표시되는 위협 anchor + 핵심 약점 hint.
// ════════════════════════════════════════════════════════════════

export interface BossIntroNarrative {
  /** SCENARIO_BOSSES.obsidianId 와 1:1 매칭 */
  bossObsidianId: string;
  /** 등장 시 화면 상단 1줄 — 위협의 정체 */
  threatLine: string;
  /** 등장 직후 2줄 — 분위기 + 행동 hint */
  followLines: readonly [string, string];
}

export const SCENARIO_BOSS_INTRO_NARRATIVES: readonly BossIntroNarrative[] = [
  {
    bossObsidianId: 'memory_golem',
    threatLine: '— 기억의 골렘이 잔해 사이에서 일어섭니다.',
    followLines: [
      '꺼진 폐허의 잔향이 골렘의 핵 속에서 응결되어 굳어 갑니다.',
      '단단한 외피는 일관된 패턴을 따릅니다 — 타격 직후 잠깐의 틈이 열립니다.',
    ],
  },
  {
    bossObsidianId: 'malatus_ancient',
    threatLine: '— 말라투스 고목의 가지가 천천히 휘어 인격을 띱니다.',
    followLines: [
      '봉인이 흔들리며 잎새 하나하나에 기억의 빛이 응집됩니다.',
      '3 페이즈로 전이됩니다 — 잎새의 빛 색깔이 페이즈 신호입니다.',
    ],
  },
  {
    bossObsidianId: 'fallen_malatus',
    threatLine: '— 타락한 말라투스가 봉인을 비틀어 일어섭니다.',
    followLines: [
      '잎새의 빛이 검게 변하고, 뿌리가 지반을 가르며 솟구칩니다.',
      '봉인 해제 직후 첫 3턴은 광범위 공격에 대비하세요.',
    ],
  },
  {
    bossObsidianId: 'rawar',
    threatLine: '— 솔리안의 왕 라와르가 영원한 수면에서 깨어납니다.',
    followLines: [
      '봉인 의식의 잔재가 모래 폭풍처럼 그를 두릅니다.',
      '3 페이즈 — 왕의 자기희생 의식이 페이즈마다 형태를 바꿉니다.',
    ],
  },
  {
    bossObsidianId: 'kane',
    threatLine: '— 기억 사냥꾼 간부 케인이 그림자에서 걸어 나옵니다.',
    followLines: [
      '레테 교단의 의지를 손에 든 그의 칼날은 기억 자체를 베어냅니다.',
      '회피와 반격 패턴 — 회피 성공률을 사전에 끌어올리고 진입하세요.',
    ],
  },
  {
    bossObsidianId: 'corrupted_bernardo',
    threatLine: '— 타락한 베르나르도가 옛 동료의 얼굴을 들어 올립니다.',
    followLines: [
      '레테 교단의 의식이 그의 호흡 사이에 새겨져 있습니다.',
      '신뢰도가 충분히 쌓인 동료의 대사가 회복 효과를 발동시킵니다.',
    ],
  },
  {
    bossObsidianId: 'time_watcher',
    threatLine: '— 시간의 감시자가 균열 너머에서 시선을 던집니다.',
    followLines: [
      '주변의 시간 흐름이 일그러지고 ATB 게이지가 불안정해집니다.',
      '리버스 효과 발동 시 행동 선택을 1턴 미루는 편이 안전합니다.',
    ],
  },
  {
    bossObsidianId: 'gear_guardian',
    threatLine: '— 톱니 수호자의 거대한 기계 팔이 회전하며 멈춥니다.',
    followLines: [
      '각 톱니의 회전 방향이 다음 공격 패턴을 예고합니다.',
      '톱니가 정지하는 순간이 약점 노출 — 강타 스킬을 준비하세요.',
    ],
  },
  {
    bossObsidianId: 'lethe',
    threatLine: '— 망각의 신 레테가 거대한 눈들의 집합체로 강림합니다.',
    followLines: [
      '4 파편의 공명이 그의 시야를 잠시 가립니다 — 그 짧은 틈이 유일한 기회입니다.',
      '5 페이즈 전체 — 페이즈 시작 직후 BGM 모티프 변화에 따라 빌드를 전환하세요.',
    ],
  },
];

export function getBossIntroNarrative(bossObsidianId: string): BossIntroNarrative | undefined {
  return SCENARIO_BOSS_INTRO_NARRATIVES.find((b) => b.bossObsidianId === bossObsidianId);
}

export function listBossIntroNarrativesByChapter(chapter: number): readonly BossIntroNarrative[] {
  const bossIdsInChapter = new Set(
    SCENARIO_BOSSES.filter((b) => b.chapter === chapter).map((b) => b.obsidianId),
  );
  return SCENARIO_BOSS_INTRO_NARRATIVES.filter((n) => bossIdsInChapter.has(n.bossObsidianId));
}

// ════════════════════════════════════════════════════════════════
// SYNC-109: 신성 기억 파편 회수 narrative — 4 파편 도착/공명/해제 3단 흐름
// SCENARIO_FRAGMENTS 4종 1:1 매칭.
// ════════════════════════════════════════════════════════════════

export interface FragmentRecoveryNarrative {
  /** SCENARIO_FRAGMENTS.obsidianId 와 1:1 매칭 */
  fragmentObsidianId: string;
  /** 단계 1 — 봉인 장소 도착 시 */
  arrivalLine: string;
  /** 단계 2 — 에리언의 기억 공명이 응답할 때 */
  resonanceLine: string;
  /** 단계 3 — 파편이 해제되어 손에 들어올 때 */
  recoveryLine: string;
}

export const SCENARIO_FRAGMENT_RECOVERY_NARRATIVES: readonly FragmentRecoveryNarrative[] = [
  {
    fragmentObsidianId: 'fragment_erebos',
    arrivalLine: '꺼진 운하 도시 한복판, 무너진 종탑 아래에서 카일이 봉인한 첫 파편의 잔향이 흘러나옵니다.',
    resonanceLine: '에리언의 손끝이 떨립니다 — 전생의 호흡이 지금의 호흡과 겹쳐 두 박자가 하나로 맞춰집니다.',
    recoveryLine: '에레보스 파편이 손바닥 위에서 안정됩니다. 첫 번째 신성 기억의 그릇이 채워졌습니다.',
  },
  {
    fragmentObsidianId: 'fragment_silvanheim',
    arrivalLine: '말라투스 고목의 가장 깊은 뿌리실에 도착했습니다. 잎새 사이로 새어 드는 빛이 일제히 가라앉습니다.',
    resonanceLine: '엘파리스 기억 수호자의 봉인 의식이 천천히 풀리며 에리언의 공명에 응답합니다.',
    recoveryLine: '실반헤임 파편이 잎새의 빛을 흡수하며 손 안에 자리잡습니다. 두 번째 그릇이 채워졌습니다.',
  },
  {
    fragmentObsidianId: 'fragment_solaris',
    arrivalLine: '솔리안 유적의 가장 깊은 방, 라와르 왕이 영원한 수면에 든 봉인의 자리에 발이 닿습니다.',
    resonanceLine: '왕의 자기희생 의식이 모래 폭풍처럼 일어나며 에리언의 공명을 시험합니다.',
    recoveryLine: '솔라리스 파편이 라와르의 마지막 의지와 함께 풀려납니다. 세 번째 그릇이 채워졌습니다.',
  },
  {
    fragmentObsidianId: 'fragment_argentium',
    arrivalLine: '아르겐티움 황궁 가장 깊은 곳, 케인의 그림자가 걷힌 자리에 봉인된 파편이 놓여 있습니다.',
    resonanceLine: '12인 중 이름이 지워진 한 사람의 호흡이 잠시 에리언의 공명과 마주합니다.',
    recoveryLine: '아르겐티움 파편이 마지막 그릇을 채웁니다. 네 파편이 손 안에서 서로의 빛을 환기합니다.',
  },
];

export function getFragmentRecoveryNarrative(
  fragmentObsidianId: string,
): FragmentRecoveryNarrative | undefined {
  return SCENARIO_FRAGMENT_RECOVERY_NARRATIVES.find(
    (n) => n.fragmentObsidianId === fragmentObsidianId,
  );
}

export function listFragmentRecoveryNarrativesByChapter(
  chapter: number,
): readonly FragmentRecoveryNarrative[] {
  const fragmentIdsInChapter = new Set(
    SCENARIO_FRAGMENTS.filter((f) => f.chapter === chapter).map((f) => f.obsidianId),
  );
  return SCENARIO_FRAGMENT_RECOVERY_NARRATIVES.filter(
    (n) => fragmentIdsInChapter.has(n.fragmentObsidianId),
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-110: 🎯 게임오버 narrative — chapter 1~5 별 패배 시 화면 표시
// 5 챕터 + universal fallback 1종 = 6 entry.
// ════════════════════════════════════════════════════════════════

export type GameOverCause = 'party_wipe' | 'time_limit' | 'critical_failure' | 'universal';

export interface GameOverNarrative {
  gameOverId: string;
  /** chapter 0 = universal fallback */
  chapter: number;
  cause: GameOverCause;
  /** 짧은 헤드라인 */
  headline: string;
  /** 본문 — 분위기 + 재도전 hint */
  body: string;
}

export const SCENARIO_GAME_OVER_NARRATIVES: readonly GameOverNarrative[] = [
  {
    gameOverId: 'ch1_party_wipe',
    chapter: 1,
    cause: 'party_wipe',
    headline: '— 운하의 어둠이 발자국마저 지웠습니다.',
    body: '에레보스의 잔향이 에리언의 공명을 가두었습니다. 칸텔라로 돌아가 휴식 후 다시 도전하세요.',
  },
  {
    gameOverId: 'ch2_party_wipe',
    chapter: 2,
    cause: 'party_wipe',
    headline: '— 말라투스의 잎새가 마지막 빛까지 떨어졌습니다.',
    body: '봉인이 흔들리며 보스의 페이즈 전이를 놓쳤습니다. 잎새 빛 색깔 변화 직전에 빌드를 전환해 보세요.',
  },
  {
    gameOverId: 'ch3_party_wipe',
    chapter: 3,
    cause: 'party_wipe',
    headline: '— 솔리안의 모래가 발걸음을 묻었습니다.',
    body: '왕의 자기희생 의식이 광범위 공격으로 응답했습니다. 회피와 광역 회복을 미리 준비하세요.',
  },
  {
    gameOverId: 'ch4_party_wipe',
    chapter: 4,
    cause: 'party_wipe',
    headline: '— 잿빛 침묵이 모든 호흡을 가져갔습니다.',
    body: '레테 교단의 의식이 동료의 신뢰도를 흔들었습니다. 베르나르도/레이나의 대화를 놓치지 마세요.',
  },
  {
    gameOverId: 'ch5_party_wipe',
    chapter: 5,
    cause: 'party_wipe',
    headline: '— 황금 탑의 시간이 마지막까지 흘렀습니다.',
    body: '레테의 5 페이즈는 모티프 전환을 신호로 빌드를 바꿔야 합니다. BGM 변화에 귀를 기울이세요.',
  },
  {
    gameOverId: 'universal_critical_failure',
    chapter: 0,
    cause: 'universal',
    headline: '— 기억의 끈이 끊어졌습니다.',
    body: '저장된 자리로 돌아갑니다. 빌드를 재구성하고 차분히 다시 시작하세요.',
  },
];

export function getGameOverNarrative(gameOverId: string): GameOverNarrative | undefined {
  return SCENARIO_GAME_OVER_NARRATIVES.find((g) => g.gameOverId === gameOverId);
}

export function listGameOverNarrativesByChapter(chapter: number): readonly GameOverNarrative[] {
  return SCENARIO_GAME_OVER_NARRATIVES.filter((g) => g.chapter === chapter);
}

export function getUniversalGameOver(): GameOverNarrative {
  const universal = SCENARIO_GAME_OVER_NARRATIVES.find((g) => g.chapter === 0);
  if (!universal) {
    throw new Error('SCENARIO_GAME_OVER_NARRATIVES 에 chapter 0 universal fallback 누락');
  }
  return universal;
}

// ════════════════════════════════════════════════════════════════
// SYNC-111: 보스 승리 narrative — SCENARIO_BOSSES 9 종 종결부
// boss intro 의 대조. 승리 직후 화면 표시되는 종결 anchor + reward hint.
// ════════════════════════════════════════════════════════════════

export interface BossVictoryNarrative {
  /** SCENARIO_BOSSES.obsidianId 와 1:1 매칭 */
  bossObsidianId: string;
  /** 종결 anchor — 보스 쓰러진 직후 1줄 */
  closingLine: string;
  /** 보상 hint — 획득 자원/단서 1줄 */
  rewardLine: string;
}

export const SCENARIO_BOSS_VICTORY_NARRATIVES: readonly BossVictoryNarrative[] = [
  {
    bossObsidianId: 'memory_golem',
    closingLine: '— 기억의 골렘이 잔해 위로 무너지며 빛을 내려놓습니다.',
    rewardLine: '핵 결정 하나가 손 위에 떨어집니다. 에레보스 파편의 단서가 가까워졌습니다.',
  },
  {
    bossObsidianId: 'malatus_ancient',
    closingLine: '— 말라투스 고목의 가지가 천천히 본래의 형태로 가라앉습니다.',
    rewardLine: '잎새의 빛 하나가 에리언의 손에 머뭅니다. 실반헤임 파편의 잠금이 풀렸습니다.',
  },
  {
    bossObsidianId: 'fallen_malatus',
    closingLine: '— 타락의 검은 결이 잎새에서 빠져나가며 흩어집니다.',
    rewardLine: '봉인이 안정됩니다. 숲의 깊은 곳으로 향하는 길이 열렸습니다.',
  },
  {
    bossObsidianId: 'rawar',
    closingLine: '— 라와르 왕이 다시 영원한 수면에 듭니다. 모래가 그의 자리를 조용히 덮습니다.',
    rewardLine: '왕의 마지막 의지가 한 자루의 의식 단검으로 응결됩니다. 솔라리스 파편의 봉인이 해제됩니다.',
  },
  {
    bossObsidianId: 'kane',
    closingLine: '— 케인의 칼날이 꺾이고, 그의 호흡이 그림자 속으로 흩어집니다.',
    rewardLine: '레테 교단의 표식이 그의 손에서 떨어집니다. 황궁 깊은 곳으로 향하는 통행이 풀렸습니다.',
  },
  {
    bossObsidianId: 'corrupted_bernardo',
    closingLine: '— 타락한 베르나르도가 무릎을 꿇으며 옛 눈빛으로 돌아옵니다.',
    rewardLine: '동료의 신뢰도가 분기 선택에 따라 결말을 가릅니다 — 결정은 여기서 멈추지 않습니다.',
  },
  {
    bossObsidianId: 'time_watcher',
    closingLine: '— 시간의 감시자의 시선이 균열 너머로 거두어집니다.',
    rewardLine: '주변 시간 흐름이 안정됩니다. 균열의 깊은 곳으로 향하는 통로가 잠시 열렸습니다.',
  },
  {
    bossObsidianId: 'gear_guardian',
    closingLine: '— 톱니 수호자의 기계 팔이 마지막 회전을 마치고 정지합니다.',
    rewardLine: '톱니 한 조각이 분리됩니다. 황금 탑 상층으로 향하는 잠금장치가 풀렸습니다.',
  },
  {
    bossObsidianId: 'lethe',
    closingLine: '— 망각의 신 레테가 거대한 눈들의 집합체에서 흩어지며 사라집니다.',
    rewardLine: '4 파편이 손바닥 위에서 마지막 빛으로 응결됩니다 — 엔딩 분기가 결정되는 순간입니다.',
  },
];

export function getBossVictoryNarrative(bossObsidianId: string): BossVictoryNarrative | undefined {
  return SCENARIO_BOSS_VICTORY_NARRATIVES.find((b) => b.bossObsidianId === bossObsidianId);
}

export function listBossVictoryNarrativesByChapter(chapter: number): readonly BossVictoryNarrative[] {
  const bossIdsInChapter = new Set(
    SCENARIO_BOSSES.filter((b) => b.chapter === chapter).map((b) => b.obsidianId),
  );
  return SCENARIO_BOSS_VICTORY_NARRATIVES.filter((n) => bossIdsInChapter.has(n.bossObsidianId));
}

// ════════════════════════════════════════════════════════════════
// SYNC-112: 챕터 전환 narrative — Ch1→2, 2→3, 3→4, 4→5 4종
// 챕터 종결 ~ 다음 챕터 시작 사이의 epilogue 흐름.
// ════════════════════════════════════════════════════════════════

export interface ChapterTransitionNarrative {
  /** 종료된 챕터 (1~4) */
  fromChapter: number;
  /** 시작되는 챕터 (2~5) — fromChapter + 1 */
  toChapter: number;
  /** epilogue 헤드라인 — 종료 챕터의 결과 */
  epilogue: string;
  /** prologue 헤드라인 — 다음 챕터로의 동기 */
  prologue: string;
  /** 이동 묘사 — 어떻게 다음 zone 으로 향했는지 */
  travelLine: string;
}

export const SCENARIO_CHAPTER_TRANSITIONS: readonly ChapterTransitionNarrative[] = [
  {
    fromChapter: 1,
    toChapter: 2,
    epilogue: '에레보스의 첫 파편이 손에 들어왔습니다. 도시의 잔향은 잠시 잠잠해졌습니다.',
    prologue: '두 번째 파편의 호흡이 실반헤임 숲에서 응답해 옵니다. 말라투스 고목이 흔들리고 있습니다.',
    travelLine: '세라핀의 안내로 칸텔라를 떠나 잎새 사이의 길을 따라 실반헤임으로 향합니다.',
  },
  {
    fromChapter: 2,
    toChapter: 3,
    epilogue: '실반헤임 파편이 두 번째 그릇을 채웠습니다. 엘파리스의 외교 분기가 다음 길의 안전을 가릅니다.',
    prologue: '솔라리스 사막의 라와르 봉인이 흔들리기 시작했습니다. 이그나의 합류가 가까워졌습니다.',
    travelLine: '실반헤임의 마지막 잎새 길을 떠나 모래 폭풍의 가장자리를 따라 솔라리스로 진입합니다.',
  },
  {
    fromChapter: 3,
    toChapter: 4,
    epilogue: '라와르 왕의 마지막 의지가 세 번째 그릇을 채웁니다. 사막의 열기가 조용히 가라앉습니다.',
    prologue: '아르겐티움 제국의 잿빛 침묵 아래 네 번째 파편이 봉인되어 있습니다. 케인의 그림자가 다가옵니다.',
    travelLine: '솔라리스를 떠나 제국 국경을 우회 — 하수도 입구를 통한 잠입 경로로 황궁에 진입합니다.',
  },
  {
    fromChapter: 4,
    toChapter: 5,
    epilogue: '네 번째 파편이 마지막 그릇을 채웠습니다. 동료들의 신뢰도가 다음 결말의 분기점을 결정합니다.',
    prologue: '망각의 고원에서 4 파편의 공명이 시작됩니다. 황금 에테르 탑이 최종 무대로 떠오릅니다.',
    travelLine: '잿빛 황궁을 떠나 고원의 바람을 가르며 황금 탑의 정점을 향해 오릅니다.',
  },
];

export function getChapterTransition(fromChapter: number): ChapterTransitionNarrative | undefined {
  return SCENARIO_CHAPTER_TRANSITIONS.find((t) => t.fromChapter === fromChapter);
}

export function getChapterTransitionTo(toChapter: number): ChapterTransitionNarrative | undefined {
  return SCENARIO_CHAPTER_TRANSITIONS.find((t) => t.toChapter === toChapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-113: 12 신 narrative — SCENARIO_DEITIES 12종 (창세 11 + 레테 배제)
// 각 신의 성격/관장/믿음의 안내 narrative.
// ════════════════════════════════════════════════════════════════

export interface DeityNarrative {
  /** SCENARIO_DEITIES.obsidianId 와 1:1 매칭 */
  deityObsidianId: string;
  /** 신성 표상 — 한 줄 anchor */
  signature: string;
  /** 신앙 narrative — 신자/추종자에게 전해지는 핵심 호흡 */
  doctrine: string;
}

export const SCENARIO_DEITY_NARRATIVES: readonly DeityNarrative[] = [
  {
    deityObsidianId: 'fabius',
    signature: '— 모든 실타래의 끝을 보는 운명의 시선.',
    doctrine: '운명은 선택의 부재가 아니라 선택의 무게다. 파비우스는 그 무게를 기록한다.',
  },
  {
    deityObsidianId: 'chronai',
    signature: '— 모래시계의 첫 알갱이를 떨어뜨리는 손.',
    doctrine: '시간은 흐르지 않고 쌓인다. 크로나이는 쌓인 순간들이 무너지지 않도록 지킨다.',
  },
  {
    deityObsidianId: 'verda',
    signature: '— 첫 잎새가 돋는 호흡.',
    doctrine: '생명은 빛이나 어둠이 아니라 호흡이다. 베르다는 모든 호흡의 균형을 본다.',
  },
  {
    deityObsidianId: 'ignarus',
    signature: '— 꺼지지 않는 최초의 불꽃을 든 신.',
    doctrine: '불꽃은 파괴가 아니라 의지다. 이그나루스는 시조의 손에 의지의 첫 빛을 건넸다.',
  },
  {
    deityObsidianId: 'akius',
    signature: '— 그림자에게도 길을 내어 주는 빛.',
    doctrine: '빛은 어둠을 부정하지 않는다. 아키우스는 모든 그림자가 자기 자리를 찾도록 한다.',
  },
  {
    deityObsidianId: 'salome',
    signature: '— 끝의 자락을 단정히 접는 손.',
    doctrine: '죽음은 단절이 아니라 매듭이다. 살로메는 매듭이 풀리지 않도록 마지막 호흡을 받친다.',
  },
  {
    deityObsidianId: 'martius',
    signature: '— 검을 거두는 순간의 균형.',
    doctrine: '전쟁은 폭력이 아니라 결단이다. 마르티우스는 결단이 무모해지지 않도록 칼끝을 누른다.',
  },
  {
    deityObsidianId: 'neptilus',
    signature: '— 가장 깊은 곳에서 일어나는 첫 파도.',
    doctrine: '바다는 길을 막는 것이 아니라 길을 잇는다. 넵틸루스는 그 길의 안전을 관장한다.',
  },
  {
    deityObsidianId: 'terus',
    signature: '— 발 아래의 단단한 침묵.',
    doctrine: '대지는 약속이다. 테루스는 그 약속이 어떤 폭풍에도 부서지지 않도록 한다.',
  },
  {
    deityObsidianId: 'aerus',
    signature: '— 닿지 않으나 모든 것을 옮기는 호흡.',
    doctrine: '바람은 형태가 없지만 방향을 가진다. 아에루스는 방향을 잃지 않도록 한다.',
  },
  {
    deityObsidianId: 'oneiros',
    signature: '— 잠든 자의 눈꺼풀 안쪽에 흐르는 빛.',
    doctrine: '꿈은 도피가 아니라 다른 길이다. 오네이로스는 잠 속에서도 답을 찾을 수 있도록 안내한다.',
  },
  {
    deityObsidianId: 'lethe',
    signature: '— 창세에서 배제된, 거대한 눈들의 집합체.',
    doctrine: '망각은 구원이 아니다. 레테의 안내는 모든 호흡을 단절시키는 단 하나의 길로 귀결된다.',
  },
];

export function getDeityNarrative(deityObsidianId: string): DeityNarrative | undefined {
  return SCENARIO_DEITY_NARRATIVES.find((d) => d.deityObsidianId === deityObsidianId);
}

export function listDeityNarrativesByCreation(inCreation: boolean): readonly DeityNarrative[] {
  const ids = new Set(
    SCENARIO_DEITIES.filter((d) => d.inCreation === inCreation).map((d) => d.obsidianId),
  );
  return SCENARIO_DEITY_NARRATIVES.filter((n) => ids.has(n.deityObsidianId));
}

// ════════════════════════════════════════════════════════════════
// SYNC-114: 메인 퀘스트 수락 narrative — chapter milestone requiredQuests 핵심
// MQ_CH01/03/04/13/15 — 각 챕터 메인 quest 진입 시 의뢰자/동기/첫 목표 3단.
// ════════════════════════════════════════════════════════════════

export interface MainQuestAcceptNarrative {
  questCode: string;
  chapter: number;
  giverContext: string;
  motivationLine: string;
  firstObjective: string;
}

export const SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES: readonly MainQuestAcceptNarrative[] = [
  {
    questCode: 'MQ_CH01',
    chapter: 1,
    giverContext: '칸텔라 광장의 종탑 아래 — 폭풍 잔해를 정리하는 마을 장로',
    motivationLine: '발자국이 지워진 거리에서 처음으로 자기 호흡을 의심한 에리언은, 잃어버린 것을 되찾을 첫 단서를 따라가기로 합니다.',
    firstObjective: '꺼진 운하 도시 에레보스 폐허로 진입해 첫 신성 기억 파편의 위치를 확인하세요.',
  },
  {
    questCode: 'MQ_CH03',
    chapter: 2,
    giverContext: '실반헤임 외곽의 엘파리스 안내인 — 잎새의 빛 색깔이 옅어진 상태',
    motivationLine: '말라투스 고목의 흔들림을 느낀 에리언은 외교 분기를 통과해 숲의 가장 깊은 곳으로 들어가기로 합니다.',
    firstObjective: '엘파리스 외교 NPC 와의 대화를 통해 깊은 숲 진입 허가를 얻고 말라투스 봉인을 조사하세요.',
  },
  {
    questCode: 'MQ_CH04',
    chapter: 4,
    giverContext: '아르겐티움 외곽의 잠입 안내인 — 잿빛 침묵을 두려워하는 잠행 거리의 인물',
    motivationLine: '제국 시민들의 표정 없는 동선을 본 에리언은, 침묵의 진원을 파헤치는 것이 곧 네 번째 파편으로 가는 길임을 깨닫습니다.',
    firstObjective: '하수도 입구를 통해 황궁 잠입 — 케인의 동선을 추적해 황궁 가장 깊은 곳으로 진입하세요.',
  },
  {
    questCode: 'MQ_CH13',
    chapter: 5,
    giverContext: '망각의 고원 입구 — 4 파편의 공명이 처음으로 동시에 응답하는 자리',
    motivationLine: '네 파편이 손바닥 위에서 서로의 빛을 환기하는 순간, 에리언은 마지막 무대가 황금 에테르 탑 정점임을 직감합니다.',
    firstObjective: '황금 에테르 탑 1층 진입 — 시간 흐름이 느려지는 첫 층의 봉인 메커니즘을 해제하세요.',
  },
  {
    questCode: 'MQ_CH15',
    chapter: 5,
    giverContext: '황금 에테르 탑 최상층 — 레테 강림 직전 모든 모티프가 회상되는 자리',
    motivationLine: '동료 전원의 호흡을 마지막으로 확인한 에리언은, 5 페이즈에 걸친 레테와의 대결을 받아들입니다.',
    firstObjective: '레테 1 페이즈 — 거대한 눈들의 집합체가 시야를 가두기 전 4 파편의 첫 공명을 발동하세요.',
  },
];

export function getMainQuestAcceptNarrative(questCode: string): MainQuestAcceptNarrative | undefined {
  return SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.find((n) => n.questCode === questCode);
}

export function listMainQuestAcceptNarrativesByChapter(chapter: number): readonly MainQuestAcceptNarrative[] {
  return SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.filter((n) => n.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-115: 동료 이탈 narrative — loyaltyThreshold 미달 시 표시
// SCENARIO_COMPANIONS 6명 1:1 매칭. 신뢰도 하락 사유 + 이탈 직후 anchor.
// ════════════════════════════════════════════════════════════════

export interface CompanionFarewellNarrative {
  /** SCENARIO_COMPANIONS.obsidianId 와 1:1 매칭 */
  companionObsidianId: string;
  /** 이탈 직전 사유 — 한 줄 anchor */
  reasonLine: string;
  /** 이탈 직후 마지막 대사 — 동료의 마지막 말 */
  farewellLine: string;
  /** narrative epilogue — 파티 시점의 떠남 묘사 */
  partyEpilogue: string;
}

export const SCENARIO_COMPANION_FAREWELL_NARRATIVES: readonly CompanionFarewellNarrative[] = [
  {
    companionObsidianId: 'seraphine',
    reasonLine: '— 신뢰가 무너지자 세라핀의 눈빛이 한 걸음 물러섭니다.',
    farewellLine: '"내가 안내했던 길이 결국 너에게는 다른 의미였구나."',
    partyEpilogue: '세라핀은 잎새의 길 한 갈래로 발걸음을 옮깁니다. 다음 만남은 약속되지 않았습니다.',
  },
  {
    companionObsidianId: 'maestro_crio',
    reasonLine: '— 마에스트로 크리오가 정보의 무게를 다시 저울에 올립니다.',
    farewellLine: '"60년 동안 사고팔았지만, 이번 거래만은 잘못 계산했군."',
    partyEpilogue: '크리오는 운하변의 그림자 속으로 사라지며 마지막 정보 카드 한 장을 떨어뜨립니다.',
  },
  {
    companionObsidianId: 'ignara',
    reasonLine: '— 이그나의 불꽃이 잠시 호흡을 잃습니다.',
    farewellLine: '"아버지의 마지막 말이 떠올라. ‘이프리타의 불꽃은 멈추지 않는다’ — 멈춘 건 내 신뢰였어."',
    partyEpilogue: '이그나는 사막의 모래 폭풍 가장자리로 향합니다. 부족의 화로가 그녀를 기다립니다.',
  },
  {
    companionObsidianId: 'benjamin_cross',
    reasonLine: '— 벤자민 크로스가 옛 신분증을 손에서 놓아 버립니다.',
    farewellLine: '"미안해, 에리언. 나는 처음부터 두 자리를 가졌고, 결국 한쪽으로 흘렀어."',
    partyEpilogue: '벤자민은 잿빛 거리의 한쪽으로 모습을 감춥니다. 그의 다음 행보는 적인지 동행인지 가늠되지 않습니다.',
  },
  {
    companionObsidianId: 'reina',
    reasonLine: '— 레이나가 마지막 내부 정보를 봉투에 넣어 건넵니다.',
    farewellLine: '"내가 줄 수 있는 건 여기까지야. 나머지 길은 너희가 골라야 해."',
    partyEpilogue: '레이나는 교단의 뒷길로 다시 잠적합니다. 봉투 안에는 다음 잠입 경로가 그려져 있습니다.',
  },
  {
    companionObsidianId: 'urgrom',
    reasonLine: '— 우르그롬이 북방 기억석 사원의 망토를 다시 두릅니다.',
    farewellLine: '"200년 봉인의 마지막 보루는 내 자리야. 나는 거기로 돌아간다."',
    partyEpilogue: '우르그롬은 북방의 설원 길로 발걸음을 돌립니다. 사원의 불씨가 그를 안내합니다.',
  },
];

export function getCompanionFarewellNarrative(
  companionObsidianId: string,
): CompanionFarewellNarrative | undefined {
  return SCENARIO_COMPANION_FAREWELL_NARRATIVES.find(
    (n) => n.companionObsidianId === companionObsidianId,
  );
}

// ════════════════════════════════════════════════════════════════
// SYNC-116: 게임 진입 narrative — new_game / continue / new_game_plus 3종
// ════════════════════════════════════════════════════════════════

export type GameEntryMode = 'new_game' | 'continue' | 'new_game_plus';

export interface GameEntryNarrative {
  mode: GameEntryMode;
  modeLabel: string;
  primaryLine: string;
  secondaryLine: string;
}

export const SCENARIO_GAME_ENTRY_NARRATIVES: readonly GameEntryNarrative[] = [
  {
    mode: 'new_game',
    modeLabel: '새 게임',
    primaryLine: '— 세계력 3,412년. 칸텔라 마을의 새벽 — 첫 호흡이 시작됩니다.',
    secondaryLine: '에리언으로서 기억 공명의 첫 떨림을 마주합니다. 길은 폐허의 운하 도시 에레보스로 향합니다.',
  },
  {
    mode: 'continue',
    modeLabel: '이어하기',
    primaryLine: '— 잠시 놓아 두었던 자리로 다시 돌아옵니다.',
    secondaryLine: '저장된 자리의 호흡이 그대로 이어집니다. 동료들의 호흡과 빌드를 다시 확인하세요.',
  },
  {
    mode: 'new_game_plus',
    modeLabel: '새 게임+',
    primaryLine: '— 한 번의 끝을 본 뒤 다시 시작하는 길.',
    secondaryLine: '이전 회차의 동료 신뢰도 일부가 인계됩니다. 도전 모디파이어가 적용되어 난이도와 보상이 함께 올라갑니다.',
  },
];

export function getGameEntryNarrative(mode: GameEntryMode): GameEntryNarrative | undefined {
  return SCENARIO_GAME_ENTRY_NARRATIVES.find((n) => n.mode === mode);
}

// ════════════════════════════════════════════════════════════════
// SYNC-117: 클래스 레벨업 narrative — 6 클래스 × 3 milestone (lv 10/20/30) = 18
// 각 클래스 milestone 레벨 도달 시 화면 anchor + 빌드 hint.
// ════════════════════════════════════════════════════════════════

export type ClassKey =
  | 'ether_knight'      // 에테르 기사
  | 'memorist'          // 기억술사
  | 'shadow_weaver'     // 그림자 직조사
  | 'memory_destroyer'  // 기억 파괴자
  | 'time_guardian'     // 시간 수호자
  | 'void_wanderer';    // 허공의 방랑자

export interface ClassLevelUpNarrative {
  classKey: ClassKey;
  className: string;
  milestoneLevel: 10 | 20 | 30;
  /** 도달 anchor — 1줄 */
  anchorLine: string;
  /** 빌드 hint — 다음 어떤 스킬을 키울지 */
  buildHint: string;
}

const MILESTONES: readonly (10 | 20 | 30)[] = [10, 20, 30] as const;

function classMilestone(
  classKey: ClassKey,
  className: string,
  level: 10 | 20 | 30,
  anchor: string,
  hint: string,
): ClassLevelUpNarrative {
  return { classKey, className, milestoneLevel: level, anchorLine: anchor, buildHint: hint };
}

export const SCENARIO_CLASS_LEVEL_UP_NARRATIVES: readonly ClassLevelUpNarrative[] = [
  // 에테르 기사
  classMilestone('ether_knight', '에테르 기사', 10, '— 에테르 기사의 첫 번째 검결이 자리를 잡습니다.', 'Tier 1 광역 검 스킬 4종을 우선 배치하세요. 방어 패시브 1종 슬롯도 확보합니다.'),
  classMilestone('ether_knight', '에테르 기사', 20, '— 에테르 기사의 검결이 동료의 호흡에 맞춰 흐릅니다.', 'Tier 2 카운터 스킬 + crit_echo 패시브 조합으로 콤보 기여도를 끌어올리세요.'),
  classMilestone('ether_knight', '에테르 기사', 30, '— 에테르 기사의 결이 보스 페이즈 전환을 압축합니다.', 'Tier 3+4 광역 강타 + reflect 패시브 — 보스 페이즈 시작 직후 첫 3턴 폭딜 빌드.'),
  // 기억술사
  classMilestone('memorist', '기억술사', 10, '— 기억술사의 첫 공명이 호흡을 안정시킵니다.', 'Tier 1 회복 스킬 2종 + mp_regen 패시브 — 파티 지속력 확보가 첫 목표.'),
  classMilestone('memorist', '기억술사', 20, '— 기억술사의 공명이 동료 신뢰도와 함께 깊어집니다.', 'Tier 2 광역 회복 + 디버프 해제 — 보스전에 대비한 회복 로테이션 구축.'),
  classMilestone('memorist', '기억술사', 30, '— 기억술사의 공명이 파티 전체 ATB 흐름을 조율합니다.', 'Tier 3+4 ATB 가속 + battle_regen 패시브 — 장기전 최적화 빌드.'),
  // 그림자 직조사
  classMilestone('shadow_weaver', '그림자 직조사', 10, '— 그림자 직조사의 첫 회피 무빙이 자리를 잡습니다.', 'Tier 1 회피 스킬 + evasion_up 패시브 — 단일 타겟 위주의 안전 빌드 시작.'),
  classMilestone('shadow_weaver', '그림자 직조사', 20, '— 그림자 직조사의 직조가 다중 타격으로 펼쳐집니다.', 'Tier 2 다단 히트 + bonus_hit_chance 패시브 — 콤보 기여 빌드.'),
  classMilestone('shadow_weaver', '그림자 직조사', 30, '— 그림자 직조사의 직조가 보스 약점을 정확히 찌릅니다.', 'Tier 3+4 단일 폭딜 + crit_echo — 보스 약점 노출 타이밍 폭딜 빌드.'),
  // 기억 파괴자
  classMilestone('memory_destroyer', '기억 파괴자', 10, '— 기억 파괴자의 첫 일격이 봉인을 흔듭니다.', 'Tier 1 강타 스킬 + low_hp_atk_up 패시브 — 위험 감수 빌드 시작.'),
  classMilestone('memory_destroyer', '기억 파괴자', 20, '— 기억 파괴자의 일격이 페이즈 전이를 가속합니다.', 'Tier 2 광역 파괴 + projectile_reflect — 위협 흡수 + 반격 빌드.'),
  classMilestone('memory_destroyer', '기억 파괴자', 30, '— 기억 파괴자의 일격이 신성 봉인의 결을 쪼개기 시작합니다.', 'Tier 3+4 극단 폭딜 + cheat_death — 최후의 일격 빌드.'),
  // 시간 수호자
  classMilestone('time_guardian', '시간 수호자', 10, '— 시간 수호자의 첫 정지 결이 자리를 잡습니다.', 'Tier 1 ATB 조작 + defense_up_conditional 패시브 — 통제력 빌드 시작.'),
  classMilestone('time_guardian', '시간 수호자', 20, '— 시간 수호자의 결이 보스 행동 우선권을 빼앗습니다.', 'Tier 2 시간 정지 + reverse — 보스 행동 1턴 미루기 빌드.'),
  classMilestone('time_guardian', '시간 수호자', 30, '— 시간 수호자의 결이 페이즈 전체의 흐름을 통제합니다.', 'Tier 3+4 시간 가속 + battle_regen — 페이즈 전체 통제 + 회복 빌드.'),
  // 허공의 방랑자
  classMilestone('void_wanderer', '허공의 방랑자', 10, '— 허공의 방랑자의 첫 발걸음이 균열을 가볍게 짚습니다.', 'Tier 1 이동 + move_damage_aura 패시브 — 기동력 + 지속 피해 빌드.'),
  classMilestone('void_wanderer', '허공의 방랑자', 20, '— 허공의 방랑자의 발걸음이 보스 패턴을 우회합니다.', 'Tier 2 텔레포트 + poison_amplify — 회피 + DoT 증폭 빌드.'),
  classMilestone('void_wanderer', '허공의 방랑자', 30, '— 허공의 방랑자의 발걸음이 보스 위치를 분단합니다.', 'Tier 3+4 광역 이동 + auto_resurrect — 분단 + 부활 사이클 빌드.'),
];

export function getClassLevelUpNarrative(
  classKey: ClassKey,
  milestoneLevel: 10 | 20 | 30,
): ClassLevelUpNarrative | undefined {
  return SCENARIO_CLASS_LEVEL_UP_NARRATIVES.find(
    (n) => n.classKey === classKey && n.milestoneLevel === milestoneLevel,
  );
}

export function listClassLevelUpNarratives(classKey: ClassKey): readonly ClassLevelUpNarrative[] {
  return SCENARIO_CLASS_LEVEL_UP_NARRATIVES.filter((n) => n.classKey === classKey);
}

export function listClassMilestones(): readonly (10 | 20 | 30)[] {
  return MILESTONES;
}

// ════════════════════════════════════════════════════════════════
// SYNC-118: 아이템 등급 narrative — 5 등급 (common ~ legendary)
// 인벤토리/획득 화면에 표시되는 등급별 flavor + 색상.
// ════════════════════════════════════════════════════════════════

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemRarityDescription {
  rarity: ItemRarity;
  label: string;
  /** UI 표시 hex color (#rrggbb) */
  uiColor: string;
  flavor: string;
  pickupAnchor: string;
}

export const SCENARIO_ITEM_RARITY_DESCRIPTIONS: readonly ItemRarityDescription[] = [
  {
    rarity: 'common',
    label: '일반',
    uiColor: '#bfbfbf',
    flavor: '필드 어디서나 찾을 수 있는 자원. 양으로 승부하는 등급.',
    pickupAnchor: '— 일반 자원이 가방에 담깁니다.',
  },
  {
    rarity: 'uncommon',
    label: '고급',
    uiColor: '#5fbf5f',
    flavor: '유의미한 제작 재료. 보스 직전 보급 단계의 핵심.',
    pickupAnchor: '— 고급 자원의 무게가 가방에 더해집니다.',
  },
  {
    rarity: 'rare',
    label: '희귀',
    uiColor: '#5f9fff',
    flavor: '특정 zone 의 한정 자원. 동료 신뢰도 보상에 자주 사용.',
    pickupAnchor: '— 희귀 자원의 빛이 가방 안쪽에서 잠시 반짝입니다.',
  },
  {
    rarity: 'epic',
    label: '영웅',
    uiColor: '#bf5fff',
    flavor: '챕터 보스 보상 또는 메인 퀘스트 핵심 보상. 빌드의 분기점이 되는 등급.',
    pickupAnchor: '— 영웅 자원의 결이 가방 안에서 균일한 진동을 일으킵니다.',
  },
  {
    rarity: 'legendary',
    label: '전설',
    uiColor: '#ffb720',
    flavor: '신성 기억 파편급 신화 자원. 게임 전체에서 손에 꼽는 갯수의 등급.',
    pickupAnchor: '— 전설 자원의 빛이 화면 가장자리까지 잠시 번지며 가방에 자리잡습니다.',
  },
];

export function getItemRarityDescription(rarity: ItemRarity): ItemRarityDescription | undefined {
  return SCENARIO_ITEM_RARITY_DESCRIPTIONS.find((r) => r.rarity === rarity);
}

export function listItemRaritiesAscending(): readonly ItemRarity[] {
  return ['common', 'uncommon', 'rare', 'epic', 'legendary'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-119: 전투 시작 동료 외침 — 6 동료 1:1
// 첫 전투 진입 시 화면 상단에 짧게 표시되는 동료의 한 줄 외침.
// ════════════════════════════════════════════════════════════════

export interface BattleOpeningBark {
  companionObsidianId: string;
  barkLine: string;
}

export const SCENARIO_BATTLE_OPENING_BARKS: readonly BattleOpeningBark[] = [
  { companionObsidianId: 'seraphine',      barkLine: '"길은 내가 본다 — 너희는 신호만 따라!"' },
  { companionObsidianId: 'maestro_crio',   barkLine: '"60년 거래의 첫 규칙, 살아 남는 자가 정보를 가진다."' },
  { companionObsidianId: 'ignara',         barkLine: '"불꽃은 멈추지 않는다 — 시작하자!"' },
  { companionObsidianId: 'benjamin_cross', barkLine: '"증거는 시체가 말한다. 끝내자."' },
  { companionObsidianId: 'reina',          barkLine: '"교단의 약점을 알아 — 약점부터 친다."' },
  { companionObsidianId: 'urgrom',         barkLine: '"북방의 봉인은 흔들리지 않는다. 나도 그렇다."' },
];

export function getBattleOpeningBark(companionObsidianId: string): BattleOpeningBark | undefined {
  return SCENARIO_BATTLE_OPENING_BARKS.find((b) => b.companionObsidianId === companionObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-120: 🎯 전투 승리 동료 외침 — 6 동료 1:1 (opening 의 대조)
// ════════════════════════════════════════════════════════════════

export interface BattleVictoryBark {
  companionObsidianId: string;
  barkLine: string;
}

export const SCENARIO_BATTLE_VICTORY_BARKS: readonly BattleVictoryBark[] = [
  { companionObsidianId: 'seraphine',      barkLine: '"길을 잘 봤다 — 다음 신호도 놓치지 마."' },
  { companionObsidianId: 'maestro_crio',   barkLine: '"수지가 맞았어. 다음 거래도 이쯤이면 좋겠는데."' },
  { companionObsidianId: 'ignara',         barkLine: '"불꽃이 멈추지 않았다. 그게 답이다."' },
  { companionObsidianId: 'benjamin_cross', barkLine: '"증거 정리 완료. 다음 단서로 간다."' },
  { companionObsidianId: 'reina',          barkLine: '"약점은 예상대로였다. 다음도 같은 방식으로."' },
  { companionObsidianId: 'urgrom',         barkLine: '"북방의 봉인은 흔들리지 않았다. 우리도."' },
];

export function getBattleVictoryBark(companionObsidianId: string): BattleVictoryBark | undefined {
  return SCENARIO_BATTLE_VICTORY_BARKS.find((b) => b.companionObsidianId === companionObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-121: 하루 시간대 narrative — dawn/day/dusk/night 4종
// ════════════════════════════════════════════════════════════════

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface DayPhaseNarrative {
  phase: DayPhase;
  label: string;
  enterLine: string;
  modifierHint: string;
}

export const SCENARIO_DAY_PHASE_NARRATIVES: readonly DayPhaseNarrative[] = [
  {
    phase: 'dawn',
    label: '새벽',
    enterLine: '— 지평선이 옅은 보랏빛으로 물들기 시작합니다.',
    modifierHint: '기억 공명의 감도가 +10%. 봉인 의식 조사에 유리한 시간대입니다.',
  },
  {
    phase: 'day',
    label: '낮',
    enterLine: '— 햇빛이 풍경의 모든 결을 드러냅니다.',
    modifierHint: '필드 시야가 가장 좋은 표준 시간대. 일반 전투 / 탐색에 균형이 잡힙니다.',
  },
  {
    phase: 'dusk',
    label: '황혼',
    enterLine: '— 그림자가 길어지며 모든 색이 한 톤 짙어집니다.',
    modifierHint: '그림자 직조사 패시브가 +15% 증폭. 잠입 동선에 유리합니다.',
  },
  {
    phase: 'night',
    label: '밤',
    enterLine: '— 어둠이 깊어지며 별빛이 길을 안내합니다.',
    modifierHint: '필드 시야 감소, 회피 +10%. 야간 한정 NPC 가 등장하기도 합니다.',
  },
];

export function getDayPhaseNarrative(phase: DayPhase): DayPhaseNarrative | undefined {
  return SCENARIO_DAY_PHASE_NARRATIVES.find((d) => d.phase === phase);
}

export function listDayPhases(): readonly DayPhase[] {
  return ['dawn', 'day', 'dusk', 'night'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-122: 파벌 평판 tier narrative — 5 tier (hostile ~ allied)
// faction reputation 점수 구간별 narrative + UI label + interaction hint.
// ════════════════════════════════════════════════════════════════

export type ReputationTier = 'hostile' | 'wary' | 'neutral' | 'friendly' | 'allied';

export interface ReputationTierNarrative {
  tier: ReputationTier;
  label: string;
  /** 점수 하한 (inclusive) */
  minScore: number;
  uiColor: string;
  flavor: string;
  interactionHint: string;
}

export const SCENARIO_REPUTATION_TIER_NARRATIVES: readonly ReputationTierNarrative[] = [
  {
    tier: 'hostile',
    label: '적대',
    minScore: -100,
    uiColor: '#d04040',
    flavor: '파벌이 당신을 위협으로 간주합니다. 영역 진입만으로도 경계 경보가 울립니다.',
    interactionHint: '거래/퀘스트 차단. 영역 통과 시 적대 NPC 가 공격합니다.',
  },
  {
    tier: 'wary',
    label: '경계',
    minScore: -40,
    uiColor: '#d09040',
    flavor: '파벌이 당신을 주시합니다. 행동 하나하나가 평판 점수에 반영됩니다.',
    interactionHint: '거래 가격 +20%, 퀘스트 일부만 수주 가능. 신뢰 회복 quest 진입 가능.',
  },
  {
    tier: 'neutral',
    label: '중립',
    minScore: -10,
    uiColor: '#a0a0a0',
    flavor: '파벌이 당신을 외부인으로 대합니다. 특별한 호의도 적의도 없습니다.',
    interactionHint: '표준 거래 가격. 일반 quest 만 수주 가능합니다.',
  },
  {
    tier: 'friendly',
    label: '우호',
    minScore: 30,
    uiColor: '#60c060',
    flavor: '파벌이 당신을 동료로 인정합니다. 우호 NPC 들이 정보를 먼저 건넵니다.',
    interactionHint: '거래 가격 -10%, 우호 한정 quest 와 보상 trade 가 열립니다.',
  },
  {
    tier: 'allied',
    label: '동맹',
    minScore: 70,
    uiColor: '#40b0e0',
    flavor: '파벌이 당신을 자기 사람으로 본격적으로 받아들입니다.',
    interactionHint: '거래 가격 -20%, 동맹 한정 raid 와 동행 NPC 호출 가능.',
  },
];

export function getReputationTierNarrative(tier: ReputationTier): ReputationTierNarrative | undefined {
  return SCENARIO_REPUTATION_TIER_NARRATIVES.find((r) => r.tier === tier);
}

export function getReputationTierByScore(score: number): ReputationTierNarrative {
  const ascending = [...SCENARIO_REPUTATION_TIER_NARRATIVES].sort((a, b) => a.minScore - b.minScore);
  let current = ascending[0];
  for (const t of ascending) {
    if (score >= t.minScore) {
      current = t;
    }
  }
  return current;
}

// ════════════════════════════════════════════════════════════════
// SYNC-123: 날씨 narrative — 5 weather (clear/rain/storm/snow/fog)
// 필드 진입 시 표시되는 날씨 anchor + 전투/탐색 modifier hint.
// ════════════════════════════════════════════════════════════════

export type WeatherKind = 'clear' | 'rain' | 'storm' | 'snow' | 'fog';

export interface WeatherNarrative {
  weather: WeatherKind;
  label: string;
  /** 진입 anchor */
  enterLine: string;
  /** 전투/탐색 modifier */
  modifierHint: string;
}

export const SCENARIO_WEATHER_NARRATIVES: readonly WeatherNarrative[] = [
  {
    weather: 'clear',
    label: '맑음',
    enterLine: '— 하늘이 깨끗하게 열려 있습니다.',
    modifierHint: '시야 표준, 모든 modifier 기준값. 전투 균형이 잡힙니다.',
  },
  {
    weather: 'rain',
    label: '비',
    enterLine: '— 빗방울이 지면을 두드리며 발자국 소리를 가립니다.',
    modifierHint: '잠입 +5%, 불꽃 계열 데미지 -10%. 화염 패시브 효율이 떨어집니다.',
  },
  {
    weather: 'storm',
    label: '폭풍우',
    enterLine: '— 번개가 잠시 풍경을 흰빛으로 가르고, 거센 바람이 휘몰아칩니다.',
    modifierHint: '시야 -20%, 원거리 명중 -15%. 근접 / 광역 빌드에 유리합니다.',
  },
  {
    weather: 'snow',
    label: '눈',
    enterLine: '— 눈송이가 천천히 내려 풍경의 가장자리를 흐립니다.',
    modifierHint: '얼음 계열 데미지 +10%, 이동 속도 -5%. 얼음 빌드에 유리.',
  },
  {
    weather: 'fog',
    label: '안개',
    enterLine: '— 짙은 안개가 시야의 모서리부터 천천히 잠식해 옵니다.',
    modifierHint: '시야 -30%, 회피 +10%. 적의 선제권이 자주 올라갑니다 — 신중한 진입 필요.',
  },
];

export function getWeatherNarrative(weather: WeatherKind): WeatherNarrative | undefined {
  return SCENARIO_WEATHER_NARRATIVES.find((w) => w.weather === weather);
}

export function listWeatherKinds(): readonly WeatherKind[] {
  return ['clear', 'rain', 'storm', 'snow', 'fog'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-124: 인벤토리 상태 narrative — empty / normal / heavy / full
// 가방 점유율 구간 narrative + 이동/획득 modifier hint.
// ════════════════════════════════════════════════════════════════

export type InventoryState = 'empty' | 'normal' | 'heavy' | 'full';

export interface InventoryStateNarrative {
  state: InventoryState;
  label: string;
  /** 점유율 하한 (inclusive, 0~100) */
  minOccupancyPercent: number;
  enterLine: string;
  modifierHint: string;
}

export const SCENARIO_INVENTORY_STATE_NARRATIVES: readonly InventoryStateNarrative[] = [
  {
    state: 'empty',
    label: '비어 있음',
    minOccupancyPercent: 0,
    enterLine: '— 가방이 거의 비어 있습니다. 모든 자원에 대해 여유가 있습니다.',
    modifierHint: '이동 속도 +5%, 신규 획득 자원 자동 정렬.',
  },
  {
    state: 'normal',
    label: '여유 있음',
    minOccupancyPercent: 25,
    enterLine: '— 가방에 적당한 양의 자원이 담겨 있습니다.',
    modifierHint: '표준 이동 속도, 모든 획득/거래 modifier 기준값.',
  },
  {
    state: 'heavy',
    label: '무거움',
    minOccupancyPercent: 75,
    enterLine: '— 가방의 무게가 어깨에 느껴지기 시작합니다.',
    modifierHint: '이동 속도 -5%, 회피 -5%. 보급 마을에서 정리 권장.',
  },
  {
    state: 'full',
    label: '가득 참',
    minOccupancyPercent: 95,
    enterLine: '— 가방이 가득 차 더 이상 자원이 들어갈 자리가 없습니다.',
    modifierHint: '신규 자원 획득 시 선택 dialog 강제 — 자동 보관 차단.',
  },
];

export function getInventoryStateNarrative(state: InventoryState): InventoryStateNarrative | undefined {
  return SCENARIO_INVENTORY_STATE_NARRATIVES.find((s) => s.state === state);
}

export function getInventoryStateByOccupancy(occupancyPercent: number): InventoryStateNarrative {
  const ascending = [...SCENARIO_INVENTORY_STATE_NARRATIVES].sort(
    (a, b) => a.minOccupancyPercent - b.minOccupancyPercent,
  );
  let current = ascending[0];
  for (const s of ascending) {
    if (occupancyPercent >= s.minOccupancyPercent) {
      current = s;
    }
  }
  return current;
}

// ════════════════════════════════════════════════════════════════
// SYNC-125: 🎯 난이도 narrative — easy/normal/hard/nightmare 4종
// 게임 시작 시 선택하는 난이도 + 각 난이도 modifier 와 추천 대상.
// ════════════════════════════════════════════════════════════════

export type DifficultyTier = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface DifficultyNarrative {
  difficulty: DifficultyTier;
  label: string;
  /** 추천 대상 */
  recommended: string;
  /** modifier 한 줄 요약 */
  modifierSummary: string;
  /** flavor narrative */
  flavor: string;
}

export const SCENARIO_DIFFICULTY_NARRATIVES: readonly DifficultyNarrative[] = [
  {
    difficulty: 'easy',
    label: '쉬움',
    recommended: 'RPG 입문자 / 스토리 우선 플레이',
    modifierSummary: '적 HP -25%, 동료 회복 +20%, 사망 페널티 없음',
    flavor: '— 길은 부드럽고, 동료의 호흡은 깊습니다. 이야기에 집중하기 좋은 결입니다.',
  },
  {
    difficulty: 'normal',
    label: '보통',
    recommended: '표준 RPG 경험을 원하는 플레이어',
    modifierSummary: '모든 modifier 기준값, 표준 보상',
    flavor: '— 게임이 의도한 균형의 결. 모든 시스템이 설계된 그대로 작동합니다.',
  },
  {
    difficulty: 'hard',
    label: '어려움',
    recommended: 'ATB / 빌드 / 콤보 시스템에 익숙한 플레이어',
    modifierSummary: '적 HP +30%, 적 ATB 속도 +15%, 보상 +10%',
    flavor: '— 길은 좁고, 매 turn 마다 선택의 무게가 또렷합니다. 빌드가 곧 답이 됩니다.',
  },
  {
    difficulty: 'nightmare',
    label: '악몽',
    recommended: '엔드게임 도전자 / 도전 모디파이어 누적자',
    modifierSummary: '적 HP +60%, 적 패시브 +1 단계, 동료 사망 영구화',
    flavor: '— 모든 호흡이 마지막이 될 수 있습니다. 가장 작은 실수도 회복되지 않습니다.',
  },
];

export function getDifficultyNarrative(difficulty: DifficultyTier): DifficultyNarrative | undefined {
  return SCENARIO_DIFFICULTY_NARRATIVES.find((d) => d.difficulty === difficulty);
}

export function listDifficultyTiersAscending(): readonly DifficultyTier[] {
  return ['easy', 'normal', 'hard', 'nightmare'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-126: 저장 슬롯 narrative — manual/auto/quick/checkpoint 4종
// ════════════════════════════════════════════════════════════════

export type SaveSlotKind = 'manual' | 'auto' | 'quick' | 'checkpoint';

export interface SaveSlotDescription {
  kind: SaveSlotKind;
  label: string;
  triggerSummary: string;
  defaultSlotCount: number;
  usageHint: string;
}

export const SCENARIO_SAVE_SLOT_DESCRIPTIONS: readonly SaveSlotDescription[] = [
  {
    kind: 'manual',
    label: '수동 저장',
    triggerSummary: '플레이어가 메뉴에서 직접 저장 시',
    defaultSlotCount: 10,
    usageHint: '중요한 분기 직전에 별도 슬롯에 저장해 두면 분기 비교에 유용합니다.',
  },
  {
    kind: 'auto',
    label: '자동 저장',
    triggerSummary: '챕터 진입, 보스 직전, zone 전환 시 자동',
    defaultSlotCount: 3,
    usageHint: '최신 3개가 rotation 으로 유지됩니다. 갑작스러운 종료에 대비된 보험.',
  },
  {
    kind: 'quick',
    label: '빠른 저장',
    triggerSummary: '키 단축키 (F5) 1회 누르면 즉시 갱신',
    defaultSlotCount: 1,
    usageHint: '단일 슬롯이라 덮어쓰기 됩니다. 시험 빌드 테스트용으로 적합.',
  },
  {
    kind: 'checkpoint',
    label: '체크포인트',
    triggerSummary: '메인 퀘스트 milestone 도달 시 자동',
    defaultSlotCount: 5,
    usageHint: '챕터별 milestone 5개까지 영구 보존. 회차 비교에 사용합니다.',
  },
];

export function getSaveSlotDescription(kind: SaveSlotKind): SaveSlotDescription | undefined {
  return SCENARIO_SAVE_SLOT_DESCRIPTIONS.find((s) => s.kind === kind);
}

export function listSaveSlotKinds(): readonly SaveSlotKind[] {
  return ['manual', 'auto', 'quick', 'checkpoint'];
}

export function getTotalDefaultSaveSlots(): number {
  return SCENARIO_SAVE_SLOT_DESCRIPTIONS.reduce((sum, s) => sum + s.defaultSlotCount, 0);
}

// ════════════════════════════════════════════════════════════════
// SYNC-127: 일시정지 메뉴 label — 6 항목 (resume/inventory/skill/quest/settings/title)
// ════════════════════════════════════════════════════════════════

export type PauseMenuKey = 'resume' | 'inventory' | 'skill' | 'quest' | 'settings' | 'title';

export interface PauseMenuLabel {
  key: PauseMenuKey;
  label: string;
  tooltip: string;
  /** UI sort 순서 (1~) */
  sortOrder: number;
}

export const SCENARIO_PAUSE_MENU_LABELS: readonly PauseMenuLabel[] = [
  { key: 'resume',    label: '계속하기',         tooltip: '일시정지를 해제하고 현재 자리로 돌아갑니다.',         sortOrder: 1 },
  { key: 'inventory', label: '가방',             tooltip: '아이템과 장비를 확인하고 정리합니다.',                sortOrder: 2 },
  { key: 'skill',     label: '스킬 / 빌드',      tooltip: '스킬 포인트를 재분배하고 빌드를 점검합니다.',         sortOrder: 3 },
  { key: 'quest',     label: '퀘스트 기록',      tooltip: '진행 중인 퀘스트와 메인 milestone 을 확인합니다.',    sortOrder: 4 },
  { key: 'settings',  label: '설정',             tooltip: '오디오 / 그래픽 / 키 설정을 조정합니다.',             sortOrder: 5 },
  { key: 'title',     label: '타이틀로 돌아가기', tooltip: '저장되지 않은 진행은 잃습니다 — 신중히 선택하세요.', sortOrder: 6 },
];

export function getPauseMenuLabel(key: PauseMenuKey): PauseMenuLabel | undefined {
  return SCENARIO_PAUSE_MENU_LABELS.find((m) => m.key === key);
}

export function listPauseMenuLabelsSorted(): readonly PauseMenuLabel[] {
  return [...SCENARIO_PAUSE_MENU_LABELS].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ════════════════════════════════════════════════════════════════
// SYNC-128: 메인 퀘스트 완료 narrative — MAIN_QUEST_ACCEPT 5종 대조
// 5 핵심 quest 완료 시 의뢰자 반응 + 보상 + 다음 단계.
// ════════════════════════════════════════════════════════════════

export interface MainQuestTurnInNarrative {
  questCode: string;
  chapter: number;
  giverReaction: string;
  rewardLine: string;
  nextStepAnchor: string;
}

export const SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES: readonly MainQuestTurnInNarrative[] = [
  {
    questCode: 'MQ_CH01',
    chapter: 1,
    giverReaction: '칸텔라 마을 장로가 깊은 한숨을 내쉽니다. "정말 첫 파편을 회수했다니..."',
    rewardLine: '칸텔라 마을 신뢰도 +20, 에레보스 안전 통로 개방, 메모리 결정 ×3',
    nextStepAnchor: '실반헤임 외곽 안내인의 약속이 다음 길을 안내합니다 — 잎새 사이로 향하세요.',
  },
  {
    questCode: 'MQ_CH03',
    chapter: 2,
    giverReaction: '엘파리스 안내인이 잎새 빛 색을 한 번 더 확인하고 안도의 미소를 짓습니다.',
    rewardLine: '엘파리스 외교 신뢰도 +30, 깊은 숲 영구 출입권, 말라투스 잎새 ×5',
    nextStepAnchor: '솔라리스 사막 가장자리의 모래 폭풍이 다음 단계의 시험을 예고합니다.',
  },
  {
    questCode: 'MQ_CH04',
    chapter: 4,
    giverReaction: '잠입 안내인이 짧게 끄덕입니다. "잿빛 침묵의 진원이 흔들렸군."',
    rewardLine: '잠행 거리 신뢰도 +40, 황궁 내부 우회 경로 개방, 황궁 통행증 ×1',
    nextStepAnchor: '망각의 고원 입구에서 4 파편의 첫 동시 공명이 시작됩니다.',
  },
  {
    questCode: 'MQ_CH13',
    chapter: 5,
    giverReaction: '4 파편이 손바닥 위에서 마지막 빛으로 응결됩니다. 누구도 말을 잇지 못합니다.',
    rewardLine: '황금 에테르 탑 입장 권한, 4 파편 통합 의식 발동',
    nextStepAnchor: '탑 최상층 — 레테 강림 직전 모든 모티프 회상이 시작됩니다.',
  },
  {
    questCode: 'MQ_CH15',
    chapter: 5,
    giverReaction: '레테가 흩어지며 거대한 눈들의 집합체가 마지막 빛으로 사라집니다.',
    rewardLine: '엔딩 분기 확정 — A/B/C/D 중 조건에 따른 결말 cinematic 재생',
    nextStepAnchor: '크레딧 → New Game+ 진입 가능. 동료 신뢰도 일부 인계.',
  },
];

export function getMainQuestTurnInNarrative(questCode: string): MainQuestTurnInNarrative | undefined {
  return SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES.find((n) => n.questCode === questCode);
}

// ════════════════════════════════════════════════════════════════
// SYNC-129: 레벨업 동료 외침 — 6 동료 + 에리언 = 7 entry
// 필드/메뉴에서 레벨업 발동 시 짧은 한 줄 외침.
// ════════════════════════════════════════════════════════════════

export interface LevelUpShout {
  /** SCENARIO_COMPANIONS.obsidianId 또는 'aerien' (주인공) */
  characterId: string;
  shoutLine: string;
}

export const SCENARIO_LEVEL_UP_SHOUTS: readonly LevelUpShout[] = [
  { characterId: 'aerien',          shoutLine: '"공명이 한 결 더 깊어졌다 — 다음으로."' },
  { characterId: 'seraphine',       shoutLine: '"길의 폭이 한 뼘 더 넓어졌어. 따라와."' },
  { characterId: 'maestro_crio',    shoutLine: '"새 카드 한 장이 들어왔다. 다음 거래는 더 유리하겠지."' },
  { characterId: 'ignara',          shoutLine: '"불꽃이 또 한 단계 — 멈출 이유 없지."' },
  { characterId: 'benjamin_cross',  shoutLine: '"수사 노트에 한 줄 더. 다음 단서로 간다."' },
  { characterId: 'reina',           shoutLine: '"교단의 약점이 또 하나 보였어. 다음에 쓴다."' },
  { characterId: 'urgrom',          shoutLine: '"북방의 결이 한 겹 더 단단해졌군. 좋다."' },
];

export function getLevelUpShout(characterId: string): LevelUpShout | undefined {
  return SCENARIO_LEVEL_UP_SHOUTS.find((s) => s.characterId === characterId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-130: 🎯 파벌 소개 narrative — SCENARIO_FACTIONS 7 파벌 1:1
// 각 파벌과 첫 조우 시 표시되는 정체성 anchor + 추천 접근 방식.
// ════════════════════════════════════════════════════════════════

export interface FactionIntroNarrative {
  /** SCENARIO_FACTIONS.obsidianId 와 1:1 매칭 */
  factionObsidianId: string;
  /** 정체성 anchor — 1줄 */
  identityLine: string;
  /** 접근 권장 — 우호/적대/중립 가이드 */
  approachHint: string;
}

export const SCENARIO_FACTION_INTRO_NARRATIVES: readonly FactionIntroNarrative[] = [
  {
    factionObsidianId: 'faction_elfaris',
    identityLine: '— 잎새 사이 빛으로 자기 자리를 지키는 엘파리스의 수호자들.',
    approachHint: '외교 분기를 통해 호의를 얻으세요. 깊은 숲 안내가 동행에 큰 차이를 만듭니다.',
  },
  {
    factionObsidianId: 'faction_ifrita',
    identityLine: '— 이그나루스의 최초의 불꽃을 손에 든 사막의 부족.',
    approachHint: '부족 의식을 존중하면 화로 영역 진입권이 열립니다. 모래 폭풍의 안전 통로도 안내됩니다.',
  },
  {
    factionObsidianId: 'faction_solian',
    identityLine: '— 한 밤에 멸망한 솔리안 황금기의 잔향, 라와르 봉인에 깃들어 있습니다.',
    approachHint: '직접적인 외교는 불가 — 유적 안의 봉인 의식을 해석해 그들의 의지에 응답하세요.',
  },
  {
    factionObsidianId: 'faction_kalimar_empire',
    identityLine: '— 첨탑이 잿빛 하늘을 가르는 제국, 시민의 침묵은 우연이 아닙니다.',
    approachHint: '정면 대치는 자원 소모가 큽니다. 잠입 동선과 통행증 우회가 우선입니다.',
  },
  {
    factionObsidianId: 'faction_lethe_cult',
    identityLine: '— 거대한 눈들을 추종하는 망각 구원론자들의 비밀 종교.',
    approachHint: '내부고발자 (레이나) 정보가 핵심. 의식 패턴을 사전 파악해 약점을 찌르세요.',
  },
  {
    factionObsidianId: 'faction_memory_guardian',
    identityLine: '— 에레보스 폐광 비밀 본부, 카일 봉인 의식의 계승자들.',
    approachHint: '에리언의 공명에 가장 친화적인 파벌. 본부 진입 후 보급/정보 모두 우호적입니다.',
  },
  {
    factionObsidianId: 'faction_memory_hunter',
    identityLine: '— 케인이 이끄는 레테 교단의 무력 부대 — 파편을 추적합니다.',
    approachHint: '필드 조우 시 거의 항상 적대. 회피와 우회 동선을 우선 검토하세요.',
  },
];

export function getFactionIntroNarrative(factionObsidianId: string): FactionIntroNarrative | undefined {
  return SCENARIO_FACTION_INTRO_NARRATIVES.find((n) => n.factionObsidianId === factionObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-131: 상점 UI 카테고리 label — 5 카테고리
// 상점 UI 탭 구성 + 짧은 카테고리 description.
// ════════════════════════════════════════════════════════════════

export type ShopCategoryKey = 'consumables' | 'equipment' | 'materials' | 'quest_items' | 'special';

export interface ShopCategoryLabel {
  key: ShopCategoryKey;
  label: string;
  /** UI sort 순서 (1~) */
  sortOrder: number;
  /** 카테고리 설명 */
  description: string;
}

export const SCENARIO_SHOP_CATEGORY_LABELS: readonly ShopCategoryLabel[] = [
  { key: 'consumables', label: '소모품',   sortOrder: 1, description: '회복 물자, 일회용 폭탄, 임시 버프 — 전투/탐색 보급의 기본.' },
  { key: 'equipment',   label: '장비',     sortOrder: 2, description: '무기, 방어구, 장신구 — 6 슬롯 빌드의 핵심 자원.' },
  { key: 'materials',   label: '제작 재료', sortOrder: 3, description: '강화, 합성, 제작 도구의 입력 자원 — 보스 직전 보급 단계 핵심.' },
  { key: 'quest_items', label: '퀘스트 물품', sortOrder: 4, description: '퀘스트 전용 자원 — 판매 불가, 갯수 한정.' },
  { key: 'special',     label: '특수 거래', sortOrder: 5, description: '평판/마일스톤 기반 잠금 해제. 우호 tier 이상에서만 노출.' },
];

export function getShopCategoryLabel(key: ShopCategoryKey): ShopCategoryLabel | undefined {
  return SCENARIO_SHOP_CATEGORY_LABELS.find((c) => c.key === key);
}

export function listShopCategoriesSorted(): readonly ShopCategoryLabel[] {
  return [...SCENARIO_SHOP_CATEGORY_LABELS].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ════════════════════════════════════════════════════════════════
// SYNC-132: 튜토리얼 anchor — 7 단계 (move/atb/skill/inventory/quest/save/exit)
// 각 단계 진입 시 화면 표시 anchor + 추천 action.
// ════════════════════════════════════════════════════════════════

export type TutorialStepKey = 'move' | 'atb' | 'skill' | 'inventory' | 'quest' | 'save' | 'exit';

export interface TutorialAnchorLine {
  step: TutorialStepKey;
  stepOrder: number;
  /** 단계 한글 명 */
  stepLabel: string;
  /** anchor 본문 — 무엇을 배우는가 */
  anchorText: string;
  /** 추천 action — 어떤 입력을 시도할지 */
  recommendedAction: string;
}

export const SCENARIO_TUTORIAL_ANCHOR_LINES: readonly TutorialAnchorLine[] = [
  { step: 'move',      stepOrder: 1, stepLabel: '이동', anchorText: '— 칸텔라 광장의 발걸음이 첫 호흡을 시작합니다.', recommendedAction: '화살표 키 또는 WASD 로 이동, 마우스 클릭으로 목적지 지정 가능.' },
  { step: 'atb',       stepOrder: 2, stepLabel: 'ATB 게이지', anchorText: '— ATB 게이지가 가득 차면 행동을 선택합니다.', recommendedAction: '게이지가 100% 일 때 행동 선택. 대기열을 활용해 동료 순서를 조율.' },
  { step: 'skill',     stepOrder: 3, stepLabel: '스킬 / 빌드', anchorText: '— 6 슬롯에 스킬을 배치해 빌드를 구성합니다.', recommendedAction: '메뉴 → 스킬 → 6 슬롯에 Tier 1 부터 배치. 패시브 1 슬롯 권장.' },
  { step: 'inventory', stepOrder: 4, stepLabel: '인벤토리', anchorText: '— 가방에 자원을 정리하고 장비를 교체합니다.', recommendedAction: '메뉴 → 가방. 회복 물자는 quick slot 에 등록해 두면 전투 중 즉시 사용 가능.' },
  { step: 'quest',     stepOrder: 5, stepLabel: '퀘스트 기록', anchorText: '— 퀘스트 기록이 다음 목표를 추적합니다.', recommendedAction: '메뉴 → 퀘스트. 메인 quest 와 서브 quest 의 보상 비교에 사용.' },
  { step: 'save',      stepOrder: 6, stepLabel: '저장', anchorText: '— 중요한 분기 직전엔 별도 슬롯에 저장하세요.', recommendedAction: '메뉴 → 저장. 수동(10) / 자동(3) / 빠른(1) / 체크포인트(5) = 19 슬롯.' },
  { step: 'exit',      stepOrder: 7, stepLabel: '종료', anchorText: '— 타이틀로 돌아가기 전 마지막 저장을 확인하세요.', recommendedAction: '메뉴 → 타이틀로 돌아가기. 저장되지 않은 진행은 잃습니다.' },
];

export function getTutorialAnchorLine(step: TutorialStepKey): TutorialAnchorLine | undefined {
  return SCENARIO_TUTORIAL_ANCHOR_LINES.find((t) => t.step === step);
}

export function listTutorialAnchorsSorted(): readonly TutorialAnchorLine[] {
  return [...SCENARIO_TUTORIAL_ANCHOR_LINES].sort((a, b) => a.stepOrder - b.stepOrder);
}

// ════════════════════════════════════════════════════════════════
// SYNC-133: 알림 톤 narrative — info/success/warning/error 4종
// 시스템 알림 띄울 때 사용하는 톤 별 label + UI color + ARIA priority.
// ════════════════════════════════════════════════════════════════

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface NotificationToneNarrative {
  tone: NotificationTone;
  label: string;
  uiColor: string;
  /** WAI-ARIA live region priority */
  ariaLive: 'polite' | 'assertive';
  /** 톤 의미 narrative */
  intent: string;
}

export const SCENARIO_NOTIFICATION_TONE_NARRATIVES: readonly NotificationToneNarrative[] = [
  {
    tone: 'info',
    label: '안내',
    uiColor: '#5f9fff',
    ariaLive: 'polite',
    intent: '플레이어가 즉시 반응하지 않아도 되는 단순 안내. 화면 모서리에서 짧게 fade-in/out.',
  },
  {
    tone: 'success',
    label: '성공',
    uiColor: '#5fbf5f',
    ariaLive: 'polite',
    intent: '행동이 의도대로 완료된 상태. 성취감 anchor — 0.8s 표시 후 자동 소멸.',
  },
  {
    tone: 'warning',
    label: '경고',
    uiColor: '#ffb720',
    ariaLive: 'polite',
    intent: '게임이 진행되지만 주의가 필요한 상태. 인벤토리 거의 가득, 신뢰도 하락 등.',
  },
  {
    tone: 'error',
    label: '오류',
    uiColor: '#d04040',
    ariaLive: 'assertive',
    intent: '플레이어 행동이 실패했거나 시스템 문제. 즉시 인지 필요 — 화면 중앙 모달.',
  },
];

export function getNotificationToneNarrative(tone: NotificationTone): NotificationToneNarrative | undefined {
  return SCENARIO_NOTIFICATION_TONE_NARRATIVES.find((n) => n.tone === tone);
}

export function listNotificationTones(): readonly NotificationTone[] {
  return ['info', 'success', 'warning', 'error'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-134: ATB 전투 phase narrative — charging/ready/acting/cooldown 4종
// FF6 ATB 시스템의 단계별 narrative + UI hint.
// ════════════════════════════════════════════════════════════════

export type AtbPhaseKind = 'charging' | 'ready' | 'acting' | 'cooldown';

export interface AtbPhaseNarrative {
  phase: AtbPhaseKind;
  label: string;
  /** 시각적 UI 표현 */
  uiHint: string;
  /** 게이지 % 또는 상태 의미 */
  stateMeaning: string;
  /** flavor */
  flavor: string;
}

export const SCENARIO_ATB_PHASE_NARRATIVES: readonly AtbPhaseNarrative[] = [
  {
    phase: 'charging',
    label: '충전 중',
    uiHint: 'ATB 바가 0%~99% 사이에서 천천히 채워집니다.',
    stateMeaning: '행동 권한 없음. 적의 행동을 관찰하며 다음 빌드를 준비할 시간.',
    flavor: '— 호흡을 가다듬는 결.',
  },
  {
    phase: 'ready',
    label: '준비 완료',
    uiHint: 'ATB 바가 100% 도달, 캐릭터 주변 빛 효과 활성화.',
    stateMeaning: '행동 선택 가능. 대기 시 적의 행동 우선권은 다른 캐릭터에게 넘어갑니다.',
    flavor: '— 결단이 손끝에 머무는 순간.',
  },
  {
    phase: 'acting',
    label: '행동 중',
    uiHint: '스킬 애니메이션 + 피해/효과 popup 표시.',
    stateMeaning: '행동 실행 중. 인터럽트 가능 여부는 스킬마다 다름.',
    flavor: '— 결단이 풍경을 흔드는 결.',
  },
  {
    phase: 'cooldown',
    label: '쿨다운',
    uiHint: 'ATB 바가 0%로 리셋되며 잠시 비활성화.',
    stateMeaning: '다음 충전 시작까지 짧은 휴식. Auto AI 는 이 시간에 다음 빌드를 평가.',
    flavor: '— 결단이 가라앉는 결, 다음 호흡을 기다립니다.',
  },
];

export function getAtbPhaseNarrative(phase: AtbPhaseKind): AtbPhaseNarrative | undefined {
  return SCENARIO_ATB_PHASE_NARRATIVES.find((p) => p.phase === phase);
}

export function listAtbPhasesInOrder(): readonly AtbPhaseKind[] {
  return ['charging', 'ready', 'acting', 'cooldown'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-135: 🎯 파티 구성 narrative — front_row/back_row/solo 3종
// 전투 진입 시 선택한 파티 구성 별 narrative + 전투 modifier.
// ════════════════════════════════════════════════════════════════

export type PartyFormation = 'front_row' | 'back_row' | 'solo';

export interface PartyFormationNarrative {
  formation: PartyFormation;
  label: string;
  /** 진입 anchor */
  anchorLine: string;
  /** 권장 빌드 */
  recommendedBuild: string;
  /** modifier 요약 */
  modifierSummary: string;
}

export const SCENARIO_PARTY_FORMATION_NARRATIVES: readonly PartyFormationNarrative[] = [
  {
    formation: 'front_row',
    label: '전열',
    anchorLine: '— 모든 동료가 적과 정면 대치 — 일격의 무게가 가장 큽니다.',
    recommendedBuild: '에테르 기사 + 기억 파괴자 중심. 근접 폭딜 + reflect 패시브 조합.',
    modifierSummary: '근접 데미지 +15%, 받는 피해 +10%, 회피 -5%.',
  },
  {
    formation: 'back_row',
    label: '후열',
    anchorLine: '— 후열 배치 — 안전한 거리에서 결을 조율합니다.',
    recommendedBuild: '기억술사 + 시간 수호자 중심. 회복 + ATB 조작 + 디버프 빌드.',
    modifierSummary: '받는 피해 -15%, 근접 데미지 -10%, 원거리 명중 +5%.',
  },
  {
    formation: 'solo',
    label: '단독',
    anchorLine: '— 동료 없이 단독 진입 — 호흡이 한 사람에게 모입니다.',
    recommendedBuild: '허공의 방랑자 + auto_resurrect 패시브. 회피 + 분단 빌드.',
    modifierSummary: '경험치 +30%, 받는 피해 +25%, 보스 페이즈 전이 -1.',
  },
];

export function getPartyFormationNarrative(formation: PartyFormation): PartyFormationNarrative | undefined {
  return SCENARIO_PARTY_FORMATION_NARRATIVES.find((p) => p.formation === formation);
}

export function listPartyFormations(): readonly PartyFormation[] {
  return ['front_row', 'back_row', 'solo'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-136: 빠른 이동 narrative — SCENARIO_ZONES 9 zone + universal
// 빠른 이동 hub 도착 시 표시되는 anchor.
// ════════════════════════════════════════════════════════════════

export interface FastTravelNarrative {
  /** SCENARIO_ZONES.obsidianId 또는 'universal' */
  zoneObsidianId: string;
  /** 도착 anchor */
  arrivalLine: string;
}

export const SCENARIO_FAST_TRAVEL_NARRATIVES: readonly FastTravelNarrative[] = [
  { zoneObsidianId: 'erebos',              arrivalLine: '— 운하 위 검은 물결을 가르며 에레보스 hub 에 도착합니다.' },
  { zoneObsidianId: 'cantela_village',     arrivalLine: '— 칸텔라 마을 광장의 종탑 그림자 아래 발이 닿습니다.' },
  { zoneObsidianId: 'silvanheim',          arrivalLine: '— 잎새 사이 빛이 발걸음을 안내합니다 — 실반헤임 hub.' },
  { zoneObsidianId: 'malatus_grove',       arrivalLine: '— 말라투스 고목의 호흡 안쪽으로 미끄러져 들어옵니다.' },
  { zoneObsidianId: 'solaris',             arrivalLine: '— 솔라리스 오아시스의 시원한 물결 옆에 도착합니다.' },
  { zoneObsidianId: 'argentium',           arrivalLine: '— 잿빛 황궁의 첨탑 그림자 아래 발이 닿습니다.' },
  { zoneObsidianId: 'palatino_lab',        arrivalLine: '— 청록빛 에테르 결정의 명멸 속으로 미끄러져 들어옵니다.' },
  { zoneObsidianId: 'oblivion_plateau',    arrivalLine: '— 망각의 고원 바람이 어깨를 가볍게 두드립니다.' },
  { zoneObsidianId: 'golden_ether_tower',  arrivalLine: '— 황금 에테르 탑 최저층 — 시간이 느려지는 결을 느낍니다.' },
  { zoneObsidianId: 'universal',           arrivalLine: '— 빠른 이동이 완료되었습니다. 주변을 한 번 둘러보세요.' },
];

export function getFastTravelNarrative(zoneObsidianId: string): FastTravelNarrative | undefined {
  return SCENARIO_FAST_TRAVEL_NARRATIVES.find((n) => n.zoneObsidianId === zoneObsidianId);
}

export function getFastTravelFallback(): FastTravelNarrative {
  const fb = SCENARIO_FAST_TRAVEL_NARRATIVES.find((n) => n.zoneObsidianId === 'universal');
  if (!fb) {
    throw new Error('SCENARIO_FAST_TRAVEL_NARRATIVES universal fallback 누락');
  }
  return fb;
}

// ════════════════════════════════════════════════════════════════
// SYNC-137: 키바인딩 narrative — 8 action 기본값 + 설명
// 설정 메뉴 키 바인딩 표에 표시되는 action label + default key + description.
// ════════════════════════════════════════════════════════════════

export type KeybindAction =
  | 'move_up' | 'move_down' | 'move_left' | 'move_right'
  | 'interact' | 'open_menu' | 'quickslot_1' | 'escape';

export interface KeybindDescription {
  action: KeybindAction;
  label: string;
  /** 기본 키 (PC 키보드 표준) */
  defaultKey: string;
  /** action 설명 */
  description: string;
}

export const SCENARIO_KEYBIND_DESCRIPTIONS: readonly KeybindDescription[] = [
  { action: 'move_up',     label: '위로 이동',        defaultKey: 'W',     description: '캐릭터를 위쪽으로 이동.' },
  { action: 'move_down',   label: '아래로 이동',      defaultKey: 'S',     description: '캐릭터를 아래쪽으로 이동.' },
  { action: 'move_left',   label: '왼쪽으로 이동',    defaultKey: 'A',     description: '캐릭터를 왼쪽으로 이동.' },
  { action: 'move_right',  label: '오른쪽으로 이동',  defaultKey: 'D',     description: '캐릭터를 오른쪽으로 이동.' },
  { action: 'interact',    label: '상호작용',         defaultKey: 'E',     description: 'NPC 대화, 아이템 획득, 봉인 조사 등 표준 상호작용.' },
  { action: 'open_menu',   label: '메뉴 열기',        defaultKey: 'Tab',   description: '일시정지 메뉴 토글 (가방 / 스킬 / 퀘스트 / 설정 / 타이틀).' },
  { action: 'quickslot_1', label: '퀵슬롯 1',         defaultKey: '1',     description: '인벤토리에 등록된 1번 슬롯의 회복 물자를 즉시 사용.' },
  { action: 'escape',      label: '취소 / 종료',      defaultKey: 'Esc',   description: '현재 모달/다이얼로그 종료, 또는 메뉴 한 단계 뒤로.' },
];

export function getKeybindDescription(action: KeybindAction): KeybindDescription | undefined {
  return SCENARIO_KEYBIND_DESCRIPTIONS.find((k) => k.action === action);
}

export function listKeybindActions(): readonly KeybindAction[] {
  return SCENARIO_KEYBIND_DESCRIPTIONS.map((k) => k.action);
}

// ════════════════════════════════════════════════════════════════
// SYNC-138: 설정 메뉴 description — 8 항목 (audio/graphics/accessibility)
// 각 설정 항목 label + 카테고리 + 설명 + 기본값.
// ════════════════════════════════════════════════════════════════

export type SettingsCategory = 'audio' | 'graphics' | 'accessibility';

export type SettingsItemKey =
  | 'audio_master' | 'audio_bgm' | 'audio_sfx'
  | 'graphics_quality' | 'graphics_fullscreen'
  | 'accessibility_colorblind' | 'accessibility_subtitle' | 'accessibility_reduce_motion';

export interface SettingsDescription {
  itemKey: SettingsItemKey;
  category: SettingsCategory;
  label: string;
  /** 기본값의 한글 표현 */
  defaultValue: string;
  description: string;
}

export const SCENARIO_SETTINGS_DESCRIPTIONS: readonly SettingsDescription[] = [
  // audio
  { itemKey: 'audio_master', category: 'audio', label: '마스터 볼륨', defaultValue: '80%', description: '전체 오디오 볼륨. 0~100 슬라이더로 조정.' },
  { itemKey: 'audio_bgm',    category: 'audio', label: 'BGM 볼륨',  defaultValue: '70%', description: '배경 음악 볼륨. 마스터 볼륨에 비례 적용.' },
  { itemKey: 'audio_sfx',    category: 'audio', label: 'SFX 볼륨',  defaultValue: '85%', description: '효과음 볼륨. 마스터 볼륨에 비례 적용.' },
  // graphics
  { itemKey: 'graphics_quality',    category: 'graphics', label: '그래픽 품질', defaultValue: '중간', description: '저/중간/높음. 저사양 PC 는 저로 설정 권장.' },
  { itemKey: 'graphics_fullscreen', category: 'graphics', label: '전체화면',    defaultValue: '꺼짐', description: '윈도우 / 전체화면 전환. F11 단축키도 동일 작동.' },
  // accessibility
  { itemKey: 'accessibility_colorblind',    category: 'accessibility', label: '색맹 모드',     defaultValue: '꺼짐', description: '4 SVG 필터 (protanopia / deuteranopia / tritanopia / achromatopsia).' },
  { itemKey: 'accessibility_subtitle',      category: 'accessibility', label: '자막 크기',     defaultValue: '중간', description: '자막 텍스트 크기 — 작음 / 중간 / 큼.' },
  { itemKey: 'accessibility_reduce_motion', category: 'accessibility', label: '모션 감소',     defaultValue: 'OS 따름', description: 'prefers-reduced-motion 우선. 화면 흔들림과 큰 모션 효과를 줄입니다.' },
];

export function getSettingsDescription(itemKey: SettingsItemKey): SettingsDescription | undefined {
  return SCENARIO_SETTINGS_DESCRIPTIONS.find((s) => s.itemKey === itemKey);
}

export function listSettingsByCategory(category: SettingsCategory): readonly SettingsDescription[] {
  return SCENARIO_SETTINGS_DESCRIPTIONS.filter((s) => s.category === category);
}

// ════════════════════════════════════════════════════════════════
// SYNC-139: 데미지 타입 narrative — 6 element (physical/fire/ice/lightning/shadow/holy)
// 각 element 의 popup 색상 + 분류 + flavor.
// ════════════════════════════════════════════════════════════════

export type DamageElement = 'physical' | 'fire' | 'ice' | 'lightning' | 'shadow' | 'holy';

export interface DamageTypeNarrative {
  element: DamageElement;
  label: string;
  popupColor: string;
  /** 약점 hint — 어떤 적에게 효과적 */
  strongAgainst: string;
  flavor: string;
}

export const SCENARIO_DAMAGE_TYPE_NARRATIVES: readonly DamageTypeNarrative[] = [
  {
    element: 'physical',
    label: '물리',
    popupColor: '#bfbfbf',
    strongAgainst: '대부분의 일반 적. 무방비 갑옷 / 가죽 적에게 효과적.',
    flavor: '— 가장 기본의 결, 칼날과 주먹의 무게.',
  },
  {
    element: 'fire',
    label: '화염',
    popupColor: '#ff6b40',
    strongAgainst: '얼음 계열 / 식물성 적. 비/눈 날씨에서는 효과 -10%.',
    flavor: '— 이프리타족의 최초의 불꽃이 남긴 결.',
  },
  {
    element: 'ice',
    label: '얼음',
    popupColor: '#5fc0ff',
    strongAgainst: '화염 계열 / 빠른 적 (이동 속도 둔화). 눈 날씨에서 +10%.',
    flavor: '— 정지의 결, 흐름을 잠시 멈춥니다.',
  },
  {
    element: 'lightning',
    label: '번개',
    popupColor: '#ffd040',
    strongAgainst: '금속 갑옷 / 수중 적. 폭풍우 날씨에서 발동 시 +15%.',
    flavor: '— 즉시의 결, 풍경을 한 박자 가르는 빛.',
  },
  {
    element: 'shadow',
    label: '그림자',
    popupColor: '#7f40bf',
    strongAgainst: '신성/빛 계열 적. 그림자 직조사 콤보 발동 시 +20%.',
    flavor: '— 잠식의 결, 그림자가 그림자를 부르는 흐름.',
  },
  {
    element: 'holy',
    label: '신성',
    popupColor: '#ffd57f',
    strongAgainst: '레테 교단 / 망각/언데드 계열. 황혼/밤 시간대 +10%.',
    flavor: '— 봉인의 결, 카일 전생의 의지가 깃든 빛.',
  },
];

export function getDamageTypeNarrative(element: DamageElement): DamageTypeNarrative | undefined {
  return SCENARIO_DAMAGE_TYPE_NARRATIVES.find((d) => d.element === element);
}

export function listDamageElements(): readonly DamageElement[] {
  return ['physical', 'fire', 'ice', 'lightning', 'shadow', 'holy'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-140: 🎯 전투 도주 narrative — 5 outcome (success/fail/blocked/forbidden/critical)
// 전투 중 도주 버튼 발동 시 결과별 narrative.
// ════════════════════════════════════════════════════════════════

export type EscapeOutcome = 'success' | 'fail' | 'blocked' | 'forbidden' | 'critical';

export interface EscapeNarrative {
  outcome: EscapeOutcome;
  label: string;
  /** 결과 anchor */
  resultLine: string;
  /** 페널티 hint — 도주에 따른 비용 */
  penaltyHint: string;
}

export const SCENARIO_ESCAPE_NARRATIVES: readonly EscapeNarrative[] = [
  {
    outcome: 'success',
    label: '도주 성공',
    resultLine: '— 호흡을 다잡고 풍경을 한 발 물러섭니다. 적의 시야에서 벗어났습니다.',
    penaltyHint: '획득 경험치 없음, 사망 페널티 회피. 다음 전투 ATB 시작값 +20%.',
  },
  {
    outcome: 'fail',
    label: '도주 실패',
    resultLine: '— 발걸음이 묶이고 적의 시선이 다시 꽂힙니다.',
    penaltyHint: '적의 다음 행동 우선권 +1, 1턴 동안 회피 -10%.',
  },
  {
    outcome: 'blocked',
    label: '도주 차단',
    resultLine: '— 지형이 가로막혀 물러설 자리가 없습니다.',
    penaltyHint: '도주 시도 자체 차단. 적의 모든 cooldown -1턴 누적.',
  },
  {
    outcome: 'forbidden',
    label: '도주 불가',
    resultLine: '— 봉인된 결의 무게가 발걸음을 잡습니다 — 보스전 / 시나리오 전투는 도주 불가.',
    penaltyHint: '시도 자체 불가. 빌드를 재구성하고 정면 돌파하세요.',
  },
  {
    outcome: 'critical',
    label: '비상 도주',
    resultLine: '— 동료 1명이 후방을 막아주는 사이 가까스로 풍경을 벗어났습니다.',
    penaltyHint: '동료 1명 일시 이탈 (3 전투 동안). 다음 전투 ATB 페널티 -25%.',
  },
];

export function getEscapeNarrative(outcome: EscapeOutcome): EscapeNarrative | undefined {
  return SCENARIO_ESCAPE_NARRATIVES.find((e) => e.outcome === outcome);
}

export function listEscapeOutcomes(): readonly EscapeOutcome[] {
  return ['success', 'fail', 'blocked', 'forbidden', 'critical'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-141: 상태이상 카테고리 narrative — 5 카테고리 (buff/debuff/control/dot/special)
// 상태이상 아이콘 UI 그룹화 + 색상/우선순위 + 일반 설명.
// ════════════════════════════════════════════════════════════════

export type StatusEffectCategory = 'buff' | 'debuff' | 'control' | 'dot' | 'special';

export interface StatusEffectCategoryNarrative {
  category: StatusEffectCategory;
  label: string;
  uiColor: string;
  /** UI 표시 우선순위 (낮을수록 먼저) */
  displayPriority: number;
  /** 카테고리 설명 */
  description: string;
}

export const SCENARIO_STATUS_EFFECT_CATEGORIES: readonly StatusEffectCategoryNarrative[] = [
  {
    category: 'buff',
    label: '강화',
    uiColor: '#60c060',
    displayPriority: 1,
    description: '아군 능력치 / 행동 패턴이 향상된 상태. 잎새 색 테두리로 표시.',
  },
  {
    category: 'debuff',
    label: '약화',
    uiColor: '#d09040',
    displayPriority: 2,
    description: '적/아군 능력치가 일정 시간 감소한 상태. 모래 색 테두리.',
  },
  {
    category: 'control',
    label: '행동 제어',
    uiColor: '#d04040',
    displayPriority: 3,
    description: '기절/속박/혼란 등 행동 자체가 제한된 상태. 붉은 테두리 + 우선 표시.',
  },
  {
    category: 'dot',
    label: '지속 피해',
    uiColor: '#bf5fff',
    displayPriority: 4,
    description: 'poison / burn / bleed 등 일정 시간마다 피해가 누적되는 상태.',
  },
  {
    category: 'special',
    label: '특수',
    uiColor: '#40b0e0',
    displayPriority: 5,
    description: '시간 정지, 부활 대기, 봉인 응답 등 시나리오 전용 효과.',
  },
];

export function getStatusEffectCategoryNarrative(
  category: StatusEffectCategory,
): StatusEffectCategoryNarrative | undefined {
  return SCENARIO_STATUS_EFFECT_CATEGORIES.find((c) => c.category === category);
}

export function listStatusEffectCategoriesByPriority(): readonly StatusEffectCategoryNarrative[] {
  return [...SCENARIO_STATUS_EFFECT_CATEGORIES].sort((a, b) => a.displayPriority - b.displayPriority);
}

// ════════════════════════════════════════════════════════════════
// SYNC-142: 전투 popup 결과 라벨 — 7 종 (Phase 54 B chapter 가시화 popup 확장)
// 클라 popup 시스템에 표시되는 전투 결과 라벨 + 색상 + 우선순위.
// ════════════════════════════════════════════════════════════════

export type CombatResultKind =
  | 'hit' | 'miss' | 'crit' | 'reflect' | 'evade' | 'combo' | 'crit_echo';

export interface CombatResultLabel {
  kind: CombatResultKind;
  label: string;
  /** popup 색상 hex */
  popupColor: string;
  /** popup 표시 우선순위 (낮을수록 먼저) */
  displayPriority: number;
  /** popup 아이콘 (이모지 / 심볼) */
  icon: string;
}

export const SCENARIO_COMBAT_RESULT_LABELS: readonly CombatResultLabel[] = [
  { kind: 'hit',       label: 'HIT',      popupColor: '#ffffff', displayPriority: 5, icon: '' },
  { kind: 'miss',      label: 'MISS',     popupColor: '#bfbfbf', displayPriority: 3, icon: '✗' },
  { kind: 'crit',      label: 'CRIT',     popupColor: '#ffb720', displayPriority: 2, icon: '!' },
  { kind: 'reflect',   label: 'REFLECT',  popupColor: '#5f9fff', displayPriority: 4, icon: '🛡' },
  { kind: 'evade',     label: 'EVADE',    popupColor: '#a0a0a0', displayPriority: 3, icon: '~' },
  { kind: 'combo',     label: 'COMBO',    popupColor: '#ff6b40', displayPriority: 1, icon: '⚡' },
  { kind: 'crit_echo', label: 'CRIT ECHO', popupColor: '#bf5fff', displayPriority: 2, icon: '✨' },
];

export function getCombatResultLabel(kind: CombatResultKind): CombatResultLabel | undefined {
  return SCENARIO_COMBAT_RESULT_LABELS.find((r) => r.kind === kind);
}

export function listCombatResultsByPriority(): readonly CombatResultLabel[] {
  return [...SCENARIO_COMBAT_RESULT_LABELS].sort((a, b) => a.displayPriority - b.displayPriority);
}

// ════════════════════════════════════════════════════════════════
// SYNC-143: NG+ 모디파이어 narrative — 5 영역 (회차/난이도/동료/적/보상)
// SCENARIO_NEW_GAME_PLUS (sync-98) 의 mechanic 보강.
// ════════════════════════════════════════════════════════════════

export type NgPlusModifierKey =
  | 'cycle_tier' | 'difficulty_carry' | 'companion_loyalty_carry' | 'enemy_amplify' | 'reward_multiplier';

export interface NgPlusModifier {
  key: NgPlusModifierKey;
  label: string;
  /** 적용 수식 (한 줄) */
  formulaSummary: string;
  /** flavor 설명 */
  flavor: string;
}

export const SCENARIO_NEW_GAME_PLUS_MODIFIERS: readonly NgPlusModifier[] = [
  {
    key: 'cycle_tier',
    label: '회차 단계',
    formulaSummary: 'NG+1 / NG+2 / NG+3 / ... 회차마다 1씩 상승',
    flavor: '— 회차가 누적될수록 모든 modifier 가 함께 강화됩니다.',
  },
  {
    key: 'difficulty_carry',
    label: '난이도 인계',
    formulaSummary: '전 회차 난이도 ≥ Hard → NG+ 시작 시 같은 난이도 잠금',
    flavor: '— 도전 의지를 다음 회차로 가져가는 결.',
  },
  {
    key: 'companion_loyalty_carry',
    label: '동료 신뢰도 인계',
    formulaSummary: '엔딩 시점 신뢰도 × 30% 가 NG+ 시작값으로 인계',
    flavor: '— 한 회차의 신뢰는 다음 회차의 첫 호흡에 닿습니다.',
  },
  {
    key: 'enemy_amplify',
    label: '적 강화',
    formulaSummary: '적 HP × (1 + 0.2 × cycle_tier), 적 패시브 +0.5 단계',
    flavor: '— 회차가 깊어질수록 적의 결도 한 단 단단해집니다.',
  },
  {
    key: 'reward_multiplier',
    label: '보상 배율',
    formulaSummary: '획득 경험치 / 자원 × (1 + 0.1 × cycle_tier)',
    flavor: '— 회차의 무게는 보상의 무게로 돌아옵니다.',
  },
];

export function getNgPlusModifier(key: NgPlusModifierKey): NgPlusModifier | undefined {
  return SCENARIO_NEW_GAME_PLUS_MODIFIERS.find((m) => m.key === key);
}

export function listNgPlusModifierKeys(): readonly NgPlusModifierKey[] {
  return ['cycle_tier', 'difficulty_carry', 'companion_loyalty_carry', 'enemy_amplify', 'reward_multiplier'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-144: 아이템 등급별 드롭율 narrative — 5 등급 (ITEM_RARITY 와 cross)
// 일반 적/엘리트 적/보스 기준 baseline drop rate.
// ════════════════════════════════════════════════════════════════

export interface LootTierDropRate {
  rarity: ItemRarity;
  /** 일반 적 baseline drop rate (0~1) */
  normalDropRate: number;
  /** 엘리트 적 baseline drop rate */
  eliteDropRate: number;
  /** 보스 baseline drop rate */
  bossDropRate: number;
  /** flavor narrative */
  flavor: string;
}

export const SCENARIO_LOOT_TIER_DROP_RATES: readonly LootTierDropRate[] = [
  {
    rarity: 'common',
    normalDropRate: 0.5,
    eliteDropRate: 0.7,
    bossDropRate: 1.0,
    flavor: '— 어느 적이든 떨굴 수 있는 결의 자원.',
  },
  {
    rarity: 'uncommon',
    normalDropRate: 0.15,
    eliteDropRate: 0.35,
    bossDropRate: 0.8,
    flavor: '— 일반 적 6~7명 처치 당 1개 정도 — 보급 단계의 핵심.',
  },
  {
    rarity: 'rare',
    normalDropRate: 0.03,
    eliteDropRate: 0.12,
    bossDropRate: 0.5,
    flavor: '— 엘리트 적 8명 처치 당 1개 정도 — zone 한정 자원.',
  },
  {
    rarity: 'epic',
    normalDropRate: 0.005,
    eliteDropRate: 0.03,
    bossDropRate: 0.25,
    flavor: '— 보스 4회 처치 당 1개 정도 — 빌드 분기점.',
  },
  {
    rarity: 'legendary',
    normalDropRate: 0,
    eliteDropRate: 0.001,
    bossDropRate: 0.05,
    flavor: '— 보스 20회 처치 당 1개 정도 — 신화 자원.',
  },
];

export function getLootTierDropRate(rarity: ItemRarity): LootTierDropRate | undefined {
  return SCENARIO_LOOT_TIER_DROP_RATES.find((d) => d.rarity === rarity);
}

export function getExpectedDropRate(
  rarity: ItemRarity,
  enemyKind: 'normal' | 'elite' | 'boss',
): number {
  const tier = getLootTierDropRate(rarity);
  if (!tier) return 0;
  if (enemyKind === 'normal') return tier.normalDropRate;
  if (enemyKind === 'elite') return tier.eliteDropRate;
  return tier.bossDropRate;
}

// ════════════════════════════════════════════════════════════════
// SYNC-145: 🎯 도전과제 tier narrative — bronze/silver/gold/platinum 4 tier
// SCENARIO_ACHIEVEMENTS 와 cross. UI 색상 + tier label + 획득 anchor.
// ════════════════════════════════════════════════════════════════

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AchievementTierNarrative {
  tier: AchievementTier;
  label: string;
  uiColor: string;
  /** 획득 시 화면 표시 anchor */
  unlockAnchor: string;
  /** 일반 획득 비율 hint */
  prevalenceHint: string;
}

export const SCENARIO_ACHIEVEMENT_TIER_NARRATIVES: readonly AchievementTierNarrative[] = [
  {
    tier: 'bronze',
    label: '청동',
    uiColor: '#a07040',
    unlockAnchor: '— 청동 도전과제가 잠금 해제됩니다.',
    prevalenceHint: '진행 도중 자연스럽게 ~70% 플레이어가 획득.',
  },
  {
    tier: 'silver',
    label: '은',
    uiColor: '#bfbfbf',
    unlockAnchor: '— 은 도전과제가 잠금 해제됩니다.',
    prevalenceHint: '의도된 빌드/탐색 시 ~40% 플레이어가 획득.',
  },
  {
    tier: 'gold',
    label: '금',
    uiColor: '#ffb720',
    unlockAnchor: '— 금 도전과제가 잠금 해제됩니다.',
    prevalenceHint: 'A 엔딩 / 동료 전원 생존 라인의 ~15% 플레이어가 획득.',
  },
  {
    tier: 'platinum',
    label: '백금',
    uiColor: '#e0e0ff',
    unlockAnchor: '— 백금 도전과제가 잠금 해제됩니다 — 화면 한가운데 빛이 잠시 머뭅니다.',
    prevalenceHint: 'Nightmare 난이도 + NG+3 이상 + 모든 도메인 클리어. ~1% 미만.',
  },
];

export function getAchievementTierNarrative(tier: AchievementTier): AchievementTierNarrative | undefined {
  return SCENARIO_ACHIEVEMENT_TIER_NARRATIVES.find((t) => t.tier === tier);
}

export function listAchievementTiersAscending(): readonly AchievementTier[] {
  return ['bronze', 'silver', 'gold', 'platinum'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-146: 시간 이동 narrative — 4 destination (past/present/future/rift)
// 시간 수호자 클래스 + chronoField 시스템과 연결되는 narrative.
// ════════════════════════════════════════════════════════════════

export type TimeTravelDestination = 'past' | 'present' | 'future' | 'rift';

export interface TimeTravelNarrative {
  destination: TimeTravelDestination;
  label: string;
  /** 진입 anchor */
  arrivalLine: string;
  /** 위험도 hint */
  riskHint: string;
  /** flavor */
  flavor: string;
}

export const SCENARIO_TIME_TRAVEL_NARRATIVES: readonly TimeTravelNarrative[] = [
  {
    destination: 'past',
    label: '과거',
    arrivalLine: '— 발걸음이 한 시대 뒤로 미끄러져 들어옵니다. 풍경이 한 톤 색바랜 결을 띱니다.',
    riskHint: '시간 흐름 안정. 회수 가능한 단서 다수, 행동의 결과가 현재로 반영됨.',
    flavor: '— 카일의 전생이 호흡하던 시간의 결.',
  },
  {
    destination: 'present',
    label: '현재',
    arrivalLine: '— 풍경이 본래의 결로 되돌아옵니다. 시간 흐름이 일상의 속도로 흐릅니다.',
    riskHint: '시간 안정. 모든 상호작용이 표준 modifier 로 작동.',
    flavor: '— 에리언이 지금 호흡하는 시간의 결.',
  },
  {
    destination: 'future',
    label: '미래',
    arrivalLine: '— 풍경이 한 시대 앞으로 흐려집니다. 색이 옅고 형태의 가장자리가 떨립니다.',
    riskHint: '시간 흐름 불안정. 일부 NPC 부재, 분기에 따라 풍경 자체가 다름.',
    flavor: '— 4 파편의 결정이 부르는 가능성의 결.',
  },
  {
    destination: 'rift',
    label: '균열',
    arrivalLine: '— 시간이 일그러진 자리 — 모든 결이 한꺼번에 겹쳐집니다.',
    riskHint: '시간 흐름 매우 불안정. ATB 페널티, 시간 수호자 보스 등장 가능.',
    flavor: '— 레테의 망각이 시간을 비틀어 만든 결.',
  },
];

export function getTimeTravelNarrative(destination: TimeTravelDestination): TimeTravelNarrative | undefined {
  return SCENARIO_TIME_TRAVEL_NARRATIVES.find((t) => t.destination === destination);
}

export function listTimeTravelDestinations(): readonly TimeTravelDestination[] {
  return ['past', 'present', 'future', 'rift'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-147: 지도 범례 narrative — 7 entry (zone/quest_npc/boss/treasure/save_point/fast_travel/danger)
// 월드맵 / 미니맵 UI 의 아이콘 범례 설명.
// ════════════════════════════════════════════════════════════════

export type MapLegendKind =
  | 'zone_marker' | 'quest_npc' | 'boss' | 'treasure'
  | 'save_point' | 'fast_travel' | 'danger_zone';

export interface MapLegendEntry {
  kind: MapLegendKind;
  label: string;
  /** 아이콘 (이모지 / 심볼) */
  icon: string;
  /** 범례 설명 */
  description: string;
}

export const SCENARIO_MAP_LEGEND_ENTRIES: readonly MapLegendEntry[] = [
  { kind: 'zone_marker', label: '지역 마커', icon: '◉', description: '주요 zone 의 중심 위치를 표시합니다.' },
  { kind: 'quest_npc',   label: '퀘스트 NPC', icon: '!', description: '의뢰 가능한 NPC 위치 — 메인/서브 quest 진입점.' },
  { kind: 'boss',        label: '보스',     icon: '☠', description: '보스 등장 위치 — 진입 전 빌드 점검 권장.' },
  { kind: 'treasure',    label: '보물',     icon: '◆', description: '미확인 보물 상자 위치 — 등급별로 색이 다릅니다.' },
  { kind: 'save_point',  label: '저장점',   icon: '✚', description: '수동 저장 가능한 지점 — 보스 직전엔 반드시 활용.' },
  { kind: 'fast_travel', label: '빠른 이동', icon: '⇄', description: '이미 발견한 fast travel hub — 클릭으로 즉시 이동.' },
  { kind: 'danger_zone', label: '위험 구역', icon: '⚠', description: '레벨이 부족한 영역 — 진입 시 적이 강화됩니다.' },
];

export function getMapLegendEntry(kind: MapLegendKind): MapLegendEntry | undefined {
  return SCENARIO_MAP_LEGEND_ENTRIES.find((e) => e.kind === kind);
}

export function listMapLegendKinds(): readonly MapLegendKind[] {
  return ['zone_marker', 'quest_npc', 'boss', 'treasure', 'save_point', 'fast_travel', 'danger_zone'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-148: 퀵슬롯 hint narrative — 4 슬롯 (heal/attack/defense/special)
// 인벤토리 quick slot 의 권장 카테고리 + 단축키 + 사용 anchor.
// ════════════════════════════════════════════════════════════════

export type QuickslotCategory = 'heal' | 'attack' | 'defense' | 'special';

export interface QuickslotHint {
  slotIndex: 1 | 2 | 3 | 4;
  category: QuickslotCategory;
  label: string;
  /** 키보드 단축키 */
  shortcutKey: string;
  /** 권장 등록 아이템 anchor */
  recommendedItemAnchor: string;
}

export const SCENARIO_QUICKSLOT_HINTS: readonly QuickslotHint[] = [
  { slotIndex: 1, category: 'heal',    label: '회복',     shortcutKey: '1', recommendedItemAnchor: '회복 물자 (포션 / 기억 결정) — 전투 중 HP 위급 시 즉시 사용.' },
  { slotIndex: 2, category: 'attack',  label: '공격',     shortcutKey: '2', recommendedItemAnchor: '광역 폭탄 / 화염 병 — 다수 적 진입 시 첫 turn 광역 데미지.' },
  { slotIndex: 3, category: 'defense', label: '방어',     shortcutKey: '3', recommendedItemAnchor: '방어 토템 / 일시 보호막 — 보스 광역 공격 직전 발동.' },
  { slotIndex: 4, category: 'special', label: '특수',     shortcutKey: '4', recommendedItemAnchor: '시간 결정 / 봉인 부적 — 시나리오 분기 진입 시 사용.' },
];

export function getQuickslotHint(slotIndex: 1 | 2 | 3 | 4): QuickslotHint | undefined {
  return SCENARIO_QUICKSLOT_HINTS.find((q) => q.slotIndex === slotIndex);
}

export function listQuickslotCategories(): readonly QuickslotCategory[] {
  return ['heal', 'attack', 'defense', 'special'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-149: 파티 역할 narrative — 4 역할 (lead/support/healer/scout)
// 파티 구성 UI 의 슬롯 역할 + 추천 클래스 anchor.
// ════════════════════════════════════════════════════════════════

export type PartyRole = 'lead' | 'support' | 'healer' | 'scout';

export interface PartyRoleLabel {
  role: PartyRole;
  label: string;
  /** 역할 설명 */
  description: string;
  /** 추천 클래스 (ClassKey 목록) */
  recommendedClasses: readonly ClassKey[];
}

export const SCENARIO_PARTY_ROLE_LABELS: readonly PartyRoleLabel[] = [
  {
    role: 'lead',
    label: '리더 / 탱커',
    description: '전투 최전방에서 적의 시선을 끌고 일격의 무게를 받아냅니다.',
    recommendedClasses: ['ether_knight', 'memory_destroyer'],
  },
  {
    role: 'support',
    label: '서포터',
    description: '버프 / 디버프 / ATB 조작으로 파티 전체의 결을 조율합니다.',
    recommendedClasses: ['time_guardian', 'shadow_weaver'],
  },
  {
    role: 'healer',
    label: '힐러',
    description: '회복과 디버프 해제로 파티 지속력을 유지합니다.',
    recommendedClasses: ['memorist'],
  },
  {
    role: 'scout',
    label: '정찰',
    description: '회피와 분단으로 위협을 우회하고 적 패턴을 흔듭니다.',
    recommendedClasses: ['void_wanderer', 'shadow_weaver'],
  },
];

export function getPartyRoleLabel(role: PartyRole): PartyRoleLabel | undefined {
  return SCENARIO_PARTY_ROLE_LABELS.find((r) => r.role === role);
}

export function listPartyRoles(): readonly PartyRole[] {
  return ['lead', 'support', 'healer', 'scout'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-150: 🎯🎯🎯 진행률 milestone narrative — 5 milestone (0/25/50/75/100%)
// 게임 전체 진행률 도달 시 화면 anchor — 챕터 별 큰 marker.
// ════════════════════════════════════════════════════════════════

export interface CompletionPercentNarrative {
  /** 진행률 % (0/25/50/75/100) */
  percent: 0 | 25 | 50 | 75 | 100;
  /** milestone 라벨 */
  label: string;
  /** 도달 anchor */
  anchorLine: string;
  /** 추천 다음 행동 */
  recommendedAction: string;
}

export const SCENARIO_COMPLETION_PERCENT_NARRATIVES: readonly CompletionPercentNarrative[] = [
  {
    percent: 0,
    label: '여정의 첫 호흡',
    anchorLine: '— 칸텔라의 새벽이 첫 발자국을 남깁니다. 무엇이든 가능한 결입니다.',
    recommendedAction: '메인 quest MQ_CH01 진입 — 에레보스 폐허로 향하세요.',
  },
  {
    percent: 25,
    label: '첫 파편의 무게',
    anchorLine: '— 한 그릇이 채워졌습니다. 다음 결이 잎새 사이에서 부르고 있습니다.',
    recommendedAction: '실반헤임 외교 분기 진입 — 엘파리스 안내인을 만나세요.',
  },
  {
    percent: 50,
    label: '반환점의 결',
    anchorLine: '— 두 그릇이 채워졌습니다. 길의 반환점에서 호흡을 다잡습니다.',
    recommendedAction: '솔라리스 라와르 봉인 조사 — 이그나의 합류가 가까워졌습니다.',
  },
  {
    percent: 75,
    label: '잿빛 침묵의 결',
    anchorLine: '— 세 그릇이 채워졌습니다. 마지막 파편이 황궁 깊은 곳에서 응답합니다.',
    recommendedAction: '아르겐티움 잠입 동선 진입 — 동료 분기 신뢰도 점검.',
  },
  {
    percent: 100,
    label: '여정의 매듭',
    anchorLine: '— 네 그릇이 마지막 빛으로 응결됩니다. 엔딩 분기가 결정되는 순간입니다.',
    recommendedAction: '황금 에테르 탑 최상층 — 레테 5 페이즈 대전 진입.',
  },
];

export function getCompletionPercentNarrative(percent: 0 | 25 | 50 | 75 | 100): CompletionPercentNarrative | undefined {
  return SCENARIO_COMPLETION_PERCENT_NARRATIVES.find((c) => c.percent === percent);
}

export function getCompletionPercentByValue(percent: number): CompletionPercentNarrative {
  const ascending = [...SCENARIO_COMPLETION_PERCENT_NARRATIVES].sort((a, b) => a.percent - b.percent);
  let current = ascending[0];
  for (const c of ascending) {
    if (percent >= c.percent) {
      current = c;
    }
  }
  return current;
}

// ════════════════════════════════════════════════════════════════
// SYNC-151: 보스 페이즈 전이 narrative — phases 보유 보스 3 (malatus 3 + rawar 3 + lethe 5) = 11 전이
// 각 보스 페이즈 진입 시 화면 표시되는 전이 anchor + 패턴 hint.
// SCENARIO_BOSSES.phases 와 cross-validate.
// ════════════════════════════════════════════════════════════════

export interface BossPhaseTransition {
  /** SCENARIO_BOSSES.obsidianId 와 매칭 */
  bossObsidianId: string;
  /** 페이즈 번호 (1-indexed) */
  phaseNumber: number;
  /** 페이즈 라벨 */
  phaseLabel: string;
  /** 전이 anchor — 페이즈 시작 시 표시 */
  transitionAnchor: string;
  /** 패턴 hint — 이 페이즈의 핵심 패턴 */
  patternHint: string;
}

export const SCENARIO_BOSS_PHASE_TRANSITIONS: readonly BossPhaseTransition[] = [
  // malatus_ancient — 3 페이즈
  { bossObsidianId: 'malatus_ancient', phaseNumber: 1, phaseLabel: '잎새의 결',
    transitionAnchor: '— 말라투스의 잎새가 옅은 빛으로 떨립니다.',
    patternHint: '단일 대상 흡수 공격. 회피 우선, 회복 1턴 여유 확보.' },
  { bossObsidianId: 'malatus_ancient', phaseNumber: 2, phaseLabel: '뿌리의 결',
    transitionAnchor: '— 잎새의 빛이 짙은 초록으로 가라앉으며 뿌리가 솟구칩니다.',
    patternHint: '광역 뿌리 공격. 후열 배치 + 광역 회복 준비.' },
  { bossObsidianId: 'malatus_ancient', phaseNumber: 3, phaseLabel: '봉인의 결',
    transitionAnchor: '— 잎새와 뿌리가 동시에 황금빛으로 응결됩니다.',
    patternHint: '봉인 의식 발동. 단일 폭딜로 응결 시간 단축 필요.' },
  // rawar — 3 페이즈
  { bossObsidianId: 'rawar', phaseNumber: 1, phaseLabel: '깨어남',
    transitionAnchor: '— 라와르가 영원한 수면에서 천천히 눈을 뜹니다.',
    patternHint: '느린 단일 강타. 회피 + 카운터 빌드 유리.' },
  { bossObsidianId: 'rawar', phaseNumber: 2, phaseLabel: '의식의 결',
    transitionAnchor: '— 모래 폭풍이 라와르를 두르며 봉인 의식이 시작됩니다.',
    patternHint: '광역 모래 공격 + 회복 봉쇄. 디버프 해제 + 광역 방어.' },
  { bossObsidianId: 'rawar', phaseNumber: 3, phaseLabel: '왕의 자기희생',
    transitionAnchor: '— 라와르가 자기희생 의식으로 마지막 결을 풀어냅니다.',
    patternHint: '극한 단발 폭딜. 단일 회복 + 부활 패시브 준비.' },
  // lethe — 5 페이즈
  { bossObsidianId: 'lethe', phaseNumber: 1, phaseLabel: '강림',
    transitionAnchor: '— 거대한 눈들의 집합체가 처음으로 시야를 가둡니다.',
    patternHint: '4 파편 첫 공명으로 시야 가림 해제 가능. 단일 폭딜.' },
  { bossObsidianId: 'lethe', phaseNumber: 2, phaseLabel: '망각의 폭풍',
    transitionAnchor: '— 시야가 다시 좁아지며 풍경의 결이 흐려집니다.',
    patternHint: '광역 디버프. 디버프 해제 + 후열 회복 빌드.' },
  { bossObsidianId: 'lethe', phaseNumber: 3, phaseLabel: '시간의 비틈',
    transitionAnchor: '— ATB 게이지가 일그러지며 행동 순서가 뒤집힙니다.',
    patternHint: '시간 수호자 reverse 카운터 + auto_resurrect 패시브.' },
  { bossObsidianId: 'lethe', phaseNumber: 4, phaseLabel: '봉인의 균열',
    transitionAnchor: '— 거대한 눈들이 하나씩 깨지며 봉인이 흔들립니다.',
    patternHint: '집중 폭딜 구간. crit_echo + 콤보 빌드로 4 파편 동시 공명.' },
  { bossObsidianId: 'lethe', phaseNumber: 5, phaseLabel: '마지막 호흡',
    transitionAnchor: '— 모든 결이 응결되며 망각의 신이 마지막 빛으로 사라집니다.',
    patternHint: '엔딩 분기 결정 구간. 전원 생존 유지 필수.' },
];

export function getBossPhaseTransition(
  bossObsidianId: string,
  phaseNumber: number,
): BossPhaseTransition | undefined {
  return SCENARIO_BOSS_PHASE_TRANSITIONS.find(
    (t) => t.bossObsidianId === bossObsidianId && t.phaseNumber === phaseNumber,
  );
}

export function listBossPhaseTransitions(bossObsidianId: string): readonly BossPhaseTransition[] {
  return SCENARIO_BOSS_PHASE_TRANSITIONS.filter((t) => t.bossObsidianId === bossObsidianId);
}

// ════════════════════════════════════════════════════════════════
// SYNC-152: 저장 파일 메타데이터 label SSOT — 6 라벨
// 저장 슬롯 UI 에 표시되는 메타데이터 항목 + format hint.
// ════════════════════════════════════════════════════════════════

export type SaveMetadataKey = 'slot_name' | 'chapter' | 'playtime' | 'last_zone' | 'last_action' | 'difficulty';

export interface SaveFileMetadataLabel {
  key: SaveMetadataKey;
  label: string;
  /** UI sort 순서 */
  sortOrder: number;
  /** 값 format hint */
  formatHint: string;
}

export const SCENARIO_SAVE_FILE_METADATA_LABELS: readonly SaveFileMetadataLabel[] = [
  { key: 'slot_name',  label: '슬롯 이름',     sortOrder: 1, formatHint: '플레이어가 지정한 슬롯 이름 (기본: "슬롯 N").' },
  { key: 'chapter',    label: '챕터',         sortOrder: 2, formatHint: '"Chapter N: <title>" 형식 — SCENARIO_CHAPTER_OPENING_NARRATIVES.title 사용.' },
  { key: 'playtime',   label: '플레이 시간',  sortOrder: 3, formatHint: 'HH:MM:SS 형식, 24시간 초과 시 DD일 HH:MM 표현.' },
  { key: 'last_zone',  label: '최근 지역',    sortOrder: 4, formatHint: 'SCENARIO_ZONES.name 표시 + 챕터 번호.' },
  { key: 'last_action',label: '최근 행동',    sortOrder: 5, formatHint: '"보스 처치 / 파편 회수 / 동료 합류" 등 행동 분류.' },
  { key: 'difficulty', label: '난이도',       sortOrder: 6, formatHint: 'SCENARIO_DIFFICULTY_NARRATIVES.label 표시 + 색상.' },
];

export function getSaveFileMetadataLabel(key: SaveMetadataKey): SaveFileMetadataLabel | undefined {
  return SCENARIO_SAVE_FILE_METADATA_LABELS.find((m) => m.key === key);
}

export function listSaveFileMetadataLabelsSorted(): readonly SaveFileMetadataLabel[] {
  return [...SCENARIO_SAVE_FILE_METADATA_LABELS].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ════════════════════════════════════════════════════════════════
// SYNC-153: 콤보 family narrative — Phase 54 E chapter 30 콤보를 6 family 로 분류
// ClassKey 6종 × 5 콤보 = 30 콤보의 family 별 의도.
// ════════════════════════════════════════════════════════════════

export interface ComboFamilyNarrative {
  /** ClassKey 와 동일 — 콤보 family 는 클래스 기반 분류 */
  classKey: ClassKey;
  /** family 한글 이름 */
  familyName: string;
  /** 5 콤보 공통 의도 */
  intentSummary: string;
  /** 발동 조건 hint */
  triggerHint: string;
}

export const SCENARIO_COMBO_FAMILY_NARRATIVES: readonly ComboFamilyNarrative[] = [
  {
    classKey: 'ether_knight',
    familyName: '검결 연환',
    intentSummary: '에테르 검결을 동료의 행동에 맞춰 연속 발동 — 광역 + 단일 폭딜 균형.',
    triggerHint: '에테르 기사 행동 직후 2턴 내 동료 1명 행동 시 발동.',
  },
  {
    classKey: 'memorist',
    familyName: '공명 회복',
    intentSummary: '기억술사의 공명을 매개로 파티 회복 + 디버프 해제 + ATB 가속 연쇄.',
    triggerHint: '기억술사 회복 스킬 + 동료 받는 피해 ≥ 30% 시 발동.',
  },
  {
    classKey: 'shadow_weaver',
    familyName: '그림자 직조',
    intentSummary: '그림자 직조사의 회피 무빙을 시작으로 다단 히트 + 카운터 연쇄.',
    triggerHint: '그림자 직조사 회피 성공 직후 1턴 내 동료 공격 시 발동.',
  },
  {
    classKey: 'memory_destroyer',
    familyName: '봉인 파쇄',
    intentSummary: '기억 파괴자의 일격을 매개로 봉인 파쇄 + 반격 + 위협 흡수 연쇄.',
    triggerHint: '기억 파괴자 강타 + 적 HP ≤ 50% 시 발동.',
  },
  {
    classKey: 'time_guardian',
    familyName: '시간 정지 결',
    intentSummary: '시간 수호자의 ATB 조작을 매개로 적 행동 순서 역전 + 폭딜 응축.',
    triggerHint: '시간 수호자 정지/역전 직후 2턴 내 동료 행동 시 발동.',
  },
  {
    classKey: 'void_wanderer',
    familyName: '균열 분단',
    intentSummary: '허공의 방랑자의 이동을 매개로 적 분단 + DoT 증폭 + 부활 사이클.',
    triggerHint: '허공의 방랑자 이동 직후 적 위치 분단 시 발동.',
  },
];

export function getComboFamilyNarrative(classKey: ClassKey): ComboFamilyNarrative | undefined {
  return SCENARIO_COMBO_FAMILY_NARRATIVES.find((c) => c.classKey === classKey);
}

// ════════════════════════════════════════════════════════════════
// SYNC-154: 패시브 효과 14 type 라벨 SSOT — Phase 55 S4 formatter
// client/src/skills/passiveEffectFormatter.ts 의 14 type 한글 라벨 SSOT 화.
// ════════════════════════════════════════════════════════════════

export type PassiveEffectType =
  | 'mp_regen' | 'evasion_up' | 'bonus_hit_chance' | 'low_hp_atk_up' | 'defense_up_conditional'
  | 'reflect' | 'projectile_reflect' | 'cheat_death' | 'battle_regen'
  | 'crit_echo' | 'move_damage_aura' | 'auto_resurrect' | 'poison_amplify' | 'drain_amplify';

export interface PassiveEffectLabel {
  effectType: PassiveEffectType;
  label: string;
  /** 분류: 상시 / 트리거 / 기타 */
  classification: 'constant' | 'trigger' | 'amplify';
  /** 짧은 설명 */
  description: string;
}

export const SCENARIO_PASSIVE_EFFECT_LABELS: readonly PassiveEffectLabel[] = [
  // 상시 5종 (Phase 55 S1+S2)
  { effectType: 'mp_regen',               label: 'MP 회복',         classification: 'constant', description: '턴마다 일정량 MP 자동 회복.' },
  { effectType: 'evasion_up',             label: '회피 증가',       classification: 'constant', description: '회피 확률 일정 비율 증가.' },
  { effectType: 'bonus_hit_chance',       label: '명중 보너스',     classification: 'constant', description: '명중 확률 일정 비율 증가.' },
  { effectType: 'low_hp_atk_up',          label: '저 HP 공격력',    classification: 'constant', description: 'HP 가 임계점 이하일 때 공격력 증가.' },
  { effectType: 'defense_up_conditional', label: '조건부 방어',     classification: 'constant', description: '특정 조건 (예: 전열) 충족 시 방어 증가.' },
  // 트리거 4종 (Phase 55 S3)
  { effectType: 'reflect',             label: '반사',             classification: 'trigger', description: '받은 피해의 일정 비율을 적에게 반사.' },
  { effectType: 'projectile_reflect',  label: '투사체 반사',      classification: 'trigger', description: '원거리 투사체 피해를 받기 전 반사.' },
  { effectType: 'cheat_death',         label: '죽음 회피',        classification: 'trigger', description: '치명 피해 1회 무효화 (전투당 1회).' },
  { effectType: 'battle_regen',        label: '전투 회복',        classification: 'trigger', description: '전투 중 일정 턴마다 HP 자동 회복.' },
  // 기타 4종 (Phase 55 S5~S7)
  { effectType: 'crit_echo',           label: '크리티컬 에코',    classification: 'amplify', description: '치명타 발동 시 후속 추가 피해.' },
  { effectType: 'move_damage_aura',    label: '이동 피해 오라',   classification: 'amplify', description: '이동 시 주변 적에게 지속 피해.' },
  { effectType: 'auto_resurrect',      label: '자동 부활',        classification: 'trigger', description: '사망 시 일정 시간 후 자동 부활.' },
  { effectType: 'poison_amplify',      label: '독 증폭',          classification: 'amplify', description: '시전자 측 DoT (독) 피해 증폭.' },
  { effectType: 'drain_amplify',       label: '흡혈 증폭',        classification: 'amplify', description: '시전자 측 lifesteal 효율 증폭 (deferred).' },
];

export function getPassiveEffectLabel(effectType: PassiveEffectType): PassiveEffectLabel | undefined {
  return SCENARIO_PASSIVE_EFFECT_LABELS.find((p) => p.effectType === effectType);
}

export function listPassiveEffectsByClassification(
  classification: 'constant' | 'trigger' | 'amplify',
): readonly PassiveEffectLabel[] {
  return SCENARIO_PASSIVE_EFFECT_LABELS.filter((p) => p.classification === classification);
}

// ════════════════════════════════════════════════════════════════
// SYNC-155: 🎯 튜토리얼 완료 보상 narrative — 7 step 보상 anchor
// SCENARIO_TUTORIAL_ANCHOR_LINES (sync-132) 와 1:1 매칭.
// ════════════════════════════════════════════════════════════════

export interface TutorialCompletionReward {
  /** SCENARIO_TUTORIAL_ANCHOR_LINES.step 와 1:1 매칭 */
  step: TutorialStepKey;
  /** 보상 라벨 (한글) */
  rewardLabel: string;
  /** 보상 anchor (화면 표시 라인) */
  rewardAnchor: string;
}

export const SCENARIO_TUTORIAL_COMPLETION_REWARDS: readonly TutorialCompletionReward[] = [
  { step: 'move',      rewardLabel: '이동 익숙',         rewardAnchor: '— 이동 단축키 hint 가 화면 모서리에 자리잡습니다.' },
  { step: 'atb',       rewardLabel: 'ATB 호흡',          rewardAnchor: '— ATB 게이지 100% 도달 시 빛 효과가 활성화됩니다.' },
  { step: 'skill',     rewardLabel: '빌드 첫 발걸음',    rewardAnchor: '— 스킬 슬롯 6개가 모두 등록 가능해집니다.' },
  { step: 'inventory', rewardLabel: '가방 정돈',         rewardAnchor: '— 인벤토리 자동 정렬 기능이 활성화됩니다.' },
  { step: 'quest',     rewardLabel: '퀘스트 추적',       rewardAnchor: '— 메인/서브 퀘스트 추적 UI 가 활성화됩니다.' },
  { step: 'save',      rewardLabel: '저장 습관',         rewardAnchor: '— 빠른 저장 단축키 (F5) 가 활성화됩니다.' },
  { step: 'exit',      rewardLabel: '튜토리얼 졸업',     rewardAnchor: '— 튜토리얼 도전과제 청동이 잠금 해제되었습니다.' },
];

export function getTutorialCompletionReward(step: TutorialStepKey): TutorialCompletionReward | undefined {
  return SCENARIO_TUTORIAL_COMPLETION_REWARDS.find((r) => r.step === step);
}

// ════════════════════════════════════════════════════════════════
// SYNC-156: 메인 분기 결정 narrative — 4 주요 분기 (D chapter S1~S4)
// 게임 전체에서 큰 영향을 미치는 결정 4종 + 두 갈래 결과.
// ════════════════════════════════════════════════════════════════

export type BranchDecisionId =
  | 'bernardo_trust' | 'kane_judgment' | 'elfaris_diplomacy' | 'lethe_sealing_method';

export interface BranchOption {
  /** 선택 라벨 */
  label: string;
  /** 결과 narrative */
  outcomeLine: string;
  /** 영향 받는 메트릭 hint */
  metricImpact: string;
}

export interface BranchDecisionNarrative {
  decisionId: BranchDecisionId;
  /** 결정 위치 (zone obsidianId) */
  zoneObsidianId: string;
  chapter: number;
  /** 결정의 prompt 라인 */
  promptLine: string;
  /** 두 갈래 선택지 */
  options: readonly [BranchOption, BranchOption];
}

export const SCENARIO_BRANCH_DECISIONS: readonly BranchDecisionNarrative[] = [
  {
    decisionId: 'bernardo_trust',
    zoneObsidianId: 'argentium',
    chapter: 4,
    promptLine: '— 베르나르도의 정체가 밝혀집니다. 그를 신뢰할지, 처분할지 결정해야 합니다.',
    options: [
      { label: '신뢰한다',
        outcomeLine: '베르나르도가 마지막 정보를 건넵니다. 황궁 잠입 동선이 더 깊이 열립니다.',
        metricImpact: 'companion_loyalty[benjamin_cross] +30, 황궁 우회 경로 +1' },
      { label: '처분한다',
        outcomeLine: '베르나르도의 마지막 시선이 잠시 머뭅니다. 황궁 잠입은 정공법으로만 가능합니다.',
        metricImpact: 'companion_loyalty[benjamin_cross] -100 (이탈), 황궁 정공 빌드 +1' },
    ],
  },
  {
    decisionId: 'kane_judgment',
    zoneObsidianId: 'argentium',
    chapter: 4,
    promptLine: '— 케인이 무릎을 꿇습니다. 처형할지, 봉인할지 결정해야 합니다.',
    options: [
      { label: '처형한다',
        outcomeLine: '케인의 호흡이 그림자 속으로 흩어집니다. 레테 교단의 무력 부대가 약화됩니다.',
        metricImpact: 'faction_reputation[memory_hunter] -50, 챕터 5 적 빈도 -20%' },
      { label: '봉인한다',
        outcomeLine: '케인의 봉인이 자리잡습니다. 챕터 5 에서 정보 source 로 재활용 가능.',
        metricImpact: 'faction_reputation[memory_hunter] -20, 챕터 5 단서 quest +1' },
    ],
  },
  {
    decisionId: 'elfaris_diplomacy',
    zoneObsidianId: 'silvanheim',
    chapter: 2,
    promptLine: '— 엘파리스 안내인이 외교 제안을 합니다. 받아들일지, 거절할지 결정해야 합니다.',
    options: [
      { label: '제안을 받아들인다',
        outcomeLine: '깊은 숲 안내가 동행합니다. 말라투스 봉인 조사 시 길 잃음이 차단됩니다.',
        metricImpact: 'faction_reputation[elfaris] +40, malatus 보스전 광역 데미지 -10%' },
      { label: '제안을 거절한다',
        outcomeLine: '엘파리스가 한 걸음 물러섭니다. 안내 없이 깊은 숲에 진입하면 길을 잃을 수 있습니다.',
        metricImpact: 'faction_reputation[elfaris] -20, 챕터 2 탐색 시간 +30%' },
    ],
  },
  {
    decisionId: 'lethe_sealing_method',
    zoneObsidianId: 'golden_ether_tower',
    chapter: 5,
    promptLine: '— 레테 5 페이즈 종결 — 망각을 어떻게 매듭지을지 결정해야 합니다.',
    options: [
      { label: '봉인한다 (수호)',
        outcomeLine: '레테의 결이 4 파편 안쪽으로 다시 가둬집니다. 세계는 안정되지만 망각의 위협은 잠복합니다.',
        metricImpact: '엔딩 A 분기 (전원 생존 + 4 파편 조건 시), achievement gold +1' },
      { label: '소멸시킨다 (증언)',
        outcomeLine: '레테가 흩어지며 망각이 영원히 끝납니다. 세계의 결이 거대한 균열을 남깁니다.',
        metricImpact: '엔딩 B 분기, NG+ 시작 시 균열 zone 추가 발생' },
    ],
  },
];

export function getBranchDecision(decisionId: BranchDecisionId): BranchDecisionNarrative | undefined {
  return SCENARIO_BRANCH_DECISIONS.find((d) => d.decisionId === decisionId);
}

export function listBranchDecisionsByChapter(chapter: number): readonly BranchDecisionNarrative[] {
  return SCENARIO_BRANCH_DECISIONS.filter((d) => d.chapter === chapter);
}

// ════════════════════════════════════════════════════════════════
// SYNC-157: 입력 장치 narrative — keyboard/gamepad/touch 3 종
// 입력 장치 감지 시 표시되는 hint + 권장 단축키 표기.
// ════════════════════════════════════════════════════════════════

export type InputDeviceKind = 'keyboard' | 'gamepad' | 'touch';

export interface InputDeviceNarrative {
  device: InputDeviceKind;
  label: string;
  /** 감지 anchor */
  detectionAnchor: string;
  /** 권장 사용 hint */
  recommendedHint: string;
  /** 단축키 표기 prefix (예: "WASD" / "L-stick" / "swipe") */
  shortcutPrefix: string;
}

export const SCENARIO_INPUT_DEVICE_NARRATIVES: readonly InputDeviceNarrative[] = [
  {
    device: 'keyboard',
    label: '키보드',
    detectionAnchor: '— 키보드 입력이 감지되었습니다.',
    recommendedHint: 'WASD 이동, E 상호작용, 1~4 퀵슬롯. 마우스 클릭은 보조 입력.',
    shortcutPrefix: 'WASD',
  },
  {
    device: 'gamepad',
    label: '게임패드',
    detectionAnchor: '— 게임패드가 연결되었습니다.',
    recommendedHint: 'L-stick 이동, A 상호작용, R-trigger 퀵슬롯. PC/Steam Deck 모두 동일.',
    shortcutPrefix: 'L-stick',
  },
  {
    device: 'touch',
    label: '터치',
    detectionAnchor: '— 터치 입력이 감지되었습니다.',
    recommendedHint: '가상 D-pad 이동, 화면 우측 버튼 상호작용. 모바일/태블릿 자동 활성화.',
    shortcutPrefix: 'swipe',
  },
];

export function getInputDeviceNarrative(device: InputDeviceKind): InputDeviceNarrative | undefined {
  return SCENARIO_INPUT_DEVICE_NARRATIVES.find((d) => d.device === device);
}

export function listInputDevices(): readonly InputDeviceKind[] {
  return ['keyboard', 'gamepad', 'touch'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-158: 제작 레시피 카테고리 narrative — 4 종 (weapon/armor/consumable/material)
// 제작 UI 탭 + 입력 자원 hint.
// ════════════════════════════════════════════════════════════════

export type CraftCategoryKey = 'weapon' | 'armor' | 'consumable' | 'material';

export interface CraftCategoryNarrative {
  category: CraftCategoryKey;
  label: string;
  sortOrder: number;
  /** 입력 자원 hint */
  inputHint: string;
  /** 결과물 anchor */
  outputAnchor: string;
}

export const SCENARIO_CRAFT_RECIPE_CATEGORIES: readonly CraftCategoryNarrative[] = [
  { category: 'weapon',     label: '무기',      sortOrder: 1, inputHint: 'rare 등급 이상의 결정 + uncommon 합금 + 강화 룬.', outputAnchor: '— 새 무기가 작업대에서 빛을 머금고 자리잡습니다.' },
  { category: 'armor',      label: '방어구',   sortOrder: 2, inputHint: 'uncommon 가죽/금속 + 강화 룬 + 보호 인장.', outputAnchor: '— 새 방어구의 결이 견고하게 마무리됩니다.' },
  { category: 'consumable', label: '소모품',   sortOrder: 3, inputHint: '약초 + 회복 결정 + 정제수.', outputAnchor: '— 소모품이 가방에 적절한 갯수로 분류됩니다.' },
  { category: 'material',   label: '제작 재료', sortOrder: 4, inputHint: 'common 자원 ≥ 5 + 정제 도구.', outputAnchor: '— 정제된 재료가 더 높은 등급의 입력으로 자리잡습니다.' },
];

export function getCraftCategoryNarrative(category: CraftCategoryKey): CraftCategoryNarrative | undefined {
  return SCENARIO_CRAFT_RECIPE_CATEGORIES.find((c) => c.category === category);
}

export function listCraftCategoriesSorted(): readonly CraftCategoryNarrative[] {
  return [...SCENARIO_CRAFT_RECIPE_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ════════════════════════════════════════════════════════════════
// SYNC-159: 무작위 조우 narrative — 4 종 (peaceful/normal/elite/ambush)
// 필드 이동 시 무작위 발생하는 조우 종류별 anchor + 첫 turn modifier.
// ════════════════════════════════════════════════════════════════

export type EncounterKind = 'peaceful' | 'normal' | 'elite' | 'ambush';

export interface RandomEncounterFlavor {
  kind: EncounterKind;
  label: string;
  encounterAnchor: string;
  firstTurnModifier: string;
}

export const SCENARIO_RANDOM_ENCOUNTER_FLAVORS: readonly RandomEncounterFlavor[] = [
  {
    kind: 'peaceful',
    label: '평화',
    encounterAnchor: '— 풍경이 가만히 흐릅니다. 잠시 호흡을 다잡을 자리.',
    firstTurnModifier: '전투 발생 없음. 자원 채집 / 정찰 hint 표시.',
  },
  {
    kind: 'normal',
    label: '일반',
    encounterAnchor: '— 적의 발자국이 가까이 다가옵니다.',
    firstTurnModifier: '양측 선제권 균등. 표준 ATB 시작.',
  },
  {
    kind: 'elite',
    label: '엘리트',
    encounterAnchor: '— 흐름이 한 박자 무거워집니다 — 엘리트 적의 결.',
    firstTurnModifier: '적 선제권 +10%, 보상 +30%. 회피 우선 빌드 권장.',
  },
  {
    kind: 'ambush',
    label: '기습',
    encounterAnchor: '— 시야 밖에서 무엇인가 빠르게 다가옵니다.',
    firstTurnModifier: '적이 선제 1턴, ATB 시작값 -30%. 광역 방어 / 디버프 해제 우선.',
  },
];

export function getRandomEncounterFlavor(kind: EncounterKind): RandomEncounterFlavor | undefined {
  return SCENARIO_RANDOM_ENCOUNTER_FLAVORS.find((e) => e.kind === kind);
}

export function listEncounterKinds(): readonly EncounterKind[] {
  return ['peaceful', 'normal', 'elite', 'ambush'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-160: 🎯 환경 위험 narrative — 4 종 (fire/poison/spike/cliff)
// 필드 환경 위험 진입 시 표시되는 anchor + 피해 / 회피 hint.
// ════════════════════════════════════════════════════════════════

export type EnvironmentHazardKind = 'fire' | 'poison' | 'spike' | 'cliff';

export interface EnvironmentHazardNarrative {
  kind: EnvironmentHazardKind;
  label: string;
  enterAnchor: string;
  /** 피해 형태 hint */
  damageHint: string;
  /** 회피 방법 hint */
  avoidanceHint: string;
}

export const SCENARIO_ENVIRONMENT_HAZARDS: readonly EnvironmentHazardNarrative[] = [
  {
    kind: 'fire',
    label: '불타는 지대',
    enterAnchor: '— 발 아래의 결이 뜨거워집니다. 화염의 잔재가 가시지 않은 자리.',
    damageHint: '머무는 동안 fire DoT (초당 ~5%). 솔라리스 사막 / 화염 보스 zone 빈번.',
    avoidanceHint: '화염 저항 패시브 또는 빠른 이동. 비/눈 날씨에 잠시 약화.',
  },
  {
    kind: 'poison',
    label: '독 안개',
    enterAnchor: '— 짙은 안개가 발걸음을 무겁게 합니다. 색이 옅은 보라빛.',
    damageHint: '머무는 동안 poison DoT (초당 ~3%). 안개 늪 / 심해 zone 빈번.',
    avoidanceHint: '독 저항 패시브 또는 마스크 아이템. 디버프 해제 스킬 사용 가능.',
  },
  {
    kind: 'spike',
    label: '함정 지대',
    enterAnchor: '— 발 아래에서 결이 날카롭게 솟구칩니다.',
    damageHint: '단발 피해 (현재 HP 의 ~15%) + 짧은 행동 불능.',
    avoidanceHint: '회피 패시브 또는 점프 동작. 그림자 직조사 evade 자동 활성.',
  },
  {
    kind: 'cliff',
    label: '절벽',
    enterAnchor: '— 풍경의 가장자리가 갑자기 끊어집니다. 발걸음이 멈춥니다.',
    damageHint: '추락 시 강제 이전 위치로 복귀 + HP 25% 피해.',
    avoidanceHint: '이동 전 시야 확인. 시간 수호자 reverse 로 추락 직전 1턴 되돌리기 가능.',
  },
];

export function getEnvironmentHazardNarrative(kind: EnvironmentHazardKind): EnvironmentHazardNarrative | undefined {
  return SCENARIO_ENVIRONMENT_HAZARDS.find((h) => h.kind === kind);
}

export function listEnvironmentHazardKinds(): readonly EnvironmentHazardKind[] {
  return ['fire', 'poison', 'spike', 'cliff'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-161: 길드 평판 tier narrative — 5 tier (initiate~master)
// 기억 수호자단 길드 시스템 (faction_memory_guardian 와 연결).
// ════════════════════════════════════════════════════════════════

export type GuildRank = 'initiate' | 'member' | 'veteran' | 'elder' | 'master';

export interface GuildRankNarrative {
  rank: GuildRank;
  label: string;
  /** 진입 시 anchor */
  promotionAnchor: string;
  /** 잠금 해제되는 권한 */
  unlockedPermission: string;
  /** 필요 기여도 점수 (누적 quest 완료) */
  requiredContribution: number;
}

export const SCENARIO_GUILD_RANK_NARRATIVES: readonly GuildRankNarrative[] = [
  {
    rank: 'initiate',
    label: '입회자',
    promotionAnchor: '— 기억 수호자단 입회 — 본부 출입 권한이 열립니다.',
    unlockedPermission: '본부 1층 출입, 일일 quest 1개 수주 가능.',
    requiredContribution: 0,
  },
  {
    rank: 'member',
    label: '정회원',
    promotionAnchor: '— 정회원 승급 — 동료 정찰단의 신뢰가 자리잡습니다.',
    unlockedPermission: '본부 2층 출입, 일일 quest 3개 수주, 보급 -5% 할인.',
    requiredContribution: 20,
  },
  {
    rank: 'veteran',
    label: '베테랑',
    promotionAnchor: '— 베테랑 승급 — 봉인 의식 단서 열람 권한.',
    unlockedPermission: '본부 3층 출입, 주간 raid 참여, 보급 -10%.',
    requiredContribution: 60,
  },
  {
    rank: 'elder',
    label: '원로',
    promotionAnchor: '— 원로 승급 — 카일 봉인 의식 계승자료 열람.',
    unlockedPermission: '본부 비밀 서고 출입, 동료 합류 quest 제안, 보급 -15%.',
    requiredContribution: 140,
  },
  {
    rank: 'master',
    label: '대마스터',
    promotionAnchor: '— 대마스터 승급 — 기억 수호자단의 결을 함께 짭니다.',
    unlockedPermission: '모든 권한 + NG+ 회차 인계 시 본부 시작 위치 잠금 해제.',
    requiredContribution: 300,
  },
];

export function getGuildRankNarrative(rank: GuildRank): GuildRankNarrative | undefined {
  return SCENARIO_GUILD_RANK_NARRATIVES.find((r) => r.rank === rank);
}

export function getGuildRankByContribution(contribution: number): GuildRankNarrative {
  const ascending = [...SCENARIO_GUILD_RANK_NARRATIVES].sort((a, b) => a.requiredContribution - b.requiredContribution);
  let current = ascending[0];
  for (const r of ascending) {
    if (contribution >= r.requiredContribution) {
      current = r;
    }
  }
  return current;
}

// ════════════════════════════════════════════════════════════════
// SYNC-162: 일일 quest 패턴 narrative — 4 패턴 (gather/hunt/escort/explore)
// 일일 재발생 quest 의 패턴 + 평균 보상 anchor.
// ════════════════════════════════════════════════════════════════

export type DailyQuestPattern = 'gather' | 'hunt' | 'escort' | 'explore';

export interface DailyQuestPatternNarrative {
  pattern: DailyQuestPattern;
  label: string;
  objectiveTemplate: string;
  /** 평균 보상 anchor */
  averageRewardAnchor: string;
  /** 평균 소요 시간 (분) */
  averageDurationMinutes: number;
}

export const SCENARIO_DAILY_QUEST_PATTERNS: readonly DailyQuestPatternNarrative[] = [
  {
    pattern: 'gather',
    label: '채집',
    objectiveTemplate: '{zone} 에서 {resource} {count}개 채집',
    averageRewardAnchor: '— uncommon 자원 ×3 + 기여도 +5.',
    averageDurationMinutes: 10,
  },
  {
    pattern: 'hunt',
    label: '사냥',
    objectiveTemplate: '{zone} 에서 {enemy} {count}마리 처치',
    averageRewardAnchor: '— rare 결정 ×1 + 경험치 보너스 + 기여도 +8.',
    averageDurationMinutes: 15,
  },
  {
    pattern: 'escort',
    label: '호위',
    objectiveTemplate: '{npc} 을 {from} 에서 {to} 까지 안전 호위',
    averageRewardAnchor: '— faction reputation +10 + 기여도 +12.',
    averageDurationMinutes: 20,
  },
  {
    pattern: 'explore',
    label: '탐색',
    objectiveTemplate: '{zone} 의 미발견 지점 {count} 군데 발견',
    averageRewardAnchor: '— 지도 fast travel +1 잠금 해제 + 기여도 +10.',
    averageDurationMinutes: 25,
  },
];

export function getDailyQuestPatternNarrative(pattern: DailyQuestPattern): DailyQuestPatternNarrative | undefined {
  return SCENARIO_DAILY_QUEST_PATTERNS.find((p) => p.pattern === pattern);
}

export function listDailyQuestPatterns(): readonly DailyQuestPattern[] {
  return ['gather', 'hunt', 'escort', 'explore'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-163: 보물 상자 등급 narrative — 5 tier (ITEM_RARITY 와 1:1)
// 필드 보물 상자 발견 시 등급별 anchor + 평균 보상 구성.
// ════════════════════════════════════════════════════════════════

export interface TreasureChestTier {
  rarity: ItemRarity;
  /** 상자 외관 anchor */
  chestAnchor: string;
  /** 평균 보상 구성 */
  rewardComposition: string;
}

export const SCENARIO_TREASURE_CHEST_TIERS: readonly TreasureChestTier[] = [
  {
    rarity: 'common',
    chestAnchor: '— 낡은 나무 상자가 풀숲에 반쯤 묻혀 있습니다.',
    rewardComposition: 'common 자원 ×3~5 + 소액 화폐.',
  },
  {
    rarity: 'uncommon',
    chestAnchor: '— 가죽으로 감싼 상자에 잔잔한 결이 보입니다.',
    rewardComposition: 'uncommon 자원 ×2 + common ×5 + 보조 회복품.',
  },
  {
    rarity: 'rare',
    chestAnchor: '— 푸른빛이 옅게 새어 나오는 결정 상자입니다.',
    rewardComposition: 'rare 결정 ×1 + uncommon ×3 + 스킬 트레이닝 도구.',
  },
  {
    rarity: 'epic',
    chestAnchor: '— 보랏빛 결이 응결된 영웅의 상자 — 결의 무게가 다릅니다.',
    rewardComposition: 'epic 장비 ×1 + rare ×2 + 빌드 분기 단서 1개.',
  },
  {
    rarity: 'legendary',
    chestAnchor: '— 황금빛이 화면 가장자리까지 번지는 신화의 상자입니다.',
    rewardComposition: 'legendary 자원 ×1 + epic ×2 + 메인 quest 단서 1개.',
  },
];

export function getTreasureChestTier(rarity: ItemRarity): TreasureChestTier | undefined {
  return SCENARIO_TREASURE_CHEST_TIERS.find((t) => t.rarity === rarity);
}

// ════════════════════════════════════════════════════════════════
// SYNC-164: 대화 선택 패턴 narrative — 4 종 (agree/refuse/negotiate/silent)
// NPC 대화 UI 에 표시되는 표준 선택 패턴 + UI hint.
// ════════════════════════════════════════════════════════════════

export type DialogueChoicePattern = 'agree' | 'refuse' | 'negotiate' | 'silent';

export interface DialogueChoicePatternNarrative {
  pattern: DialogueChoicePattern;
  label: string;
  uiColor: string;
  /** 평판 영향 hint */
  reputationImpact: string;
  /** 흐름 hint */
  flowHint: string;
}

export const SCENARIO_DIALOGUE_CHOICE_PATTERNS: readonly DialogueChoicePatternNarrative[] = [
  {
    pattern: 'agree',
    label: '동의한다',
    uiColor: '#60c060',
    reputationImpact: '대화 NPC faction reputation +5.',
    flowHint: '대화가 자연스럽게 다음 단계로 흐릅니다.',
  },
  {
    pattern: 'refuse',
    label: '거절한다',
    uiColor: '#d04040',
    reputationImpact: '대화 NPC faction reputation -5.',
    flowHint: '대화가 단호하게 마무리됩니다. 일부 분기는 차단될 수 있습니다.',
  },
  {
    pattern: 'negotiate',
    label: '협상한다',
    uiColor: '#ffb720',
    reputationImpact: '협상 성공 시 +3, 실패 시 -3. 캐릭터 카리스마 스탯이 영향.',
    flowHint: '추가 분기 선택지가 열리며, 보상 조정 가능.',
  },
  {
    pattern: 'silent',
    label: '침묵한다',
    uiColor: '#a0a0a0',
    reputationImpact: '평판 변동 없음.',
    flowHint: '대화 흐름이 일시 정지되며 NPC 가 추가 정보를 흘릴 수 있습니다.',
  },
];

export function getDialogueChoicePatternNarrative(pattern: DialogueChoicePattern): DialogueChoicePatternNarrative | undefined {
  return SCENARIO_DIALOGUE_CHOICE_PATTERNS.find((p) => p.pattern === pattern);
}

export function listDialogueChoicePatterns(): readonly DialogueChoicePattern[] {
  return ['agree', 'refuse', 'negotiate', 'silent'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-165: 🎯 인벤토리 정렬 옵션 narrative — 4 옵션 (rarity/name/recent/category)
// 가방 UI 정렬 옵션 + 적용 효과 hint.
// ════════════════════════════════════════════════════════════════

export type InventorySortOption = 'rarity' | 'name' | 'recent' | 'category';

export interface InventorySortOptionNarrative {
  option: InventorySortOption;
  label: string;
  /** 정렬 방향 (asc/desc 기본) */
  defaultDirection: 'asc' | 'desc';
  /** 효과 hint */
  effectHint: string;
}

export const SCENARIO_INVENTORY_SORT_OPTIONS: readonly InventorySortOptionNarrative[] = [
  {
    option: 'rarity',
    label: '등급순',
    defaultDirection: 'desc',
    effectHint: 'legendary → epic → rare → uncommon → common 순서. 고가치 자원 즉시 확인.',
  },
  {
    option: 'name',
    label: '이름순',
    defaultDirection: 'asc',
    effectHint: '한글 가나다 정렬. 특정 자원 찾기 빠름.',
  },
  {
    option: 'recent',
    label: '최근 획득순',
    defaultDirection: 'desc',
    effectHint: '최근에 가방에 들어온 자원이 위로. 직전 전투 보상 확인에 유리.',
  },
  {
    option: 'category',
    label: '카테고리순',
    defaultDirection: 'asc',
    effectHint: 'consumable / equipment / materials / quest_items / special 순서 (SHOP_CATEGORY 와 정합).',
  },
];

export function getInventorySortOptionNarrative(option: InventorySortOption): InventorySortOptionNarrative | undefined {
  return SCENARIO_INVENTORY_SORT_OPTIONS.find((o) => o.option === option);
}

export function listInventorySortOptions(): readonly InventorySortOption[] {
  return ['rarity', 'name', 'recent', 'category'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-166: HUD 컴포넌트 label SSOT — 6 컴포넌트
// HUD orchestrator 가 노출하는 컴포넌트 + 화면 위치 anchor.
// ════════════════════════════════════════════════════════════════

export type HudComponentKey =
  | 'status_bar' | 'quick_slots' | 'dialogue' | 'minimap' | 'quest_tracker' | 'notifications';

export type HudAnchor = 'top_left' | 'top_right' | 'top_center' | 'bottom_left' | 'bottom_right' | 'bottom_center';

export interface HudComponentLabel {
  key: HudComponentKey;
  label: string;
  anchor: HudAnchor;
  /** 짧은 description */
  description: string;
}

export const SCENARIO_HUD_COMPONENT_LABELS: readonly HudComponentLabel[] = [
  { key: 'status_bar',    label: '상태 바',        anchor: 'top_left',     description: 'HP / MP / ATB 게이지 + 동료 portrait.' },
  { key: 'quick_slots',   label: '퀵슬롯',         anchor: 'bottom_left',  description: '1~4 슬롯 + 단축키 hint 표시.' },
  { key: 'dialogue',      label: '대화창',         anchor: 'bottom_center', description: 'NPC 대화 + 선택지 UI. 일시정지 동안 활성.' },
  { key: 'minimap',       label: '미니맵',         anchor: 'top_right',    description: '현재 zone 의 작은 지도 + 지도 범례.' },
  { key: 'quest_tracker', label: '퀘스트 추적기',  anchor: 'top_center',   description: '진행 중 메인 quest 의 다음 목표 1줄.' },
  { key: 'notifications', label: '알림',          anchor: 'bottom_right', description: '아이템 획득 / 평판 변화 / 시스템 메시지.' },
];

export function getHudComponentLabel(key: HudComponentKey): HudComponentLabel | undefined {
  return SCENARIO_HUD_COMPONENT_LABELS.find((c) => c.key === key);
}

export function listHudComponentsByAnchor(anchor: HudAnchor): readonly HudComponentLabel[] {
  return SCENARIO_HUD_COMPONENT_LABELS.filter((c) => c.anchor === anchor);
}

// ════════════════════════════════════════════════════════════════
// SYNC-167: 카메라 모드 narrative — 3 모드 (follow/free/cinematic)
// 게임 카메라 모드별 anchor + 사용 hint + 단축키.
// ════════════════════════════════════════════════════════════════

export type CameraMode = 'follow' | 'free' | 'cinematic';

export interface CameraModeNarrative {
  mode: CameraMode;
  label: string;
  shortcutKey: string;
  /** 진입 anchor */
  enterAnchor: string;
  /** 사용 hint */
  usageHint: string;
}

export const SCENARIO_CAMERA_MODE_NARRATIVES: readonly CameraModeNarrative[] = [
  {
    mode: 'follow',
    label: '추종',
    shortcutKey: 'C',
    enterAnchor: '— 카메라가 캐릭터를 부드럽게 따라옵니다.',
    usageHint: '표준 게임 플레이 모드. 캐릭터 중심 부드러운 추적, 자동 회전.',
  },
  {
    mode: 'free',
    label: '자유',
    shortcutKey: 'V',
    enterAnchor: '— 카메라가 캐릭터에서 분리되어 자유 이동 가능합니다.',
    usageHint: '풍경 감상 / 스크린샷용. 마우스 드래그로 회전, 휠로 줌.',
  },
  {
    mode: 'cinematic',
    label: '시네마틱',
    shortcutKey: 'B',
    enterAnchor: '— 시네마틱 카메라가 결정적 순간을 부각합니다.',
    usageHint: '보스 등장 / 챕터 전환 / 엔딩 자동 활성. UI 일시 숨김.',
  },
];

export function getCameraModeNarrative(mode: CameraMode): CameraModeNarrative | undefined {
  return SCENARIO_CAMERA_MODE_NARRATIVES.find((c) => c.mode === mode);
}

export function listCameraModes(): readonly CameraMode[] {
  return ['follow', 'free', 'cinematic'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-168: 파벌 갈등 narrative — 4 conflict pair
// SCENARIO_FACTIONS 간 주요 갈등 + 플레이어 개입 hint.
// ════════════════════════════════════════════════════════════════

export interface FactionConflictNarrative {
  conflictId: string;
  /** 양측 faction obsidianId */
  factions: readonly [string, string];
  /** 갈등 anchor */
  conflictAnchor: string;
  /** 플레이어 개입 시 영향 */
  playerImpactHint: string;
}

export const SCENARIO_FACTION_CONFLICTS: readonly FactionConflictNarrative[] = [
  {
    conflictId: 'guardians_vs_hunters',
    factions: ['faction_memory_guardian', 'faction_memory_hunter'],
    conflictAnchor: '— 봉인 의식 계승자와 파편 추적자의 대립 — 가장 직접적인 적대 라인.',
    playerImpactHint: '에리언의 모든 행동이 이 갈등의 결을 흔듭니다. 중립 불가, 한쪽 편 필수.',
  },
  {
    conflictId: 'elfaris_vs_cult',
    factions: ['faction_elfaris', 'faction_lethe_cult'],
    conflictAnchor: '— 잎새의 결을 지키는 자와 망각을 부르는 자의 분리.',
    playerImpactHint: '엘파리스 외교 분기 (sync-156 BRANCH_DECISION) 와 직결. 호의 시 교단 잠입 단서 제공.',
  },
  {
    conflictId: 'empire_vs_cult_internal',
    factions: ['faction_kalimar_empire', 'faction_lethe_cult'],
    conflictAnchor: '— 제국 표면과 그 안의 교단 — 외부에선 한 몸, 안에선 갈등.',
    playerImpactHint: '잠입 동선에서 노출되는 갈등. 한쪽 정보를 다른 쪽에 흘리면 분기 무너짐.',
  },
  {
    conflictId: 'ifrita_vs_legacy_solian',
    factions: ['faction_ifrita', 'faction_solian'],
    conflictAnchor: '— 현재의 불꽃 부족과 멸망한 솔리안의 봉인 — 시간을 가르는 정체성 갈등.',
    playerImpactHint: '솔리안 유적 해석 시 이프리타 부족의 협조 필요. 라와르 봉인 단서가 양측 모두에서 필요.',
  },
];

export function getFactionConflictNarrative(conflictId: string): FactionConflictNarrative | undefined {
  return SCENARIO_FACTION_CONFLICTS.find((c) => c.conflictId === conflictId);
}

export function listFactionConflictsForFaction(factionObsidianId: string): readonly FactionConflictNarrative[] {
  return SCENARIO_FACTION_CONFLICTS.filter((c) => c.factions.includes(factionObsidianId));
}

// ════════════════════════════════════════════════════════════════
// SYNC-169: 기억 공명 유형 narrative — 4 종 (에리언의 공명 능력 표현)
// 메인 quest 진행 + zone 진입 시 발동되는 공명의 4 결.
// ════════════════════════════════════════════════════════════════

export type MemoryResonanceType = 'fragment_echo' | 'ancestral_voice' | 'dream_glimpse' | 'time_loop';

export interface MemoryResonanceNarrative {
  type: MemoryResonanceType;
  label: string;
  /** 공명 발동 anchor */
  resonanceAnchor: string;
  /** 효과 hint — 게임 mechanic */
  effectHint: string;
  /** 발동 빈도 */
  frequency: 'rare' | 'uncommon' | 'common';
}

export const SCENARIO_MEMORY_RESONANCE_TYPES: readonly MemoryResonanceNarrative[] = [
  {
    type: 'fragment_echo',
    label: '파편 에코',
    resonanceAnchor: '— 신성 기억 파편이 손바닥에서 진동하며 위치 단서를 전달합니다.',
    effectHint: 'zone 안의 신성 기억 파편 단서를 화면 가장자리에 표시.',
    frequency: 'uncommon',
  },
  {
    type: 'ancestral_voice',
    label: '선조의 목소리',
    resonanceAnchor: '— 카일의 전생이 흐릿한 목소리로 에리언의 결에 닿습니다.',
    effectHint: '메인 quest 핵심 단서 또는 봉인 의식 힌트 전달 — chapter 마다 1~2회.',
    frequency: 'rare',
  },
  {
    type: 'dream_glimpse',
    label: '꿈의 일별',
    resonanceAnchor: '— 잠시 풍경이 흐려지며 다른 시대의 결이 겹쳐 보입니다.',
    effectHint: '미래 / 과거의 zone 모습을 짧게 미리보기. lore 단서 + 분기 hint.',
    frequency: 'common',
  },
  {
    type: 'time_loop',
    label: '시간 고리',
    resonanceAnchor: '— 같은 순간의 결이 반복되며 에리언의 호흡이 두 번 겹칩니다.',
    effectHint: '직전 1턴 행동을 무효화하고 다시 선택 가능 (전투당 1회).',
    frequency: 'rare',
  },
];

export function getMemoryResonanceNarrative(type: MemoryResonanceType): MemoryResonanceNarrative | undefined {
  return SCENARIO_MEMORY_RESONANCE_TYPES.find((r) => r.type === type);
}

export function listMemoryResonancesByFrequency(
  frequency: 'rare' | 'uncommon' | 'common',
): readonly MemoryResonanceNarrative[] {
  return SCENARIO_MEMORY_RESONANCE_TYPES.filter((r) => r.frequency === frequency);
}

// ════════════════════════════════════════════════════════════════
// SYNC-170: 🎯 에테르 공명 레벨 narrative — 5 레벨 (dormant~transcendent)
// 에리언의 기억 공명 능력 레벨업 단계 + 잠금 해제 hint.
// ════════════════════════════════════════════════════════════════

export type AetherResonanceLevel = 'dormant' | 'awakening' | 'active' | 'peak' | 'transcendent';

export interface AetherResonanceLevelNarrative {
  level: AetherResonanceLevel;
  label: string;
  /** 도달 anchor */
  ascendAnchor: string;
  /** 잠금 해제되는 능력 */
  unlockedAbility: string;
  /** 필요 메인 quest milestone */
  requiredMilestone: string;
}

export const SCENARIO_AETHER_RESONANCE_LEVELS: readonly AetherResonanceLevelNarrative[] = [
  {
    level: 'dormant',
    label: '잠재',
    ascendAnchor: '— 공명의 결이 아직 잠들어 있습니다. 호흡만 가능한 단계.',
    unlockedAbility: '기본 fragment_echo 1회 발동 가능 (chapter 1 진입 직후).',
    requiredMilestone: '게임 시작',
  },
  {
    level: 'awakening',
    label: '각성',
    ascendAnchor: '— 첫 파편의 응답이 공명을 깨웁니다.',
    unlockedAbility: 'ancestral_voice 활성, dream_glimpse 1 chapter 1회.',
    requiredMilestone: 'fragment_erebos 회수 후',
  },
  {
    level: 'active',
    label: '활성',
    ascendAnchor: '— 공명이 일상의 결로 자리잡습니다. 결의 흔들림을 매번 읽습니다.',
    unlockedAbility: 'time_loop 1 전투 1회 사용 가능.',
    requiredMilestone: 'fragment_silvanheim + fragment_solaris 회수 후',
  },
  {
    level: 'peak',
    label: '정점',
    ascendAnchor: '— 4 파편의 결이 손바닥 위에서 응결되며 공명이 정점에 듭니다.',
    unlockedAbility: '모든 공명 유형 무한 사용. 시야 가림 디버프 면역.',
    requiredMilestone: '4 파편 모두 회수 후 (oblivion_plateau 진입)',
  },
  {
    level: 'transcendent',
    label: '초월',
    ascendAnchor: '— 공명이 카일의 전생을 넘어 새로운 결을 만들어냅니다.',
    unlockedAbility: '엔딩 A 분기 시 마지막 페이즈 한정 — 모든 동료 행동 +1턴.',
    requiredMilestone: '레테 phase 4 종결 + 전원 생존',
  },
];

export function getAetherResonanceLevelNarrative(level: AetherResonanceLevel): AetherResonanceLevelNarrative | undefined {
  return SCENARIO_AETHER_RESONANCE_LEVELS.find((l) => l.level === level);
}

export function listAetherResonanceLevelsAscending(): readonly AetherResonanceLevel[] {
  return ['dormant', 'awakening', 'active', 'peak', 'transcendent'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-171: 조명 프리셋 narrative — 4 프리셋 (warm/cool/dim/bright)
// zone 별 조명 분위기 결정 + 컬러 톤 hex.
// ════════════════════════════════════════════════════════════════

export type LightingPreset = 'warm' | 'cool' | 'dim' | 'bright';

export interface LightingPresetNarrative {
  preset: LightingPreset;
  label: string;
  /** 컬러 톤 hex (#rrggbb) */
  toneHex: string;
  /** 분위기 anchor */
  moodAnchor: string;
  /** 사용 권장 zone 류 */
  recommendedZoneType: string;
}

export const SCENARIO_LIGHTING_PRESETS: readonly LightingPresetNarrative[] = [
  {
    preset: 'warm',
    label: '따뜻한',
    toneHex: '#ffb060',
    moodAnchor: '— 노을이 풍경에 황금빛을 입힙니다.',
    recommendedZoneType: '솔라리스 사막 / 칸텔라 마을 / 안전 hub zone',
  },
  {
    preset: 'cool',
    label: '차가운',
    toneHex: '#5f9fff',
    moodAnchor: '— 푸른 톤이 풍경을 한 박자 가라앉힙니다.',
    recommendedZoneType: '북방 설원 / 얼음 동굴 / 안개 바다',
  },
  {
    preset: 'dim',
    label: '어두운',
    toneHex: '#404060',
    moodAnchor: '— 빛의 가장자리가 짙은 회색으로 침잠합니다.',
    recommendedZoneType: '에레보스 폐허 / 카타콤 / 심해 zone',
  },
  {
    preset: 'bright',
    label: '밝은',
    toneHex: '#f0f0e0',
    moodAnchor: '— 빛이 풍경의 모든 결을 또렷이 드러냅니다.',
    recommendedZoneType: '엘프 성소 / 황금 에테르 탑 / 신성 zone',
  },
];

export function getLightingPresetNarrative(preset: LightingPreset): LightingPresetNarrative | undefined {
  return SCENARIO_LIGHTING_PRESETS.find((p) => p.preset === preset);
}

export function listLightingPresets(): readonly LightingPreset[] {
  return ['warm', 'cool', 'dim', 'bright'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-172: zone 인구 밀도 narrative — 4 레벨 (empty/sparse/normal/crowded)
// 각 zone 의 NPC/적 밀도 + 분위기 anchor + 무작위 조우 빈도.
// ════════════════════════════════════════════════════════════════

export type ZoneDensityLevel = 'empty' | 'sparse' | 'normal' | 'crowded';

export interface ZoneDensityNarrative {
  density: ZoneDensityLevel;
  label: string;
  /** NPC 평균 갯수 (5x5 grid 기준) */
  averageNpcCount: number;
  /** 무작위 조우 발생 확률 (이동 100보당) */
  encounterRatePer100Steps: number;
  /** 분위기 anchor */
  moodAnchor: string;
}

export const SCENARIO_ZONE_DENSITY_LEVELS: readonly ZoneDensityNarrative[] = [
  {
    density: 'empty',
    label: '비어 있음',
    averageNpcCount: 0,
    encounterRatePer100Steps: 5,
    moodAnchor: '— 풍경에 발자국이 거의 없습니다. 호흡 소리만 또렷합니다.',
  },
  {
    density: 'sparse',
    label: '드문드문',
    averageNpcCount: 2,
    encounterRatePer100Steps: 15,
    moodAnchor: '— 몇몇 발자국이 멀리서 흩어집니다.',
  },
  {
    density: 'normal',
    label: '보통',
    averageNpcCount: 5,
    encounterRatePer100Steps: 25,
    moodAnchor: '— NPC 들이 자기 일을 하며 풍경에 자연스럽게 자리잡습니다.',
  },
  {
    density: 'crowded',
    label: '붐빔',
    averageNpcCount: 12,
    encounterRatePer100Steps: 40,
    moodAnchor: '— 거리의 결이 발자국과 대화로 가득 찹니다.',
  },
];

export function getZoneDensityNarrative(density: ZoneDensityLevel): ZoneDensityNarrative | undefined {
  return SCENARIO_ZONE_DENSITY_LEVELS.find((d) => d.density === density);
}

export function listZoneDensityLevels(): readonly ZoneDensityLevel[] {
  return ['empty', 'sparse', 'normal', 'crowded'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-173: NPC 순찰 패턴 narrative — 5 패턴 (stationary/circular/random/follow/scheduled)
// 필드 NPC 의 이동 패턴 + 잠입/회피 영향 hint.
// ════════════════════════════════════════════════════════════════

export type NpcPatrolPattern = 'stationary' | 'circular' | 'random' | 'follow_target' | 'scheduled';

export interface NpcPatrolPatternNarrative {
  pattern: NpcPatrolPattern;
  label: string;
  /** 패턴 설명 */
  description: string;
  /** 잠입 회피 hint */
  stealthHint: string;
  /** 적용 NPC 류 */
  applicableNpcTypes: string;
}

export const SCENARIO_NPC_PATROL_PATTERNS: readonly NpcPatrolPatternNarrative[] = [
  {
    pattern: 'stationary',
    label: '고정',
    description: '한 자리에 머물며 일정 각도로 시야만 회전.',
    stealthHint: '시야각 90도 외 사각 지대 안전. 후방 우회로 무력화 가능.',
    applicableNpcTypes: '상인 / 의뢰자 / 봉인 수호자',
  },
  {
    pattern: 'circular',
    label: '원형 순찰',
    description: '고정 경로를 일정 주기로 도는 순찰.',
    stealthHint: '주기 측정 후 사이 틈으로 이동. 모서리 정지 1턴 활용.',
    applicableNpcTypes: '경비대 / 황궁 정문 수호',
  },
  {
    pattern: 'random',
    label: '무작위 이동',
    description: '주변 3x3 grid 내 무작위 위치로 이동.',
    stealthHint: '예측 불가 — 회피 패시브 또는 그림자 직조 필요.',
    applicableNpcTypes: '야생 동물 / 정찰 무리',
  },
  {
    pattern: 'follow_target',
    label: '타겟 추적',
    description: '플레이어 발견 시 마지막 위치까지 추적.',
    stealthHint: '시야 차단 + 노이즈 우회. 일정 거리 이상 벌어지면 추적 해제.',
    applicableNpcTypes: '기억 사냥꾼 / 경계 강화 경비',
  },
  {
    pattern: 'scheduled',
    label: '스케줄 순찰',
    description: '하루 시간대 (DAY_PHASE) 기반 위치 변경.',
    stealthHint: '특정 시간대 (밤) 에 부재. 시간대 활용한 우회 가능.',
    applicableNpcTypes: '상점 NPC / 일과 NPC',
  },
];

export function getNpcPatrolPatternNarrative(pattern: NpcPatrolPattern): NpcPatrolPatternNarrative | undefined {
  return SCENARIO_NPC_PATROL_PATTERNS.find((p) => p.pattern === pattern);
}

export function listNpcPatrolPatterns(): readonly NpcPatrolPattern[] {
  return ['stationary', 'circular', 'random', 'follow_target', 'scheduled'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-174: 던전 레이아웃 패턴 narrative — 4 패턴 (linear/branching/maze/circular)
// 던전 zone 의 구조적 패턴 + 탐색 hint.
// ════════════════════════════════════════════════════════════════

export type DungeonLayoutPattern = 'linear' | 'branching' | 'maze' | 'circular';

export interface DungeonLayoutNarrative {
  pattern: DungeonLayoutPattern;
  label: string;
  /** 구조 설명 */
  structureSummary: string;
  /** 평균 클리어 시간 (분) */
  averageClearMinutes: number;
  /** 탐색 hint */
  explorationHint: string;
}

export const SCENARIO_DUNGEON_LAYOUT_PATTERNS: readonly DungeonLayoutNarrative[] = [
  {
    pattern: 'linear',
    label: '선형',
    structureSummary: '시작점 → 보스방까지 일직선 경로. 분기 없음.',
    averageClearMinutes: 15,
    explorationHint: '뒤로 돌아갈 일 없음. 자원 보급은 도중 상자 위주.',
  },
  {
    pattern: 'branching',
    label: '분기형',
    structureSummary: '메인 경로 + 2~3 선택 분기 (보물 / 보너스 / shortcut).',
    averageClearMinutes: 25,
    explorationHint: '분기 선택에 따라 보상 종류 차이. 100% 탐색은 시간 소모 큼.',
  },
  {
    pattern: 'maze',
    label: '미로',
    structureSummary: '복잡한 격자 + 막다른 길 다수. 지도 필수.',
    averageClearMinutes: 40,
    explorationHint: 'minimap 자주 확인. fragment_echo 공명 활성화 권장.',
  },
  {
    pattern: 'circular',
    label: '환형',
    structureSummary: '중앙 광장 + 외곽 회랑. 보스방은 중앙 또는 외곽 끝.',
    averageClearMinutes: 30,
    explorationHint: '중앙 광장에서 보스방 방향 결정. 외곽 한 바퀴 시 보너스 단서.',
  },
];

export function getDungeonLayoutNarrative(pattern: DungeonLayoutPattern): DungeonLayoutNarrative | undefined {
  return SCENARIO_DUNGEON_LAYOUT_PATTERNS.find((d) => d.pattern === pattern);
}

export function listDungeonLayoutPatterns(): readonly DungeonLayoutPattern[] {
  return ['linear', 'branching', 'maze', 'circular'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-175: 🎯 던전 함정 narrative — 5 종 (pressure/dart/floor/gas/seal)
// 던전 함정 발동 시 anchor + 피해 패턴 + 회피 hint.
// ════════════════════════════════════════════════════════════════

export type DungeonTrapKind = 'pressure_plate' | 'dart' | 'falling_floor' | 'poison_gas' | 'magic_seal';

export interface DungeonTrapNarrative {
  trap: DungeonTrapKind;
  label: string;
  /** 발동 anchor */
  triggerAnchor: string;
  /** 피해 형태 */
  damagePattern: string;
  /** 회피 hint */
  avoidanceHint: string;
}

export const SCENARIO_DUNGEON_TRAPS: readonly DungeonTrapNarrative[] = [
  {
    trap: 'pressure_plate',
    label: '압력판',
    triggerAnchor: '— 바닥의 결이 한 박자 가라앉습니다.',
    damagePattern: '단발 ~10% 피해 + 1턴 둔화.',
    avoidanceHint: '발판 가장자리로 우회. 시야 확인 + 인식 패시브 권장.',
  },
  {
    trap: 'dart',
    label: '독침',
    triggerAnchor: '— 벽 사이에서 짧은 휘파람 소리가 들립니다.',
    damagePattern: '단발 ~15% 피해 + poison DoT (3턴).',
    avoidanceHint: '회피 패시브 또는 빠른 이동. 독 저항 아이템.',
  },
  {
    trap: 'falling_floor',
    label: '함정 바닥',
    triggerAnchor: '— 발 아래의 결이 갑자기 꺾입니다.',
    damagePattern: '추락 ~25% 피해 + 위치 강제 이동.',
    avoidanceHint: '점프 또는 시간 수호자 reverse 1턴 활용.',
  },
  {
    trap: 'poison_gas',
    label: '독 가스',
    triggerAnchor: '— 짙은 보랏빛 기체가 천장에서 내려옵니다.',
    damagePattern: '광역 poison DoT (5턴) + 시야 -30%.',
    avoidanceHint: '광역 정화 스킬 또는 마스크 아이템. 빠른 통과.',
  },
  {
    trap: 'magic_seal',
    label: '마법 봉인',
    triggerAnchor: '— 발 밑에 룬 결정이 떠올라 빛납니다.',
    damagePattern: '광역 ~20% 피해 + 1턴 행동 불능.',
    avoidanceHint: '디버프 면역 패시브 또는 봉인 해제 스킬. 시야로 사전 확인.',
  },
];

export function getDungeonTrapNarrative(trap: DungeonTrapKind): DungeonTrapNarrative | undefined {
  return SCENARIO_DUNGEON_TRAPS.find((t) => t.trap === trap);
}

export function listDungeonTrapKinds(): readonly DungeonTrapKind[] {
  return ['pressure_plate', 'dart', 'falling_floor', 'poison_gas', 'magic_seal'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-176: 날씨 전이 체인 narrative — 5 chain (WeatherKind 간 자연 전이)
// SCENARIO_WEATHER (sync-123) 와 cross. 한 날씨 → 다음 날씨 자연 흐름 + 확률.
// ════════════════════════════════════════════════════════════════

export interface WeatherTransitionChain {
  /** WeatherKind 전이 from→to */
  from: WeatherKind;
  to: WeatherKind;
  /** 전이 확률 (0~1) */
  transitionProbability: number;
  /** 전이 anchor */
  transitionAnchor: string;
}

export const SCENARIO_WEATHER_TRANSITION_CHAINS: readonly WeatherTransitionChain[] = [
  { from: 'clear', to: 'rain',  transitionProbability: 0.2, transitionAnchor: '— 맑은 하늘에 구름이 모이며 빗방울이 떨어집니다.' },
  { from: 'rain',  to: 'storm', transitionProbability: 0.3, transitionAnchor: '— 빗줄기가 거세지며 폭풍우로 바뀝니다.' },
  { from: 'storm', to: 'rain',  transitionProbability: 0.5, transitionAnchor: '— 폭풍의 결이 가라앉으며 일반 비로 약해집니다.' },
  { from: 'rain',  to: 'fog',   transitionProbability: 0.25, transitionAnchor: '— 비가 그치며 짙은 안개가 몰려옵니다.' },
  { from: 'fog',   to: 'clear', transitionProbability: 0.4, transitionAnchor: '— 안개가 천천히 걷히며 풍경이 다시 드러납니다.' },
];

export function getWeatherTransitionChain(from: WeatherKind, to: WeatherKind): WeatherTransitionChain | undefined {
  return SCENARIO_WEATHER_TRANSITION_CHAINS.find((c) => c.from === from && c.to === to);
}

export function listWeatherTransitionsFrom(from: WeatherKind): readonly WeatherTransitionChain[] {
  return SCENARIO_WEATHER_TRANSITION_CHAINS.filter((c) => c.from === from);
}

// ════════════════════════════════════════════════════════════════
// SYNC-177: 파티 오라 효과 narrative — 5 종 (defense/offense/regen/speed/silence)
// 동료가 발산하는 광역 오라 — 인접 동료에게 modifier 부여.
// ════════════════════════════════════════════════════════════════

export type PartyAuraKind = 'defense' | 'offense' | 'regen' | 'speed' | 'silence';

export interface PartyAuraNarrative {
  aura: PartyAuraKind;
  label: string;
  /** 오라 활성 anchor */
  activationAnchor: string;
  /** 적용 modifier */
  modifierSummary: string;
  /** 시전 가능 ClassKey */
  emitterClass: ClassKey;
}

export const SCENARIO_PARTY_AURA_EFFECTS: readonly PartyAuraNarrative[] = [
  {
    aura: 'defense',
    label: '방어 오라',
    activationAnchor: '— 푸른빛이 동료들의 결을 두릅니다.',
    modifierSummary: '인접 동료 받는 피해 -15%, 1회 방패 (HP 의 5%).',
    emitterClass: 'ether_knight',
  },
  {
    aura: 'offense',
    label: '공격 오라',
    activationAnchor: '— 붉은 결이 동료들의 무기 끝에 응결됩니다.',
    modifierSummary: '인접 동료 공격력 +10%, crit 확률 +5%.',
    emitterClass: 'memory_destroyer',
  },
  {
    aura: 'regen',
    label: '회복 오라',
    activationAnchor: '— 잎새 색 결이 동료들의 호흡 위로 내립니다.',
    modifierSummary: '인접 동료 턴마다 HP +3%, MP +2%.',
    emitterClass: 'memorist',
  },
  {
    aura: 'speed',
    label: '가속 오라',
    activationAnchor: '— 시간의 결이 빠르게 흐릅니다.',
    modifierSummary: '인접 동료 ATB 충전 속도 +20%, 회피 +5%.',
    emitterClass: 'time_guardian',
  },
  {
    aura: 'silence',
    label: '침묵 오라',
    activationAnchor: '— 풍경의 결이 한 박자 가라앉으며 적의 호흡이 흐릿해집니다.',
    modifierSummary: '인접 적 디버프 해제 차단, 스킬 발동 속도 -10%.',
    emitterClass: 'shadow_weaver',
  },
];

export function getPartyAuraNarrative(aura: PartyAuraKind): PartyAuraNarrative | undefined {
  return SCENARIO_PARTY_AURA_EFFECTS.find((a) => a.aura === aura);
}

export function listPartyAurasByClass(classKey: ClassKey): readonly PartyAuraNarrative[] {
  return SCENARIO_PARTY_AURA_EFFECTS.filter((a) => a.emitterClass === classKey);
}

// ════════════════════════════════════════════════════════════════
// SYNC-178: buff 지속 시간 분류 narrative — 4 분류 (brief/short/medium/long)
// buff/debuff/aura 의 지속 시간을 4 단계로 분류.
// ════════════════════════════════════════════════════════════════

export type BuffDurationLevel = 'brief' | 'short' | 'medium' | 'long';

export interface BuffDurationLevelNarrative {
  level: BuffDurationLevel;
  label: string;
  /** 지속 턴수 범위 (inclusive) */
  minTurns: number;
  maxTurns: number;
  /** UI 표시 hint */
  uiHint: string;
}

export const SCENARIO_BUFF_DURATION_LEVELS: readonly BuffDurationLevelNarrative[] = [
  { level: 'brief',  label: '짧은',     minTurns: 1, maxTurns: 2,  uiHint: '아이콘 표시 + 깜빡임. 1~2턴 안에 효과 종료.' },
  { level: 'short',  label: '단기',     minTurns: 3, maxTurns: 5,  uiHint: '아이콘 + 남은 턴 숫자. 표준 전투 1~2 라운드.' },
  { level: 'medium', label: '중기',     minTurns: 6, maxTurns: 10, uiHint: '아이콘 + 숫자. 전투 거의 전체에 영향.' },
  { level: 'long',   label: '장기',     minTurns: 11, maxTurns: 30, uiHint: '아이콘 + 숫자 + 우선 표시. 다음 전투까지 지속 가능.' },
];

export function getBuffDurationLevelNarrative(level: BuffDurationLevel): BuffDurationLevelNarrative | undefined {
  return SCENARIO_BUFF_DURATION_LEVELS.find((d) => d.level === level);
}

export function classifyBuffDurationByTurns(turns: number): BuffDurationLevelNarrative | undefined {
  return SCENARIO_BUFF_DURATION_LEVELS.find((d) => turns >= d.minTurns && turns <= d.maxTurns);
}

// ════════════════════════════════════════════════════════════════
// SYNC-179: 제작 결과 narrative — 5 결과 (success/crit_success/failure/crit_failure/breakthrough)
// 제작 시도 후 결과별 anchor + 자원 소모/획득.
// ════════════════════════════════════════════════════════════════

export type CraftingOutcomeKind =
  | 'success' | 'crit_success' | 'failure' | 'crit_failure' | 'breakthrough';

export interface CraftingOutcomeNarrative {
  outcome: CraftingOutcomeKind;
  label: string;
  /** 발생 확률 (0~1) */
  baseProbability: number;
  /** 결과 anchor */
  outcomeAnchor: string;
  /** 자원/결과물 영향 */
  resourceImpact: string;
}

export const SCENARIO_CRAFTING_OUTCOMES: readonly CraftingOutcomeNarrative[] = [
  {
    outcome: 'success',
    label: '성공',
    baseProbability: 0.6,
    outcomeAnchor: '— 제작이 의도대로 완성됩니다.',
    resourceImpact: '입력 자원 모두 소모, 결과물 1개 표준 등급.',
  },
  {
    outcome: 'crit_success',
    label: '대성공',
    baseProbability: 0.1,
    outcomeAnchor: '— 결이 황금빛으로 빛나며 한 단계 위 등급으로 완성됩니다.',
    resourceImpact: '입력 자원 모두 소모, 결과물 1개 + 등급 +1 (예: rare → epic).',
  },
  {
    outcome: 'failure',
    label: '실패',
    baseProbability: 0.2,
    outcomeAnchor: '— 제작이 어긋나며 결과물이 만들어지지 않습니다.',
    resourceImpact: '입력 자원 50% 소모, 결과물 없음.',
  },
  {
    outcome: 'crit_failure',
    label: '대실패',
    baseProbability: 0.05,
    outcomeAnchor: '— 작업대가 튀며 자원이 모두 흩어집니다.',
    resourceImpact: '입력 자원 모두 소실, 작업대 1턴 사용 불가.',
  },
  {
    outcome: 'breakthrough',
    label: '돌파',
    baseProbability: 0.05,
    outcomeAnchor: '— 의도하지 않은 결이 깨우치며 새 레시피가 잠금 해제됩니다.',
    resourceImpact: '입력 자원 모두 소모, 결과물 1개 + 신규 레시피 1개 해금.',
  },
];

export function getCraftingOutcomeNarrative(outcome: CraftingOutcomeKind): CraftingOutcomeNarrative | undefined {
  return SCENARIO_CRAFTING_OUTCOMES.find((o) => o.outcome === outcome);
}

export function getTotalCraftingProbability(): number {
  return SCENARIO_CRAFTING_OUTCOMES.reduce((sum, o) => sum + o.baseProbability, 0);
}

// ════════════════════════════════════════════════════════════════
// SYNC-180: 🎯 NPC 직업 라벨 narrative — 6 직업
// 필드 NPC 의 직업/역할 분류. zoneSeeds role 과 연결.
// ════════════════════════════════════════════════════════════════

export type NpcOccupation = 'merchant' | 'guard' | 'healer' | 'scholar' | 'quest_giver' | 'wanderer';

export interface NpcOccupationLabel {
  occupation: NpcOccupation;
  label: string;
  /** 대화 시 일반 어조 hint */
  conversationToneHint: string;
  /** 평균 상호작용 시간 (초) */
  averageInteractionSeconds: number;
}

export const SCENARIO_NPC_OCCUPATION_LABELS: readonly NpcOccupationLabel[] = [
  { occupation: 'merchant',   label: '상인',     conversationToneHint: '거래 중심의 짧고 명료한 어조.', averageInteractionSeconds: 30 },
  { occupation: 'guard',      label: '경비',     conversationToneHint: '직무 중심의 절제된 어조. 권한 확인 우선.', averageInteractionSeconds: 15 },
  { occupation: 'healer',     label: '치유사',   conversationToneHint: '온화하고 차분한 어조. 회복 관련 hint.', averageInteractionSeconds: 25 },
  { occupation: 'scholar',    label: '학자',     conversationToneHint: '정보 전달 중심의 긴 어조. lore 단서 포함.', averageInteractionSeconds: 60 },
  { occupation: 'quest_giver', label: '의뢰자',  conversationToneHint: '간절하거나 단호한 어조. 의뢰 동기 명확.', averageInteractionSeconds: 45 },
  { occupation: 'wanderer',   label: '방랑자',   conversationToneHint: '예측 불가 어조. 일관성 적으나 가끔 깊은 단서.', averageInteractionSeconds: 20 },
];

export function getNpcOccupationLabel(occupation: NpcOccupation): NpcOccupationLabel | undefined {
  return SCENARIO_NPC_OCCUPATION_LABELS.find((o) => o.occupation === occupation);
}

export function listNpcOccupations(): readonly NpcOccupation[] {
  return ['merchant', 'guard', 'healer', 'scholar', 'quest_giver', 'wanderer'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-181: 오디오 채널 라벨 narrative — 5 채널 (master/bgm/sfx/voice/ambient)
// 사운드 시스템 채널 분류 + 기본 볼륨 + UI 라벨.
// ════════════════════════════════════════════════════════════════

export type AudioChannelKey = 'master' | 'bgm' | 'sfx' | 'voice' | 'ambient';

export interface AudioChannelLabel {
  channel: AudioChannelKey;
  label: string;
  /** 기본 볼륨 (0~100) */
  defaultVolume: number;
  /** 채널 설명 */
  description: string;
}

export const SCENARIO_AUDIO_CHANNEL_LABELS: readonly AudioChannelLabel[] = [
  { channel: 'master',  label: '마스터',   defaultVolume: 80, description: '전체 오디오 출력 — 모든 채널이 마스터에 비례.' },
  { channel: 'bgm',     label: '배경 음악', defaultVolume: 70, description: '배경 음악 (SCENARIO_BGM_NARRATIVES 매핑 적용).' },
  { channel: 'sfx',     label: '효과음',   defaultVolume: 85, description: '전투 / UI / 상호작용 효과음.' },
  { channel: 'voice',   label: '음성',     defaultVolume: 90, description: '대사 / 동료 외침 / cinematic 음성.' },
  { channel: 'ambient', label: '환경음',   defaultVolume: 65, description: '주변 환경 ambient (SCENARIO_AMBIENT_NARRATIVES 매핑).' },
];

export function getAudioChannelLabel(channel: AudioChannelKey): AudioChannelLabel | undefined {
  return SCENARIO_AUDIO_CHANNEL_LABELS.find((c) => c.channel === channel);
}

export function listAudioChannels(): readonly AudioChannelKey[] {
  return ['master', 'bgm', 'sfx', 'voice', 'ambient'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-182: 게임패드 버튼 매핑 SSOT — 8 버튼 (Xbox/PS 공용)
// XInput 표준 + 기본 action 매핑 + 키보드 대응.
// ════════════════════════════════════════════════════════════════

export type GamepadButton = 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT';

export interface GamepadButtonMapping {
  button: GamepadButton;
  /** PS 표기 (□△○✕) */
  psLabel: string;
  /** 기본 action */
  defaultAction: KeybindAction;
  /** 키보드 대응 키 */
  keyboardEquivalent: string;
}

export const SCENARIO_GAMEPAD_BUTTON_MAPPINGS: readonly GamepadButtonMapping[] = [
  { button: 'A',  psLabel: 'X (cross)',     defaultAction: 'interact',    keyboardEquivalent: 'E' },
  { button: 'B',  psLabel: 'O (circle)',    defaultAction: 'escape',      keyboardEquivalent: 'Esc' },
  { button: 'X',  psLabel: '□ (square)',    defaultAction: 'quickslot_1', keyboardEquivalent: '1' },
  { button: 'Y',  psLabel: '△ (triangle)',  defaultAction: 'open_menu',   keyboardEquivalent: 'Tab' },
  { button: 'LB', psLabel: 'L1',            defaultAction: 'move_left',   keyboardEquivalent: 'A' },
  { button: 'RB', psLabel: 'R1',            defaultAction: 'move_right',  keyboardEquivalent: 'D' },
  { button: 'LT', psLabel: 'L2',            defaultAction: 'move_up',     keyboardEquivalent: 'W' },
  { button: 'RT', psLabel: 'R2',            defaultAction: 'move_down',   keyboardEquivalent: 'S' },
];

export function getGamepadButtonMapping(button: GamepadButton): GamepadButtonMapping | undefined {
  return SCENARIO_GAMEPAD_BUTTON_MAPPINGS.find((m) => m.button === button);
}

export function listGamepadButtons(): readonly GamepadButton[] {
  return ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-183: 디버그 오버레이 라벨 SSOT — 6 라벨
// 개발/QA 모드 디버그 오버레이 + 단축키.
// ════════════════════════════════════════════════════════════════

export type DebugOverlayKey = 'fps' | 'draw_calls' | 'memory' | 'atb_trace' | 'zone_id' | 'network';

export interface DebugOverlayLabel {
  key: DebugOverlayKey;
  label: string;
  /** 토글 단축키 (Shift+F-key) */
  toggleShortcut: string;
  /** 표시 위치 (HudAnchor) */
  anchor: HudAnchor;
  /** 설명 */
  description: string;
}

export const SCENARIO_DEBUG_OVERLAY_LABELS: readonly DebugOverlayLabel[] = [
  { key: 'fps',         label: 'FPS',         toggleShortcut: 'Shift+F1', anchor: 'top_right',     description: '프레임 레이트 + 평균 / 최저 / 최고.' },
  { key: 'draw_calls',  label: 'Draw Calls',  toggleShortcut: 'Shift+F2', anchor: 'top_right',     description: '프레임당 draw call 수 + GPU sync 시간.' },
  { key: 'memory',      label: 'Memory',      toggleShortcut: 'Shift+F3', anchor: 'top_right',     description: 'JS heap / GPU texture 메모리 사용량.' },
  { key: 'atb_trace',   label: 'ATB Trace',   toggleShortcut: 'Shift+F4', anchor: 'bottom_left',   description: '전투 ATB 게이지 + 행동 큐 + cooldown 트레이스.' },
  { key: 'zone_id',     label: 'Zone ID',     toggleShortcut: 'Shift+F5', anchor: 'top_left',      description: '현재 zone obsidianId + 좌표 + 인접 zone.' },
  { key: 'network',     label: 'Network',     toggleShortcut: 'Shift+F6', anchor: 'bottom_right',  description: 'WebSocket latency + 요청 큐 + 오류 카운트.' },
];

export function getDebugOverlayLabel(key: DebugOverlayKey): DebugOverlayLabel | undefined {
  return SCENARIO_DEBUG_OVERLAY_LABELS.find((d) => d.key === key);
}

export function listDebugOverlayKeys(): readonly DebugOverlayKey[] {
  return ['fps', 'draw_calls', 'memory', 'atb_trace', 'zone_id', 'network'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-184: 옵션 메뉴 카테고리 SSOT — 4 카테고리
// 옵션 메뉴 상위 탭 + SETTINGS_DESCRIPTIONS 와 cross.
// ════════════════════════════════════════════════════════════════

export type OptionMenuCategoryKey = 'game' | 'audio' | 'graphics' | 'accessibility';

export interface OptionMenuCategoryLabel {
  category: OptionMenuCategoryKey;
  label: string;
  sortOrder: number;
  /** 카테고리 설명 */
  description: string;
  /** 항목 갯수 hint */
  itemCountHint: number;
}

export const SCENARIO_OPTION_CATEGORIES: readonly OptionMenuCategoryLabel[] = [
  { category: 'game',          label: '게임플레이',     sortOrder: 1, description: '난이도, 키바인딩, 콘트롤 옵션.', itemCountHint: 8 },
  { category: 'audio',         label: '오디오',         sortOrder: 2, description: '5 채널 볼륨 (master/bgm/sfx/voice/ambient).', itemCountHint: 5 },
  { category: 'graphics',      label: '그래픽',         sortOrder: 3, description: '품질, 해상도, 전체화면 토글.', itemCountHint: 2 },
  { category: 'accessibility', label: '접근성',         sortOrder: 4, description: '색맹 모드, 자막 크기, 모션 감소.', itemCountHint: 3 },
];

export function getOptionMenuCategory(category: OptionMenuCategoryKey): OptionMenuCategoryLabel | undefined {
  return SCENARIO_OPTION_CATEGORIES.find((c) => c.category === category);
}

export function listOptionMenuCategoriesSorted(): readonly OptionMenuCategoryLabel[] {
  return [...SCENARIO_OPTION_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ════════════════════════════════════════════════════════════════
// SYNC-185: 🎯 시네마틱 전환 효과 narrative — 4 종 (fade/slide/iris/dissolve)
// scene 전환 / cinematic 도입 시 사용되는 화면 전환 효과.
// ════════════════════════════════════════════════════════════════

export type CinematicTransitionKind = 'fade' | 'slide' | 'iris' | 'dissolve';

export interface CinematicTransitionNarrative {
  kind: CinematicTransitionKind;
  label: string;
  /** 전환 시간 (ms) */
  durationMs: number;
  /** 사용 시점 hint */
  usageHint: string;
}

export const SCENARIO_CINEMATIC_TRANSITIONS: readonly CinematicTransitionNarrative[] = [
  { kind: 'fade',     label: '페이드',     durationMs: 800,  usageHint: 'zone 전환 / 챕터 전환 / 일반 scene 전환.' },
  { kind: 'slide',    label: '슬라이드',   durationMs: 600,  usageHint: '대화창 / 메뉴 진입 / 빠른 UI 전환.' },
  { kind: 'iris',     label: '아이리스',   durationMs: 1200, usageHint: '보스 등장 / 결정적 순간 강조.' },
  { kind: 'dissolve', label: '디졸브',     durationMs: 1500, usageHint: '회상 / dream_glimpse / 시간 이동.' },
];

export function getCinematicTransitionNarrative(kind: CinematicTransitionKind): CinematicTransitionNarrative | undefined {
  return SCENARIO_CINEMATIC_TRANSITIONS.find((t) => t.kind === kind);
}

export function listCinematicTransitionKinds(): readonly CinematicTransitionKind[] {
  return ['fade', 'slide', 'iris', 'dissolve'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-186: 경로 탐색 프로파일 narrative — 4 프로파일
// 자동 이동 / 네비게이션 시 적용할 가중치 프로파일.
// ════════════════════════════════════════════════════════════════

export type PathFindingProfile = 'direct' | 'avoid_enemy' | 'safe' | 'explore';

export interface PathFindingProfileNarrative {
  profile: PathFindingProfile;
  label: string;
  /** 가중치 (낮을수록 우선) */
  enemyAvoidanceWeight: number;
  treasureSeekWeight: number;
  /** 사용 hint */
  usageHint: string;
}

export const SCENARIO_PATH_FINDING_PROFILES: readonly PathFindingProfileNarrative[] = [
  { profile: 'direct',      label: '직진',     enemyAvoidanceWeight: 0,  treasureSeekWeight: 0,  usageHint: '가장 짧은 거리. 적/보물 무시.' },
  { profile: 'avoid_enemy', label: '적 회피',  enemyAvoidanceWeight: 5,  treasureSeekWeight: 0,  usageHint: '적과의 조우 최소화. 거리 +20% 감수.' },
  { profile: 'safe',        label: '안전',     enemyAvoidanceWeight: 10, treasureSeekWeight: 0,  usageHint: '함정/위험 지대 완전 우회. 거리 +50%.' },
  { profile: 'explore',     label: '탐색',     enemyAvoidanceWeight: 2,  treasureSeekWeight: 8,  usageHint: '보물/단서 우선 방문. 거리 +100%.' },
];

export function getPathFindingProfileNarrative(profile: PathFindingProfile): PathFindingProfileNarrative | undefined {
  return SCENARIO_PATH_FINDING_PROFILES.find((p) => p.profile === profile);
}

export function listPathFindingProfiles(): readonly PathFindingProfile[] {
  return ['direct', 'avoid_enemy', 'safe', 'explore'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-187: 도전과제 카테고리 narrative — 4 카테고리
// SCENARIO_ACHIEVEMENTS 의 상위 분류 + UI 탭 hint.
// ════════════════════════════════════════════════════════════════

export type AchievementCategory = 'combat' | 'story' | 'exploration' | 'collection';

export interface AchievementCategoryNarrative {
  category: AchievementCategory;
  label: string;
  /** UI 아이콘 (이모지) */
  icon: string;
  /** 카테고리 설명 */
  description: string;
  /** 평균 갯수 hint */
  averageCount: number;
}

export const SCENARIO_ACHIEVEMENT_CATEGORIES: readonly AchievementCategoryNarrative[] = [
  { category: 'combat',      label: '전투',     icon: '⚔', description: '보스 처치 / 콤보 / 빌드 도전 — 전투 시스템 마스터.', averageCount: 25 },
  { category: 'story',       label: '스토리',   icon: '📖', description: '메인 quest 진행 / 분기 선택 / 엔딩 도달.', averageCount: 30 },
  { category: 'exploration', label: '탐험',     icon: '🗺', description: 'zone 완전 탐색 / 숨겨진 단서 발견 / 모든 zone 방문.', averageCount: 15 },
  { category: 'collection',  label: '수집',     icon: '💎', description: '아이템 / 동료 / 도감 컴플리션.', averageCount: 20 },
];

export function getAchievementCategoryNarrative(category: AchievementCategory): AchievementCategoryNarrative | undefined {
  return SCENARIO_ACHIEVEMENT_CATEGORIES.find((c) => c.category === category);
}

export function getTotalAchievementCount(): number {
  return SCENARIO_ACHIEVEMENT_CATEGORIES.reduce((sum, c) => sum + c.averageCount, 0);
}

// ════════════════════════════════════════════════════════════════
// SYNC-188: 로그 레벨 narrative — 5 레벨 (debug/info/warn/error/fatal)
// 로깅 시스템 레벨 + 우선순위 + UI 색상.
// ════════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogLevelNarrative {
  level: LogLevel;
  label: string;
  /** 우선순위 (낮을수록 noisy) */
  priority: number;
  /** 콘솔 색상 */
  consoleColor: string;
  /** 발생 시점 hint */
  whenToUse: string;
}

export const SCENARIO_LOG_LEVELS: readonly LogLevelNarrative[] = [
  { level: 'debug', label: 'DEBUG', priority: 0, consoleColor: '#a0a0a0', whenToUse: '개발 트레이스 — 프로덕션 비활성.' },
  { level: 'info',  label: 'INFO',  priority: 1, consoleColor: '#5f9fff', whenToUse: '일반 상태 변경 / 진행 정보.' },
  { level: 'warn',  label: 'WARN',  priority: 2, consoleColor: '#ffb720', whenToUse: '주의 필요 — 게임은 계속되지만 예상 외 상태.' },
  { level: 'error', label: 'ERROR', priority: 3, consoleColor: '#d04040', whenToUse: '기능 실패 — 일부 시스템 작동 불가.' },
  { level: 'fatal', label: 'FATAL', priority: 4, consoleColor: '#7f00ff', whenToUse: '치명적 오류 — 게임 종료 또는 크래시.' },
];

export function getLogLevelNarrative(level: LogLevel): LogLevelNarrative | undefined {
  return SCENARIO_LOG_LEVELS.find((l) => l.level === level);
}

export function listLogLevelsByPriority(): readonly LogLevelNarrative[] {
  return [...SCENARIO_LOG_LEVELS].sort((a, b) => a.priority - b.priority);
}

// ════════════════════════════════════════════════════════════════
// SYNC-189: 언어 로케일 라벨 SSOT — 4 로케일 (ko/en/ja/zh)
// i18n 시스템 로케일 + native name + 권장 폰트 패밀리.
// ════════════════════════════════════════════════════════════════

export type LocaleCode = 'ko_KR' | 'en_US' | 'ja_JP' | 'zh_CN';

export interface LocaleLabelNarrative {
  locale: LocaleCode;
  /** 영문 표기 */
  englishName: string;
  /** 자국 표기 */
  nativeName: string;
  /** 권장 폰트 패밀리 */
  recommendedFontFamily: string;
  /** 번역 완성도 (0~1) */
  translationCompleteness: number;
}

export const SCENARIO_LOCALE_LABELS: readonly LocaleLabelNarrative[] = [
  { locale: 'ko_KR', englishName: 'Korean',  nativeName: '한국어',   recommendedFontFamily: 'Galmuri11, Pretendard, Noto Sans KR', translationCompleteness: 1.0 },
  { locale: 'en_US', englishName: 'English', nativeName: 'English',  recommendedFontFamily: 'Inter, system-ui, sans-serif',        translationCompleteness: 0.85 },
  { locale: 'ja_JP', englishName: 'Japanese', nativeName: '日本語',   recommendedFontFamily: 'Noto Sans JP, sans-serif',            translationCompleteness: 0.6 },
  { locale: 'zh_CN', englishName: 'Chinese (Simplified)', nativeName: '简体中文', recommendedFontFamily: 'Noto Sans SC, sans-serif', translationCompleteness: 0.4 },
];

export function getLocaleLabelNarrative(locale: LocaleCode): LocaleLabelNarrative | undefined {
  return SCENARIO_LOCALE_LABELS.find((l) => l.locale === locale);
}

export function listLocalesByCompleteness(): readonly LocaleLabelNarrative[] {
  return [...SCENARIO_LOCALE_LABELS].sort((a, b) => b.translationCompleteness - a.translationCompleteness);
}

// ════════════════════════════════════════════════════════════════
// SYNC-190: 🎯 그래픽 벤치마크 프로파일 SSOT — 4 프로파일 (low~ultra)
// 자동 설정 / 벤치마크 모드의 graphics_quality 매핑.
// ════════════════════════════════════════════════════════════════

export type BenchmarkProfileKey = 'low' | 'medium' | 'high' | 'ultra';

export interface BenchmarkProfileNarrative {
  profile: BenchmarkProfileKey;
  label: string;
  /** 타겟 FPS */
  targetFps: number;
  /** 권장 GPU tier */
  recommendedGpuTier: string;
  /** 적용 modifier */
  modifierSummary: string;
}

export const SCENARIO_BENCHMARK_PROFILES: readonly BenchmarkProfileNarrative[] = [
  { profile: 'low',    label: '저사양',  targetFps: 30, recommendedGpuTier: 'Intel HD / 통합 그래픽', modifierSummary: '해상도 720p, 그림자 비활성, 안티앨리어싱 끔.' },
  { profile: 'medium', label: '중사양',  targetFps: 60, recommendedGpuTier: 'GTX 1050 / GTX 1060',    modifierSummary: '해상도 1080p, 그림자 저, FXAA.' },
  { profile: 'high',   label: '고사양',  targetFps: 60, recommendedGpuTier: 'GTX 1660 / RTX 2060',    modifierSummary: '해상도 1440p, 그림자 중, MSAA 2x.' },
  { profile: 'ultra',  label: '최상사양', targetFps: 120, recommendedGpuTier: 'RTX 3070 / RTX 4060 이상', modifierSummary: '해상도 4K, 그림자 고, MSAA 4x + 사후처리.' },
];

export function getBenchmarkProfileNarrative(profile: BenchmarkProfileKey): BenchmarkProfileNarrative | undefined {
  return SCENARIO_BENCHMARK_PROFILES.find((p) => p.profile === profile);
}

export function listBenchmarkProfilesAscending(): readonly BenchmarkProfileKey[] {
  return ['low', 'medium', 'high', 'ultra'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-191: 빌드 프리셋 추천 SSOT — 6 클래스 × 1 추천 빌드
// 각 클래스 별 입문자 권장 빌드 (6 스킬 슬롯 + 1 패시브 + 타겟 레벨).
// ════════════════════════════════════════════════════════════════

export interface BuildPresetNarrative {
  classKey: ClassKey;
  presetName: string;
  /** 6 스킬 슬롯에 권장 배치할 스킬 family */
  recommendedSkillFamilies: readonly string[];
  /** 권장 패시브 (PassiveEffectType) */
  recommendedPassive: PassiveEffectType;
  /** 타겟 milestone level */
  targetLevel: 10 | 20 | 30;
  /** 빌드 설명 */
  flavorSummary: string;
}

export const SCENARIO_BUILD_PRESETS: readonly BuildPresetNarrative[] = [
  {
    classKey: 'ether_knight',
    presetName: '검결 균형',
    recommendedSkillFamilies: ['광역 검결', '단일 카운터', '방어 자세', '회복 검결', '강타', '광역 강타'],
    recommendedPassive: 'reflect',
    targetLevel: 20,
    flavorSummary: '근접 폭딜 + 반사 방어 균형. 보스전 1~3 페이즈 안정형.',
  },
  {
    classKey: 'memorist',
    presetName: '공명 회복',
    recommendedSkillFamilies: ['단일 회복', '광역 회복', '디버프 해제', 'ATB 가속', '광역 버프', '비상 부활'],
    recommendedPassive: 'battle_regen',
    targetLevel: 20,
    flavorSummary: '파티 지속력 최대화. 장기전 / 보스 페이즈 통과 빌드.',
  },
  {
    classKey: 'shadow_weaver',
    presetName: '회피 콤보',
    recommendedSkillFamilies: ['회피 무빙', '카운터', '다단 히트', '약점 직격', '광역 그림자', '잠입 표식'],
    recommendedPassive: 'evasion_up',
    targetLevel: 20,
    flavorSummary: '회피 + 콤보 기여 빌드. 엘리트 적 안정 처리.',
  },
  {
    classKey: 'memory_destroyer',
    presetName: '극한 폭딜',
    recommendedSkillFamilies: ['강타', '광역 파괴', '봉인 파쇄', '저 HP 강화', '치명 회복', '최후의 일격'],
    recommendedPassive: 'low_hp_atk_up',
    targetLevel: 30,
    flavorSummary: '위험 감수 + 폭딜 빌드. 보스 페이즈 전이 압축형.',
  },
  {
    classKey: 'time_guardian',
    presetName: '시간 통제',
    recommendedSkillFamilies: ['ATB 정지', '역전', '광역 둔화', '회복 가속', '시간 가속', '균열 봉합'],
    recommendedPassive: 'defense_up_conditional',
    targetLevel: 30,
    flavorSummary: '적 행동 통제 + 파티 가속 빌드. 균열 / 시간 보스전 최적.',
  },
  {
    classKey: 'void_wanderer',
    presetName: '균열 분단',
    recommendedSkillFamilies: ['이동 강타', '텔레포트', '독 표식', '광역 분단', '균열 함정', '부활 표식'],
    recommendedPassive: 'auto_resurrect',
    targetLevel: 30,
    flavorSummary: '기동력 + 분단 + 부활 사이클 빌드. 단독 진입 최적.',
  },
];

export function getBuildPresetNarrative(classKey: ClassKey): BuildPresetNarrative | undefined {
  return SCENARIO_BUILD_PRESETS.find((b) => b.classKey === classKey);
}

export function listBuildPresetClassKeys(): readonly ClassKey[] {
  return SCENARIO_BUILD_PRESETS.map((b) => b.classKey);
}

// ════════════════════════════════════════════════════════════════
// SYNC-192: 애니메이션 이징 곡선 SSOT — 5 종 (CSS 표준)
// UI 애니메이션 / 카메라 전환 / 시네마틱에 사용할 이징.
// ════════════════════════════════════════════════════════════════

export type AnimationEasingKind = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bounce';

export interface AnimationEasingNarrative {
  easing: AnimationEasingKind;
  label: string;
  /** CSS cubic-bezier 또는 keyword */
  cssValue: string;
  /** 사용 hint */
  usageHint: string;
}

export const SCENARIO_ANIMATION_EASING_CURVES: readonly AnimationEasingNarrative[] = [
  { easing: 'linear',      label: '리니어',          cssValue: 'linear',                            usageHint: '게이지 / 일정 속도 카운트다운.' },
  { easing: 'ease_in',     label: '점진 가속',       cssValue: 'cubic-bezier(0.4, 0, 1, 1)',        usageHint: '진입 모션 — UI 등장, 화면 페이드 인.' },
  { easing: 'ease_out',    label: '점진 감속',       cssValue: 'cubic-bezier(0, 0, 0.2, 1)',        usageHint: '퇴장 모션 — UI 사라짐, 화면 페이드 아웃.' },
  { easing: 'ease_in_out', label: '진입+퇴장 곡선',  cssValue: 'cubic-bezier(0.4, 0, 0.2, 1)',      usageHint: '카메라 추종 / 부드러운 전환 표준.' },
  { easing: 'bounce',      label: '바운스',          cssValue: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', usageHint: '강조 모션 — 보상 popup / 콤보 강조.' },
];

export function getAnimationEasingNarrative(easing: AnimationEasingKind): AnimationEasingNarrative | undefined {
  return SCENARIO_ANIMATION_EASING_CURVES.find((e) => e.easing === easing);
}

export function listAnimationEasingKinds(): readonly AnimationEasingKind[] {
  return ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'bounce'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-193: 프레임 페이싱 타겟 SSOT — 4 타겟 (30/60/120/adaptive)
// 렌더 루프 타겟 FPS + frame budget + VSync 정책.
// ════════════════════════════════════════════════════════════════

export type FramePacingTarget = 'fps_30' | 'fps_60' | 'fps_120' | 'adaptive';

export interface FramePacingNarrative {
  target: FramePacingTarget;
  label: string;
  /** 타겟 FPS (adaptive 는 0) */
  targetFps: number;
  /** frame budget (ms) */
  frameBudgetMs: number;
  /** VSync 정책 */
  vsyncPolicy: 'on' | 'off' | 'adaptive';
  /** 적용 hint */
  usageHint: string;
}

export const SCENARIO_FRAME_PACING_TARGETS: readonly FramePacingNarrative[] = [
  { target: 'fps_30',   label: '30 FPS',    targetFps: 30,  frameBudgetMs: 33.33, vsyncPolicy: 'on',       usageHint: '저사양 디바이스 / 모바일.' },
  { target: 'fps_60',   label: '60 FPS',    targetFps: 60,  frameBudgetMs: 16.67, vsyncPolicy: 'on',       usageHint: '표준 PC 게임플레이.' },
  { target: 'fps_120',  label: '120 FPS',   targetFps: 120, frameBudgetMs: 8.33,  vsyncPolicy: 'on',       usageHint: '고주사율 모니터 + 고사양 GPU.' },
  { target: 'adaptive', label: '가변',      targetFps: 0,   frameBudgetMs: 0,     vsyncPolicy: 'adaptive', usageHint: 'G-Sync / FreeSync 호환. GPU 부하에 따라 자동 조정.' },
];

export function getFramePacingNarrative(target: FramePacingTarget): FramePacingNarrative | undefined {
  return SCENARIO_FRAME_PACING_TARGETS.find((f) => f.target === target);
}

export function listFramePacingTargets(): readonly FramePacingTarget[] {
  return ['fps_30', 'fps_60', 'fps_120', 'adaptive'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-194: 입력 지연 tier SSOT — 4 tier (excellent~poor)
// 입력→화면 반응 지연 분류 + 임계값 + 권장 액션.
// ════════════════════════════════════════════════════════════════

export type InputLatencyTier = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface InputLatencyTierNarrative {
  tier: InputLatencyTier;
  label: string;
  /** 지연 임계값 (ms, 미만) */
  maxLatencyMs: number;
  /** UI 색상 */
  uiColor: string;
  /** 권장 액션 */
  recommendedAction: string;
}

export const SCENARIO_INPUT_LATENCY_TIERS: readonly InputLatencyTierNarrative[] = [
  { tier: 'excellent',  label: '최상',   maxLatencyMs: 20,  uiColor: '#5fbf5f', recommendedAction: '경쟁 게임 / 시간 보스전 가능. 모든 빌드 최적 작동.' },
  { tier: 'good',       label: '양호',   maxLatencyMs: 50,  uiColor: '#9fcf5f', recommendedAction: '표준 게임플레이 양호. 일반 보스전 가능.' },
  { tier: 'acceptable', label: '허용',   maxLatencyMs: 100, uiColor: '#ffb720', recommendedAction: '느린 빌드 권장. 회피 의존 빌드 어려움.' },
  { tier: 'poor',       label: '저조',   maxLatencyMs: 200, uiColor: '#d04040', recommendedAction: '난이도 낮춤 또는 그래픽 품질 저로 변경 권장.' },
];

export function getInputLatencyTierNarrative(tier: InputLatencyTier): InputLatencyTierNarrative | undefined {
  return SCENARIO_INPUT_LATENCY_TIERS.find((t) => t.tier === tier);
}

export function classifyInputLatencyMs(latencyMs: number): InputLatencyTierNarrative {
  const ascending = [...SCENARIO_INPUT_LATENCY_TIERS].sort((a, b) => a.maxLatencyMs - b.maxLatencyMs);
  for (const t of ascending) {
    if (latencyMs < t.maxLatencyMs) return t;
  }
  return ascending[ascending.length - 1];
}

// ════════════════════════════════════════════════════════════════
// SYNC-195: 🎯 네트워크 품질 tier SSOT — 4 tier (excellent~poor)
// 멀티플레이어 / 클라우드 세이브 / WebSocket 연결 품질 분류.
// ════════════════════════════════════════════════════════════════

export type NetworkQualityTier = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface NetworkQualityNarrative {
  tier: NetworkQualityTier;
  label: string;
  /** ping 임계값 (ms, 미만) */
  maxPingMs: number;
  /** packet loss 임계값 (%, 미만) */
  maxPacketLossPercent: number;
  /** UI 아이콘 */
  icon: string;
}

export const SCENARIO_NETWORK_QUALITY_TIERS: readonly NetworkQualityNarrative[] = [
  { tier: 'excellent',  label: '최상',   maxPingMs: 30,  maxPacketLossPercent: 0.5, icon: '●●●●' },
  { tier: 'good',       label: '양호',   maxPingMs: 80,  maxPacketLossPercent: 2,   icon: '●●●○' },
  { tier: 'acceptable', label: '허용',   maxPingMs: 150, maxPacketLossPercent: 5,   icon: '●●○○' },
  { tier: 'poor',       label: '저조',   maxPingMs: 300, maxPacketLossPercent: 10,  icon: '●○○○' },
];

export function getNetworkQualityNarrative(tier: NetworkQualityTier): NetworkQualityNarrative | undefined {
  return SCENARIO_NETWORK_QUALITY_TIERS.find((n) => n.tier === tier);
}

export function classifyNetworkQuality(pingMs: number, packetLossPercent: number): NetworkQualityNarrative {
  const ascending = [...SCENARIO_NETWORK_QUALITY_TIERS].sort((a, b) => a.maxPingMs - b.maxPingMs);
  for (const t of ascending) {
    if (pingMs < t.maxPingMs && packetLossPercent < t.maxPacketLossPercent) return t;
  }
  return ascending[ascending.length - 1];
}

// ════════════════════════════════════════════════════════════════
// SYNC-196: 연결 상태 narrative SSOT — 4 상태 (connected/connecting/disconnected/reconnecting)
// 서버 연결 / 클라우드 세이브 / WebSocket 상태.
// ════════════════════════════════════════════════════════════════

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface ConnectionStateNarrative {
  state: ConnectionState;
  label: string;
  indicatorColor: string;
  statusMessage: string;
}

export const SCENARIO_CONNECTION_STATES: readonly ConnectionStateNarrative[] = [
  { state: 'connected',    label: '연결됨',    indicatorColor: '#5fbf5f', statusMessage: '서버에 연결되어 있습니다.' },
  { state: 'connecting',   label: '연결 중',   indicatorColor: '#ffb720', statusMessage: '서버에 연결을 시도하고 있습니다...' },
  { state: 'disconnected', label: '연결 끊김', indicatorColor: '#d04040', statusMessage: '— 서버 연결이 끊겼습니다. 오프라인 모드로 전환됩니다.' },
  { state: 'reconnecting', label: '재연결 중', indicatorColor: '#ffb720', statusMessage: '재연결을 시도하고 있습니다...' },
];

export function getConnectionStateNarrative(state: ConnectionState): ConnectionStateNarrative | undefined {
  return SCENARIO_CONNECTION_STATES.find((s) => s.state === state);
}

export function listConnectionStates(): readonly ConnectionState[] {
  return ['connected', 'connecting', 'disconnected', 'reconnecting'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-197: 텔레메트리 이벤트 타입 SSOT — 5 이벤트
// 분석 시스템에 전송할 표준 이벤트.
// ════════════════════════════════════════════════════════════════

export type TelemetryEventType =
  | 'session_start' | 'zone_enter' | 'quest_complete' | 'player_death' | 'purchase';

export interface TelemetryEventNarrative {
  event: TelemetryEventType;
  label: string;
  priority: number;
  payloadFieldsHint: string;
}

export const SCENARIO_TELEMETRY_EVENT_TYPES: readonly TelemetryEventNarrative[] = [
  { event: 'session_start',    label: '세션 시작',     priority: 1, payloadFieldsHint: 'user_id / device / locale / session_id' },
  { event: 'zone_enter',       label: 'zone 진입',     priority: 3, payloadFieldsHint: 'zone_obsidian_id / chapter / playtime_ms' },
  { event: 'quest_complete',   label: '퀘스트 완료',   priority: 2, payloadFieldsHint: 'quest_code / outcome / duration_ms / reward' },
  { event: 'player_death',     label: '플레이어 사망', priority: 1, payloadFieldsHint: 'cause / chapter / zone / boss_id / build_summary' },
  { event: 'purchase',         label: '구매',          priority: 1, payloadFieldsHint: 'item_sku / price / currency / context' },
];

export function getTelemetryEventNarrative(event: TelemetryEventType): TelemetryEventNarrative | undefined {
  return SCENARIO_TELEMETRY_EVENT_TYPES.find((e) => e.event === event);
}

export function listTelemetryEventsByPriority(): readonly TelemetryEventNarrative[] {
  return [...SCENARIO_TELEMETRY_EVENT_TYPES].sort((a, b) => a.priority - b.priority);
}

// ════════════════════════════════════════════════════════════════
// SYNC-198: 성능 budget 카테고리 SSOT — 4 카테고리
// 프레임당 budget + 경고/위험 임계값.
// ════════════════════════════════════════════════════════════════

export type PerformanceBudgetCategory = 'cpu' | 'gpu' | 'memory' | 'network';

export interface PerformanceBudgetNarrative {
  category: PerformanceBudgetCategory;
  label: string;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
}

export const SCENARIO_PERFORMANCE_BUDGETS: readonly PerformanceBudgetNarrative[] = [
  { category: 'cpu',     label: 'CPU 사용률',      unit: '%',    warningThreshold: 70,   criticalThreshold: 90 },
  { category: 'gpu',     label: 'GPU 사용률',      unit: '%',    warningThreshold: 80,   criticalThreshold: 95 },
  { category: 'memory',  label: '메모리 점유',     unit: 'MB',   warningThreshold: 1500, criticalThreshold: 3000 },
  { category: 'network', label: '네트워크 대역폭', unit: 'KB/s', warningThreshold: 500,  criticalThreshold: 2000 },
];

export function getPerformanceBudgetNarrative(category: PerformanceBudgetCategory): PerformanceBudgetNarrative | undefined {
  return SCENARIO_PERFORMANCE_BUDGETS.find((b) => b.category === category);
}

export function evaluateBudgetStatus(
  category: PerformanceBudgetCategory,
  value: number,
): 'normal' | 'warning' | 'critical' {
  const b = getPerformanceBudgetNarrative(category);
  if (!b) return 'normal';
  if (value >= b.criticalThreshold) return 'critical';
  if (value >= b.warningThreshold) return 'warning';
  return 'normal';
}

// ════════════════════════════════════════════════════════════════
// SYNC-199: 에셋 로딩 우선순위 SSOT — 5 우선순위 (critical~lazy)
// ════════════════════════════════════════════════════════════════

export type AssetLoadPriority = 'critical' | 'high' | 'medium' | 'low' | 'lazy';

export interface AssetLoadPriorityNarrative {
  priority: AssetLoadPriority;
  label: string;
  order: number;
  loadingTimingHint: string;
  exampleAssets: string;
}

export const SCENARIO_ASSET_LOAD_PRIORITIES: readonly AssetLoadPriorityNarrative[] = [
  { priority: 'critical', label: '필수',     order: 1, loadingTimingHint: '게임 시작 즉시 — 진행 차단.',           exampleAssets: '메인 메뉴 UI / 폰트 / core scripts' },
  { priority: 'high',     label: '높음',     order: 2, loadingTimingHint: '메인 메뉴 직후 — 첫 zone 진입 전.',     exampleAssets: 'chapter 1 zone tiles / 핵심 BGM' },
  { priority: 'medium',   label: '중간',     order: 3, loadingTimingHint: 'zone 진입 후 background.',               exampleAssets: '주변 NPC 스프라이트 / 보조 SFX' },
  { priority: 'low',      label: '낮음',     order: 4, loadingTimingHint: '게임 idle 중 background.',               exampleAssets: '다음 zone 사전 로딩 / 옵션 cosmetic' },
  { priority: 'lazy',     label: '지연',     order: 5, loadingTimingHint: '실제 필요한 시점에 on-demand.',          exampleAssets: '엔딩 cinematic / 특수 효과 모음' },
];

export function getAssetLoadPriorityNarrative(priority: AssetLoadPriority): AssetLoadPriorityNarrative | undefined {
  return SCENARIO_ASSET_LOAD_PRIORITIES.find((p) => p.priority === priority);
}

export function listAssetLoadPrioritiesByOrder(): readonly AssetLoadPriorityNarrative[] {
  return [...SCENARIO_ASSET_LOAD_PRIORITIES].sort((a, b) => a.order - b.order);
}

// ════════════════════════════════════════════════════════════════
// SYNC-200: 🎯🎯🎯 100 sprint 거대 마디 — RELEASE_VERSION_LABELS
// 빌드 채널 + 안정성 라벨 + 권장 사용 대상.
// ════════════════════════════════════════════════════════════════

export type ReleaseVersionChannel = 'alpha' | 'beta' | 'rc' | 'stable' | 'lts';

export interface ReleaseVersionLabelNarrative {
  channel: ReleaseVersionChannel;
  label: string;
  stabilityScore: number;
  recommendedAudience: string;
  updateFrequency: string;
}

export const SCENARIO_RELEASE_VERSION_LABELS: readonly ReleaseVersionLabelNarrative[] = [
  { channel: 'alpha',  label: '알파',     stabilityScore: 0.3,  recommendedAudience: '내부 개발자만.',                                                    updateFrequency: '일일 빌드' },
  { channel: 'beta',   label: '베타',     stabilityScore: 0.6,  recommendedAudience: '테스터 / 얼리어답터.',                                              updateFrequency: '주간 빌드' },
  { channel: 'rc',     label: 'RC',       stabilityScore: 0.85, recommendedAudience: '베타 후 stable 직전 검증자.',                                      updateFrequency: '격주 빌드' },
  { channel: 'stable', label: '안정',     stabilityScore: 0.95, recommendedAudience: '일반 플레이어 — 표준 권장.',                                        updateFrequency: '월간 빌드' },
  { channel: 'lts',    label: 'LTS',      stabilityScore: 1.0,  recommendedAudience: '장기 안정성 우선 — NG+ 회차 누적 플레이어.',                       updateFrequency: '분기 빌드' },
];

export function getReleaseVersionLabel(channel: ReleaseVersionChannel): ReleaseVersionLabelNarrative | undefined {
  return SCENARIO_RELEASE_VERSION_LABELS.find((r) => r.channel === channel);
}

export function listReleaseVersionsByStability(): readonly ReleaseVersionLabelNarrative[] {
  return [...SCENARIO_RELEASE_VERSION_LABELS].sort((a, b) => a.stabilityScore - b.stabilityScore);
}

// ════════════════════════════════════════════════════════════════
// SYNC-201: 게임 내 타이머 narrative SSOT — 4 타이머
// 챕터 / 퀘스트 데드라인 / 보스 enrage / 이벤트 윈도우.
// ════════════════════════════════════════════════════════════════

export type GameplayTimerKind = 'chapter' | 'quest_deadline' | 'boss_enrage' | 'event_window';

export interface GameplayTimerNarrative {
  timer: GameplayTimerKind;
  label: string;
  defaultDurationMinutes: number;
  expirationOutcome: string;
  displayHint: string;
}

export const SCENARIO_GAMEPLAY_TIMERS: readonly GameplayTimerNarrative[] = [
  {
    timer: 'chapter',
    label: '챕터 타이머',
    defaultDurationMinutes: 0,
    expirationOutcome: '챕터 타이머 자체는 없음 (참조용). chapter milestone 완료 시 자동 종결.',
    displayHint: 'HUD 비활성 — 메뉴에서만 확인 가능.',
  },
  {
    timer: 'quest_deadline',
    label: '퀘스트 데드라인',
    defaultDurationMinutes: 30,
    expirationOutcome: '퀘스트 실패 — 의뢰자 신뢰도 -10, 보상 차단.',
    displayHint: 'HUD 우상단 카운트다운 + 5분 남았을 때 경고.',
  },
  {
    timer: 'boss_enrage',
    label: '보스 광폭화',
    defaultDurationMinutes: 5,
    expirationOutcome: '보스 enrage — 공격력 +50%, 회피 무시.',
    displayHint: 'HUD 보스 체력 바 위 카운트다운 + 30초 경고.',
  },
  {
    timer: 'event_window',
    label: '이벤트 윈도우',
    defaultDurationMinutes: 60,
    expirationOutcome: '이벤트 종료 — 한정 보상 / NPC 제공 차단.',
    displayHint: '월드맵 위 이벤트 마커 + 5분/1분 시점에 알림.',
  },
];

export function getGameplayTimerNarrative(timer: GameplayTimerKind): GameplayTimerNarrative | undefined {
  return SCENARIO_GAMEPLAY_TIMERS.find((t) => t.timer === timer);
}

export function listGameplayTimerKinds(): readonly GameplayTimerKind[] {
  return ['chapter', 'quest_deadline', 'boss_enrage', 'event_window'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-202: 인벤토리 필터 프리셋 SSOT — 5 프리셋
// ════════════════════════════════════════════════════════════════

export type InventoryFilterPreset = 'all' | 'equippable' | 'consumable' | 'quest' | 'new';

export interface InventoryFilterPresetNarrative {
  preset: InventoryFilterPreset;
  label: string;
  filterCondition: string;
  defaultActive: boolean;
}

export const SCENARIO_INVENTORY_FILTER_PRESETS: readonly InventoryFilterPresetNarrative[] = [
  { preset: 'all',         label: '전체',       filterCondition: '모든 아이템 표시.',                              defaultActive: true },
  { preset: 'equippable',  label: '장비',       filterCondition: 'category=equipment 만 표시.',                    defaultActive: false },
  { preset: 'consumable',  label: '소모품',     filterCondition: 'category=consumable 만 표시.',                   defaultActive: false },
  { preset: 'quest',       label: '퀘스트',     filterCondition: 'category=quest_items 만 표시.',                  defaultActive: false },
  { preset: 'new',         label: '새 획득',    filterCondition: '최근 60분 이내 획득한 아이템만 표시.',           defaultActive: false },
];

export function getInventoryFilterPresetNarrative(preset: InventoryFilterPreset): InventoryFilterPresetNarrative | undefined {
  return SCENARIO_INVENTORY_FILTER_PRESETS.find((p) => p.preset === preset);
}

export function listInventoryFilterPresets(): readonly InventoryFilterPreset[] {
  return ['all', 'equippable', 'consumable', 'quest', 'new'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-203: 메뉴 네비 depth SSOT — 4 depth (root~detail)
// ════════════════════════════════════════════════════════════════

export type MenuNavDepth = 'root' | 'category' | 'item' | 'detail';

export interface MenuNavDepthNarrative {
  depth: MenuNavDepth;
  label: string;
  depthNumber: number;
  breadcrumbFormat: string;
  backKeyBehavior: string;
}

export const SCENARIO_MENU_NAV_DEPTHS: readonly MenuNavDepthNarrative[] = [
  { depth: 'root',     label: '루트',     depthNumber: 0, breadcrumbFormat: '메뉴',                                       backKeyBehavior: '게임 재개 (메뉴 닫기).' },
  { depth: 'category', label: '카테고리', depthNumber: 1, breadcrumbFormat: '메뉴 / {카테고리}',                          backKeyBehavior: '루트로 이동.' },
  { depth: 'item',     label: '항목',     depthNumber: 2, breadcrumbFormat: '메뉴 / {카테고리} / {항목}',                 backKeyBehavior: '카테고리로 이동.' },
  { depth: 'detail',   label: '상세',     depthNumber: 3, breadcrumbFormat: '메뉴 / {카테고리} / {항목} / 상세',          backKeyBehavior: '항목으로 이동.' },
];

export function getMenuNavDepthNarrative(depth: MenuNavDepth): MenuNavDepthNarrative | undefined {
  return SCENARIO_MENU_NAV_DEPTHS.find((d) => d.depth === depth);
}

export function listMenuNavDepthsAscending(): readonly MenuNavDepthNarrative[] {
  return [...SCENARIO_MENU_NAV_DEPTHS].sort((a, b) => a.depthNumber - b.depthNumber);
}

// ════════════════════════════════════════════════════════════════
// SYNC-204: 튜토리얼 스킵 옵션 SSOT — 3 옵션
// ════════════════════════════════════════════════════════════════

export type TutorialSkipOption = 'none' | 'per_step' | 'all';

export interface TutorialSkipOptionNarrative {
  option: TutorialSkipOption;
  label: string;
  description: string;
  rewardImpact: string;
}

export const SCENARIO_TUTORIAL_SKIP_OPTIONS: readonly TutorialSkipOptionNarrative[] = [
  { option: 'none',     label: '스킵 없음',   description: '모든 튜토리얼 단계를 순서대로 진행.', rewardImpact: '완료 시 튜토리얼 청동 도전과제 + 모든 보상.' },
  { option: 'per_step', label: '단계별 스킵', description: '각 단계 진입 시 스킵 버튼 표시.',     rewardImpact: '스킵한 단계의 보상만 제외, 나머지는 유지.' },
  { option: 'all',      label: '전체 스킵',   description: '튜토리얼 전체를 한 번에 건너뛰기.',   rewardImpact: '튜토리얼 보상 전체 차단. 청동 도전과제 잠금.' },
];

export function getTutorialSkipOptionNarrative(option: TutorialSkipOption): TutorialSkipOptionNarrative | undefined {
  return SCENARIO_TUTORIAL_SKIP_OPTIONS.find((o) => o.option === option);
}

export function listTutorialSkipOptions(): readonly TutorialSkipOption[] {
  return ['none', 'per_step', 'all'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-205: 🎯 리플레이 재생 속도 SSOT — 5 속도 (0.25x~4x)
// ════════════════════════════════════════════════════════════════

export type ReplayPlaybackSpeed = 'quarter' | 'half' | 'normal' | 'double' | 'quad';

export interface ReplayPlaybackSpeedNarrative {
  speed: ReplayPlaybackSpeed;
  label: string;
  multiplier: number;
  usageHint: string;
}

export const SCENARIO_REPLAY_PLAYBACK_SPEEDS: readonly ReplayPlaybackSpeedNarrative[] = [
  { speed: 'quarter', label: '0.25x', multiplier: 0.25, usageHint: '슬로우 모션 — 보스 페이즈 전이 / 콤보 분석.' },
  { speed: 'half',    label: '0.5x',  multiplier: 0.5,  usageHint: '느린 재생 — 입력 타이밍 학습.' },
  { speed: 'normal',  label: '1x',    multiplier: 1.0,  usageHint: '표준 재생.' },
  { speed: 'double',  label: '2x',    multiplier: 2.0,  usageHint: '빠른 재생 — 긴 cinematic 빠르게 확인.' },
  { speed: 'quad',    label: '4x',    multiplier: 4.0,  usageHint: '최대 가속 — 디버그 / QA 빠른 검증.' },
];

export function getReplayPlaybackSpeedNarrative(speed: ReplayPlaybackSpeed): ReplayPlaybackSpeedNarrative | undefined {
  return SCENARIO_REPLAY_PLAYBACK_SPEEDS.find((s) => s.speed === speed);
}

export function listReplayPlaybackSpeedsAscending(): readonly ReplayPlaybackSpeedNarrative[] {
  return [...SCENARIO_REPLAY_PLAYBACK_SPEEDS].sort((a, b) => a.multiplier - b.multiplier);
}

// ════════════════════════════════════════════════════════════════
// SYNC-206: 개발용 치트 코드 SSOT — 5 종 (DEV_MODE 한정)
// ════════════════════════════════════════════════════════════════

export type CheatCodeKey = 'god_mode' | 'instant_kill' | 'teleport' | 'give_item' | 'skip_dialogue';

export interface CheatCodeNarrative {
  cheat: CheatCodeKey;
  command: string;
  label: string;
  effectDescription: string;
  activationRequirement: string;
}

export const SCENARIO_CHEAT_CODES: readonly CheatCodeNarrative[] = [
  { cheat: 'god_mode',      command: 'cheat.god',                    label: '무적 모드',  effectDescription: '모든 데미지 무효, HP/MP 무한.',              activationRequirement: 'DEV_MODE=true' },
  { cheat: 'instant_kill',  command: 'cheat.instakill',              label: '즉시 처치',  effectDescription: '모든 적을 1회 공격으로 처치.',                activationRequirement: 'DEV_MODE=true' },
  { cheat: 'teleport',      command: 'cheat.tp <zoneId>',            label: '순간 이동',  effectDescription: '지정한 zone 으로 즉시 이동.',                 activationRequirement: 'DEV_MODE=true' },
  { cheat: 'give_item',     command: 'cheat.give <itemId> <count>',  label: '아이템 지급', effectDescription: '지정한 아이템을 가방에 추가.',                activationRequirement: 'DEV_MODE=true' },
  { cheat: 'skip_dialogue', command: 'cheat.skipdlg',                label: '대화 스킵',  effectDescription: '진행 중인 모든 대화를 즉시 종료 + 분기 자동.', activationRequirement: 'DEV_MODE=true' },
];

export function getCheatCodeNarrative(cheat: CheatCodeKey): CheatCodeNarrative | undefined {
  return SCENARIO_CHEAT_CODES.find((c) => c.cheat === cheat);
}

export function listCheatCodeKeys(): readonly CheatCodeKey[] {
  return ['god_mode', 'instant_kill', 'teleport', 'give_item', 'skip_dialogue'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-207: 로컬라이제이션 폴백 규칙 SSOT — 4 규칙
// ════════════════════════════════════════════════════════════════

export type LocalizationFallbackRule = 'strict' | 'region_first' | 'english_default' | 'native_only';

export interface LocalizationFallbackRuleNarrative {
  rule: LocalizationFallbackRule;
  label: string;
  fallbackBehavior: string;
  recommendedUse: string;
}

export const SCENARIO_LOCALIZATION_FALLBACK_RULES: readonly LocalizationFallbackRuleNarrative[] = [
  {
    rule: 'strict',
    label: '엄격',
    fallbackBehavior: '번역 누락 시 [MISSING_KEY] placeholder 표시.',
    recommendedUse: '번역 검증 / QA 모드 — 누락 발견에 효과적.',
  },
  {
    rule: 'region_first',
    label: '지역 우선',
    fallbackBehavior: '같은 지역 (ko_KR → ko) → 영어 → key id 순서로 폴백.',
    recommendedUse: '다국어 베타 — 자연스러운 사용자 경험.',
  },
  {
    rule: 'english_default',
    label: '영어 기본',
    fallbackBehavior: '번역 누락 시 영어 (en_US) 으로 즉시 폴백.',
    recommendedUse: '국제 출시 표준 — 안정성 우선.',
  },
  {
    rule: 'native_only',
    label: '네이티브 전용',
    fallbackBehavior: '선택 로케일의 텍스트만 사용. 누락 시 빈 문자열.',
    recommendedUse: '한국어 단독 출시 / 완성도 100% 로케일만.',
  },
];

export function getLocalizationFallbackRuleNarrative(rule: LocalizationFallbackRule): LocalizationFallbackRuleNarrative | undefined {
  return SCENARIO_LOCALIZATION_FALLBACK_RULES.find((r) => r.rule === rule);
}

export function listLocalizationFallbackRules(): readonly LocalizationFallbackRule[] {
  return ['strict', 'region_first', 'english_default', 'native_only'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-208: A/B 테스트 변형 SSOT — 4 변형 (분포 합 = 1.0)
// ════════════════════════════════════════════════════════════════

export type AbTestVariantKey = 'control' | 'variant_a' | 'variant_b' | 'variant_c';

export interface AbTestVariantNarrative {
  variant: AbTestVariantKey;
  label: string;
  trafficWeight: number;
  description: string;
}

export const SCENARIO_AB_TEST_VARIANTS: readonly AbTestVariantNarrative[] = [
  { variant: 'control',   label: '대조군', trafficWeight: 0.4, description: '기존 표준 — 측정 baseline.' },
  { variant: 'variant_a', label: '변형 A', trafficWeight: 0.2, description: '실험 가설 1 — 1차 변경 적용.' },
  { variant: 'variant_b', label: '변형 B', trafficWeight: 0.2, description: '실험 가설 2 — 2차 변경 적용.' },
  { variant: 'variant_c', label: '변형 C', trafficWeight: 0.2, description: '실험 가설 3 — 3차 변경 적용.' },
];

export function getAbTestVariantNarrative(variant: AbTestVariantKey): AbTestVariantNarrative | undefined {
  return SCENARIO_AB_TEST_VARIANTS.find((v) => v.variant === variant);
}

export function getTotalAbTestTrafficWeight(): number {
  return SCENARIO_AB_TEST_VARIANTS.reduce((sum, v) => sum + v.trafficWeight, 0);
}

// ════════════════════════════════════════════════════════════════
// SYNC-209: 사용자 피드백 카테고리 SSOT — 5 카테고리
// 인게임 피드백 폼 + 라우팅 + 우선순위.
// ════════════════════════════════════════════════════════════════

export type UserFeedbackCategory = 'bug' | 'balance' | 'feature' | 'translation' | 'praise';

export interface UserFeedbackCategoryNarrative {
  category: UserFeedbackCategory;
  label: string;
  routingDestination: string;
  priority: number;
  placeholderHint: string;
}

export const SCENARIO_USER_FEEDBACK_CATEGORIES: readonly UserFeedbackCategoryNarrative[] = [
  { category: 'bug',         label: '버그',     routingDestination: 'engineering',   priority: 1, placeholderHint: '재현 단계, 발생 zone, 빌드 정보를 적어 주세요.' },
  { category: 'balance',     label: '밸런스',   routingDestination: 'game_design',   priority: 2, placeholderHint: '어떤 상황에서 부족/과도하다고 느꼈는지 적어 주세요.' },
  { category: 'feature',     label: '기능 제안', routingDestination: 'product',      priority: 3, placeholderHint: '제안 내용과 어떤 문제를 해결하는지 적어 주세요.' },
  { category: 'translation', label: '번역',     routingDestination: 'localization', priority: 2, placeholderHint: '문제 텍스트와 권장 번역을 적어 주세요.' },
  { category: 'praise',      label: '칭찬',     routingDestination: 'community',    priority: 4, placeholderHint: '어떤 부분이 좋았는지 자유롭게 적어 주세요.' },
];

export function getUserFeedbackCategoryNarrative(category: UserFeedbackCategory): UserFeedbackCategoryNarrative | undefined {
  return SCENARIO_USER_FEEDBACK_CATEGORIES.find((c) => c.category === category);
}

export function listUserFeedbackCategoriesByPriority(): readonly UserFeedbackCategoryNarrative[] {
  return [...SCENARIO_USER_FEEDBACK_CATEGORIES].sort((a, b) => a.priority - b.priority);
}

// ════════════════════════════════════════════════════════════════
// SYNC-210: 🎯 콘텐츠 등급 라벨 SSOT — 5 등급 (한국 게임물관리위원회 기반)
// ════════════════════════════════════════════════════════════════

export type ContentRating = 'all' | 'twelve_plus' | 'fifteen_plus' | 'teen' | 'mature';

export interface ContentRatingNarrative {
  rating: ContentRating;
  label: string;
  minAge: number;
  uiColor: string;
  reason: string;
}

export const SCENARIO_CONTENT_RATING_LABELS: readonly ContentRatingNarrative[] = [
  { rating: 'all',          label: '전체 이용가',    minAge: 0,  uiColor: '#5fbf5f', reason: '폭력성 / 선정성 없음. 전 연령 권장.' },
  { rating: 'twelve_plus',  label: '12세 이용가',    minAge: 12, uiColor: '#9fcf5f', reason: '약한 판타지 폭력 / 단순 대결 묘사.' },
  { rating: 'fifteen_plus', label: '15세 이용가',    minAge: 15, uiColor: '#ffb720', reason: '전투 묘사 + 캐릭터 사망 + 어두운 narrative.' },
  { rating: 'teen',         label: '청소년 이용가',  minAge: 17, uiColor: '#ff8040', reason: '강한 전투 묘사 + 동료 배신 / 죽음 서사.' },
  { rating: 'mature',       label: '청소년 이용불가', minAge: 19, uiColor: '#d04040', reason: '강한 폭력 / 묘사 + 성인 주제. NG+3 이상 잠금 컨텐츠 포함.' },
];

export function getContentRatingNarrative(rating: ContentRating): ContentRatingNarrative | undefined {
  return SCENARIO_CONTENT_RATING_LABELS.find((r) => r.rating === rating);
}

export function classifyContentRatingByAge(age: number): ContentRatingNarrative {
  const ascending = [...SCENARIO_CONTENT_RATING_LABELS].sort((a, b) => a.minAge - b.minAge);
  let current = ascending[0];
  for (const r of ascending) {
    if (age >= r.minAge) current = r;
  }
  return current;
}

// ════════════════════════════════════════════════════════════════
// SYNC-211: 네트워크 지역 라벨 SSOT — 5 지역
// 서버 region + 평균 ping + cloud save endpoint.
// ════════════════════════════════════════════════════════════════

export type NetworkRegion = 'asia_kr' | 'asia_jp' | 'asia_sea' | 'na_us' | 'eu_west';

export interface NetworkRegionNarrative {
  region: NetworkRegion;
  label: string;
  /** 평균 ping (ms, KR 기준) */
  averagePingFromKR: number;
  endpointHost: string;
}

export const SCENARIO_NETWORK_REGION_LABELS: readonly NetworkRegionNarrative[] = [
  { region: 'asia_kr',  label: '아시아-한국',     averagePingFromKR: 15,  endpointHost: 'kr.aeterna.io' },
  { region: 'asia_jp',  label: '아시아-일본',     averagePingFromKR: 35,  endpointHost: 'jp.aeterna.io' },
  { region: 'asia_sea', label: '아시아-동남아',   averagePingFromKR: 90,  endpointHost: 'sea.aeterna.io' },
  { region: 'na_us',    label: '북미-미국',       averagePingFromKR: 150, endpointHost: 'us.aeterna.io' },
  { region: 'eu_west',  label: '유럽-서부',       averagePingFromKR: 230, endpointHost: 'eu.aeterna.io' },
];

export function getNetworkRegionNarrative(region: NetworkRegion): NetworkRegionNarrative | undefined {
  return SCENARIO_NETWORK_REGION_LABELS.find((r) => r.region === region);
}

export function getOptimalRegionFromKR(): NetworkRegionNarrative {
  return [...SCENARIO_NETWORK_REGION_LABELS].sort((a, b) => a.averagePingFromKR - b.averagePingFromKR)[0];
}

// ════════════════════════════════════════════════════════════════
// SYNC-212: 친구 상태 라벨 SSOT — 4 상태
// ════════════════════════════════════════════════════════════════

export type FriendStatus = 'online' | 'away' | 'in_game' | 'offline';

export interface FriendStatusNarrative {
  status: FriendStatus;
  label: string;
  indicatorColor: string;
  canInteract: boolean;
  displayMessage: string;
}

export const SCENARIO_FRIEND_STATUS_LABELS: readonly FriendStatusNarrative[] = [
  { status: 'online',  label: '온라인',    indicatorColor: '#5fbf5f', canInteract: true,  displayMessage: '온라인 — 채팅 / 초대 가능.' },
  { status: 'away',    label: '자리비움',  indicatorColor: '#ffb720', canInteract: true,  displayMessage: '자리비움 — 메시지는 전송되지만 응답 지연 가능.' },
  { status: 'in_game', label: '게임 중',   indicatorColor: '#5f9fff', canInteract: false, displayMessage: '게임 중 — 일시정지 시까지 응답 지연.' },
  { status: 'offline', label: '오프라인',  indicatorColor: '#808080', canInteract: false, displayMessage: '오프라인 — 메시지는 다음 로그인 시 전달.' },
];

export function getFriendStatusNarrative(status: FriendStatus): FriendStatusNarrative | undefined {
  return SCENARIO_FRIEND_STATUS_LABELS.find((s) => s.status === status);
}

export function listFriendStatuses(): readonly FriendStatus[] {
  return ['online', 'away', 'in_game', 'offline'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-213: 푸시 알림 카테고리 SSOT — 4 카테고리
// ════════════════════════════════════════════════════════════════

export type PushNotificationCategory = 'event' | 'friend' | 'quest' | 'system';

export interface PushNotificationCategoryNarrative {
  category: PushNotificationCategory;
  label: string;
  defaultOptIn: boolean;
  dailyMaxCount: number;
  exampleMessage: string;
}

export const SCENARIO_PUSH_NOTIFICATION_CATEGORIES: readonly PushNotificationCategoryNarrative[] = [
  { category: 'event',  label: '이벤트',  defaultOptIn: true,  dailyMaxCount: 3,  exampleMessage: '오늘의 새 이벤트가 시작되었습니다.' },
  { category: 'friend', label: '친구',    defaultOptIn: true,  dailyMaxCount: 20, exampleMessage: '친구가 게임을 시작했습니다.' },
  { category: 'quest',  label: '퀘스트',  defaultOptIn: false, dailyMaxCount: 5,  exampleMessage: '진행 중인 퀘스트가 곧 만료됩니다.' },
  { category: 'system', label: '시스템',  defaultOptIn: true,  dailyMaxCount: 2,  exampleMessage: '게임 업데이트가 준비되었습니다.' },
];

export function getPushNotificationCategoryNarrative(category: PushNotificationCategory): PushNotificationCategoryNarrative | undefined {
  return SCENARIO_PUSH_NOTIFICATION_CATEGORIES.find((c) => c.category === category);
}

export function listPushNotificationCategories(): readonly PushNotificationCategory[] {
  return ['event', 'friend', 'quest', 'system'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-214: 리더보드 카테고리 SSOT — 5 카테고리
// ════════════════════════════════════════════════════════════════

export type LeaderboardCategory = 'speedrun' | 'highscore' | 'combo' | 'no_death' | 'no_damage';

export interface LeaderboardCategoryNarrative {
  category: LeaderboardCategory;
  label: string;
  sortDirection: 'asc' | 'desc';
  recordUnit: string;
  qualificationRequirement: string;
}

export const SCENARIO_LEADERBOARD_CATEGORIES: readonly LeaderboardCategoryNarrative[] = [
  { category: 'speedrun',   label: '스피드런',     sortDirection: 'asc',  recordUnit: 'HH:MM:SS', qualificationRequirement: '챕터 1~5 완주 + 100% 진행률 도달.' },
  { category: 'highscore',  label: '최고 점수',    sortDirection: 'desc', recordUnit: '점수',     qualificationRequirement: '엔딩 A~D 중 하나 도달.' },
  { category: 'combo',      label: '최대 콤보',    sortDirection: 'desc', recordUnit: '콤보 수',  qualificationRequirement: '단일 전투에서 콤보 50회 이상.' },
  { category: 'no_death',   label: '논데스 클리어', sortDirection: 'asc',  recordUnit: '플레이 시간', qualificationRequirement: '챕터 1~5 완주 + 사망 0회.' },
  { category: 'no_damage',  label: '노데미지 보스', sortDirection: 'asc',  recordUnit: '플레이 시간', qualificationRequirement: '보스전 1~5 중 1개 이상 노데미지 클리어.' },
];

export function getLeaderboardCategoryNarrative(category: LeaderboardCategory): LeaderboardCategoryNarrative | undefined {
  return SCENARIO_LEADERBOARD_CATEGORIES.find((c) => c.category === category);
}

export function listLeaderboardCategories(): readonly LeaderboardCategory[] {
  return ['speedrun', 'highscore', 'combo', 'no_death', 'no_damage'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-215: 🎯 PvP 랭크 tier SSOT — 6 tier (bronze~mythic)
// ════════════════════════════════════════════════════════════════

export type PvpRankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'mythic';

export interface PvpRankTierNarrative {
  tier: PvpRankTier;
  label: string;
  minElo: number;
  uiColor: string;
  seasonRewardHint: string;
}

export const SCENARIO_PVP_RANK_TIERS: readonly PvpRankTierNarrative[] = [
  { tier: 'bronze',   label: '브론즈',   minElo: 0,    uiColor: '#a07040', seasonRewardHint: '시즌 종료 시 청동 도전과제 + 일반 자원.' },
  { tier: 'silver',   label: '실버',     minElo: 800,  uiColor: '#bfbfbf', seasonRewardHint: '시즌 종료 시 은 도전과제 + uncommon 자원 ×5.' },
  { tier: 'gold',     label: '골드',     minElo: 1500, uiColor: '#ffb720', seasonRewardHint: '시즌 종료 시 금 도전과제 + rare 자원 ×3.' },
  { tier: 'platinum', label: '플래티넘', minElo: 2200, uiColor: '#5fc0ff', seasonRewardHint: '시즌 종료 시 epic 장비 ×1 + 특수 cosmetic.' },
  { tier: 'diamond',  label: '다이아',   minElo: 2800, uiColor: '#bf5fff', seasonRewardHint: '시즌 종료 시 legendary 장비 ×1 + 한정 칭호.' },
  { tier: 'mythic',   label: '미씩',     minElo: 3500, uiColor: '#ffd57f', seasonRewardHint: '시즌 종료 시 세계 100위 한정 — 신화 장비 + 영구 칭호.' },
];

export function getPvpRankTierNarrative(tier: PvpRankTier): PvpRankTierNarrative | undefined {
  return SCENARIO_PVP_RANK_TIERS.find((t) => t.tier === tier);
}

export function classifyPvpRankByElo(elo: number): PvpRankTierNarrative {
  const ascending = [...SCENARIO_PVP_RANK_TIERS].sort((a, b) => a.minElo - b.minElo);
  let current = ascending[0];
  for (const t of ascending) {
    if (elo >= t.minElo) current = t;
  }
  return current;
}

// ════════════════════════════════════════════════════════════════
// SYNC-216: 거래 제안 상태 SSOT — 4 상태
// ════════════════════════════════════════════════════════════════

export type TradeOfferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface TradeOfferStatusNarrative {
  status: TradeOfferStatus;
  label: string;
  indicatorColor: string;
  allowedActions: readonly string[];
  displayMessage: string;
}

export const SCENARIO_TRADE_OFFER_STATUSES: readonly TradeOfferStatusNarrative[] = [
  { status: 'pending',   label: '대기 중',  indicatorColor: '#ffb720', allowedActions: ['accept', 'reject', 'cancel'], displayMessage: '거래 제안 응답 대기 중 — 60초 후 자동 취소.' },
  { status: 'accepted',  label: '수락됨',   indicatorColor: '#5fbf5f', allowedActions: ['view_log'],                   displayMessage: '거래가 완료되었습니다 — 가방을 확인하세요.' },
  { status: 'rejected',  label: '거절됨',   indicatorColor: '#d04040', allowedActions: ['view_log', 'send_new'],       displayMessage: '거래 제안이 거절되었습니다.' },
  { status: 'cancelled', label: '취소됨',   indicatorColor: '#808080', allowedActions: ['view_log', 'send_new'],       displayMessage: '거래가 취소되었습니다 — 자원은 반환되었습니다.' },
];

export function getTradeOfferStatusNarrative(status: TradeOfferStatus): TradeOfferStatusNarrative | undefined {
  return SCENARIO_TRADE_OFFER_STATUSES.find((s) => s.status === status);
}

export function listTradeOfferStatuses(): readonly TradeOfferStatus[] {
  return ['pending', 'accepted', 'rejected', 'cancelled'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-217: 탈것 타입 SSOT — 5 종
// ════════════════════════════════════════════════════════════════

export type MountType = 'horse' | 'ostrich' | 'dragon' | 'airship' | 'teleport_stone';

export interface MountTypeNarrative {
  mount: MountType;
  label: string;
  speedMultiplier: number;
  unlockRequirement: string;
  usageHint: string;
}

export const SCENARIO_MOUNT_TYPES: readonly MountTypeNarrative[] = [
  { mount: 'horse',          label: '말',          speedMultiplier: 1.5, unlockRequirement: '칸텔라 마을 마구간 quest 완료.',           usageHint: '필드 표준 탈것 — 모든 zone 사용 가능.' },
  { mount: 'ostrich',        label: '타조',        speedMultiplier: 2.0, unlockRequirement: '솔라리스 사막 quest 완료.',                 usageHint: '사막/모래 지대 전용.' },
  { mount: 'dragon',         label: '드래곤',      speedMultiplier: 3.0, unlockRequirement: '엔딩 A 도달 + NG+1 진입.',                  usageHint: '비행 가능 — 고원/탑 영역 직접 이동.' },
  { mount: 'airship',        label: '비공정',      speedMultiplier: 4.0, unlockRequirement: '챕터 5 완료 + 모든 zone 발견.',             usageHint: '맵 자유 이동 — fast travel 대체.' },
  { mount: 'teleport_stone', label: '순간이동석',  speedMultiplier: 999, unlockRequirement: 'fast travel hub 발견 후 자동.',             usageHint: '발견한 hub 간 즉시 이동.' },
];

export function getMountTypeNarrative(mount: MountType): MountTypeNarrative | undefined {
  return SCENARIO_MOUNT_TYPES.find((m) => m.mount === mount);
}

export function listMountTypesBySpeed(): readonly MountTypeNarrative[] {
  return [...SCENARIO_MOUNT_TYPES].sort((a, b) => a.speedMultiplier - b.speedMultiplier);
}

// ════════════════════════════════════════════════════════════════
// SYNC-218: 친밀도 레벨 SSOT — 5 레벨
// ════════════════════════════════════════════════════════════════

export type FriendshipLevel = 'stranger' | 'acquaintance' | 'friend' | 'close' | 'best_friend';

export interface FriendshipLevelNarrative {
  level: FriendshipLevel;
  label: string;
  minScore: number;
  unlockedInteractions: readonly string[];
}

export const SCENARIO_FRIENDSHIP_LEVELS: readonly FriendshipLevelNarrative[] = [
  { level: 'stranger',     label: '낯선이',  minScore: 0,   unlockedInteractions: ['일반 대화'] },
  { level: 'acquaintance', label: '지인',    minScore: 20,  unlockedInteractions: ['일반 대화', '간단한 의뢰'] },
  { level: 'friend',       label: '친구',    minScore: 50,  unlockedInteractions: ['일반 대화', '의뢰', '선물 교환'] },
  { level: 'close',        label: '가까운',  minScore: 100, unlockedInteractions: ['일반 대화', '의뢰', '선물 교환', '개인 quest 잠금 해제'] },
  { level: 'best_friend',  label: '절친',    minScore: 200, unlockedInteractions: ['일반 대화', '의뢰', '선물 교환', '개인 quest 잠금 해제', '엔딩 분기 영향', '동료 모집'] },
];

export function getFriendshipLevelNarrative(level: FriendshipLevel): FriendshipLevelNarrative | undefined {
  return SCENARIO_FRIENDSHIP_LEVELS.find((l) => l.level === level);
}

export function classifyFriendshipByScore(score: number): FriendshipLevelNarrative {
  const ascending = [...SCENARIO_FRIENDSHIP_LEVELS].sort((a, b) => a.minScore - b.minScore);
  let current = ascending[0];
  for (const l of ascending) {
    if (score >= l.minScore) current = l;
  }
  return current;
}

// ════════════════════════════════════════════════════════════════
// SYNC-219: 상점 새로고침 주기 SSOT — 4 주기
// ════════════════════════════════════════════════════════════════

export type ShopRefreshInterval = 'hourly' | 'daily' | 'weekly' | 'event';

export interface ShopRefreshIntervalNarrative {
  interval: ShopRefreshInterval;
  label: string;
  refreshMinutes: number;
  inventorySize: number;
  uiHint: string;
}

export const SCENARIO_SHOP_REFRESH_INTERVALS: readonly ShopRefreshIntervalNarrative[] = [
  { interval: 'hourly', label: '시간별',    refreshMinutes: 60,        inventorySize: 5,  uiHint: '일반 상점 — 매 시간 자동 새로고침.' },
  { interval: 'daily',  label: '일간',      refreshMinutes: 1440,      inventorySize: 10, uiHint: '도시 중심 대형 상점 — 매일 자정 새로고침.' },
  { interval: 'weekly', label: '주간',      refreshMinutes: 10080,     inventorySize: 15, uiHint: '평판 잠금 한정 상점 — 매주 월요일 새로고침.' },
  { interval: 'event',  label: '이벤트',    refreshMinutes: 0,         inventorySize: 8,  uiHint: '이벤트 한정 — 이벤트 종료 시 재고 사라짐.' },
];

export function getShopRefreshIntervalNarrative(interval: ShopRefreshInterval): ShopRefreshIntervalNarrative | undefined {
  return SCENARIO_SHOP_REFRESH_INTERVALS.find((i) => i.interval === interval);
}

export function listShopRefreshIntervals(): readonly ShopRefreshInterval[] {
  return ['hourly', 'daily', 'weekly', 'event'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-220: 🎯 캘린더 이벤트 타입 SSOT — 5 종
// ════════════════════════════════════════════════════════════════

export type CalendarEventType = 'seasonal' | 'weekly_challenge' | 'community' | 'maintenance' | 'lore';

export interface CalendarEventTypeNarrative {
  event: CalendarEventType;
  label: string;
  averageDurationDays: number;
  notificationPriority: number;
  description: string;
}

export const SCENARIO_CALENDAR_EVENT_TYPES: readonly CalendarEventTypeNarrative[] = [
  { event: 'seasonal',         label: '시즌',       averageDurationDays: 30, notificationPriority: 2, description: '계절 한정 — 시즌 보상 / 한정 NPC.' },
  { event: 'weekly_challenge', label: '주간 도전',  averageDurationDays: 7,  notificationPriority: 1, description: '매주 갱신 — 누적 시 추가 보상.' },
  { event: 'community',        label: '커뮤니티',   averageDurationDays: 14, notificationPriority: 2, description: '전 세계 플레이어 협력 — 목표 달성 시 모두 보상.' },
  { event: 'maintenance',      label: '점검',       averageDurationDays: 1,  notificationPriority: 1, description: '서버 점검 — 게임 일시 중단 + 보상 지급.' },
  { event: 'lore',             label: '세계관',     averageDurationDays: 3,  notificationPriority: 3, description: '세계관 이벤트 — 한정 lore 단서 + 챕터 분기 영향.' },
];

export function getCalendarEventTypeNarrative(event: CalendarEventType): CalendarEventTypeNarrative | undefined {
  return SCENARIO_CALENDAR_EVENT_TYPES.find((e) => e.event === event);
}

export function listCalendarEventTypesByPriority(): readonly CalendarEventTypeNarrative[] {
  return [...SCENARIO_CALENDAR_EVENT_TYPES].sort((a, b) => a.notificationPriority - b.notificationPriority);
}

// ════════════════════════════════════════════════════════════════
// SYNC-221: 시즌 사이클 phase SSOT — 4 phase (start/active/closing/break)
// 시즌 전체 흐름 + 각 phase 길이 + 플레이어 액션 hint.
// ════════════════════════════════════════════════════════════════

export type SeasonCyclePhase = 'start' | 'active' | 'closing' | 'break';

export interface SeasonCyclePhaseNarrative {
  phase: SeasonCyclePhase;
  label: string;
  /** phase 길이 (일) */
  durationDays: number;
  /** 권장 액션 */
  recommendedAction: string;
}

export const SCENARIO_SEASON_CYCLE_PHASES: readonly SeasonCyclePhaseNarrative[] = [
  { phase: 'start',   label: '시작',   durationDays: 3,  recommendedAction: '시즌 패스 / 첫 보상 수령 + 신규 컨텐츠 확인.' },
  { phase: 'active',  label: '진행',   durationDays: 21, recommendedAction: '주간 도전 + 랭크 매치 + 시즌 quest 완주.' },
  { phase: 'closing', label: '마감',   durationDays: 5,  recommendedAction: '미완료 보상 수령 + 시즌 랭크 확정.' },
  { phase: 'break',   label: '휴식',   durationDays: 1,  recommendedAction: '다음 시즌 대비 — 빌드 정리 / 자원 정렬.' },
];

export function getSeasonCyclePhaseNarrative(phase: SeasonCyclePhase): SeasonCyclePhaseNarrative | undefined {
  return SCENARIO_SEASON_CYCLE_PHASES.find((p) => p.phase === phase);
}

export function getSeasonTotalDurationDays(): number {
  return SCENARIO_SEASON_CYCLE_PHASES.reduce((sum, p) => sum + p.durationDays, 0);
}

// ════════════════════════════════════════════════════════════════
// SYNC-222: 길드 raid tier SSOT — 4 tier (PvpRankTier cross)
// ════════════════════════════════════════════════════════════════

export type GuildRaidTier = 'normal' | 'hard' | 'nightmare' | 'legendary';

export interface GuildRaidTierNarrative {
  tier: GuildRaidTier;
  label: string;
  recommendedPlayerCount: number;
  bossHpMultiplier: number;
  recommendedRankTier: PvpRankTier;
  rewardHint: string;
}

export const SCENARIO_GUILD_RAID_TIERS: readonly GuildRaidTierNarrative[] = [
  { tier: 'normal',    label: '일반',   recommendedPlayerCount: 8,  bossHpMultiplier: 1,  recommendedRankTier: 'silver',   rewardHint: 'uncommon 보상 + 길드 기여도 +5.' },
  { tier: 'hard',      label: '어려움', recommendedPlayerCount: 10, bossHpMultiplier: 2,  recommendedRankTier: 'gold',     rewardHint: 'rare 보상 + 길드 기여도 +15.' },
  { tier: 'nightmare', label: '악몽',   recommendedPlayerCount: 16, bossHpMultiplier: 4,  recommendedRankTier: 'platinum', rewardHint: 'epic 보상 + 길드 기여도 +40.' },
  { tier: 'legendary', label: '전설',   recommendedPlayerCount: 24, bossHpMultiplier: 10, recommendedRankTier: 'diamond',  rewardHint: 'legendary 보상 + 길드 기여도 +100 + 영구 칭호.' },
];

export function getGuildRaidTierNarrative(tier: GuildRaidTier): GuildRaidTierNarrative | undefined {
  return SCENARIO_GUILD_RAID_TIERS.find((t) => t.tier === tier);
}

export function listGuildRaidTiersAscending(): readonly GuildRaidTier[] {
  return ['normal', 'hard', 'nightmare', 'legendary'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-223: 보상 화폐 SSOT — 5 종
// ════════════════════════════════════════════════════════════════

export type RewardCurrencyKind = 'gold' | 'honor' | 'seal' | 'aether_crystal' | 'seasonal_token';

export interface RewardCurrencyNarrative {
  currency: RewardCurrencyKind;
  label: string;
  symbol: string;
  primarySource: string;
  primarySink: string;
}

export const SCENARIO_QUEST_REWARD_CURRENCIES: readonly RewardCurrencyNarrative[] = [
  { currency: 'gold',           label: '금화',       symbol: 'G', primarySource: '일반 적 처치 / 일반 quest 보상.',           primarySink: '일반 상점 거래 / 장비 강화.' },
  { currency: 'honor',          label: '명예',       symbol: 'H', primarySource: '엘리트 적 / PvP 매치 승리.',                 primarySink: '평판 잠금 상점 / 길드 raid 입장권.' },
  { currency: 'seal',           label: '봉인 인장',  symbol: '✚', primarySource: '보스 처치 / 파편 회수.',                     primarySink: 'epic 장비 제작 / 봉인 의식 자료.' },
  { currency: 'aether_crystal', label: '에테르 결정', symbol: '◆', primarySource: '특수 zone 채광 / 신전 보상.',               primarySink: 'legendary 장비 / 시간 수호자 스킬 강화.' },
  { currency: 'seasonal_token', label: '시즌 토큰',  symbol: '★', primarySource: '시즌 도전 / 주간 challenge / 시즌 quest.',  primarySink: '시즌 한정 상점 (시즌 종료 시 사라짐).' },
];

export function getRewardCurrencyNarrative(currency: RewardCurrencyKind): RewardCurrencyNarrative | undefined {
  return SCENARIO_QUEST_REWARD_CURRENCIES.find((c) => c.currency === currency);
}

export function listRewardCurrencies(): readonly RewardCurrencyKind[] {
  return ['gold', 'honor', 'seal', 'aether_crystal', 'seasonal_token'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-224: 파티 슬롯 구성 SSOT — 4 구성 (solo/duo/trio/full_party)
// ════════════════════════════════════════════════════════════════

export type PartyRosterSize = 'solo' | 'duo' | 'trio' | 'full_party';

export interface PartyRosterSizeNarrative {
  size: PartyRosterSize;
  label: string;
  slotCount: number;
  unlockRequirement: string;
  modifierSummary: string;
}

export const SCENARIO_PARTY_ROSTER_SIZES: readonly PartyRosterSizeNarrative[] = [
  { size: 'solo',       label: '단독',     slotCount: 1, unlockRequirement: '기본 진입.',                                  modifierSummary: '경험치 +30%, 받는 피해 +25%.' },
  { size: 'duo',        label: '듀오',     slotCount: 2, unlockRequirement: '동료 1명 합류 후 (chapter 1 중반).',           modifierSummary: '받는 피해 -5%, 콤보 기여 +10%.' },
  { size: 'trio',       label: '트리오',   slotCount: 3, unlockRequirement: '동료 2명 합류 후 (chapter 2).',                modifierSummary: '받는 피해 -10%, 콤보 기여 +20%, 보스 페이즈 -1 가능.' },
  { size: 'full_party', label: '풀 파티',  slotCount: 4, unlockRequirement: '동료 3명 + 4번 동료 슬롯 잠금 해제 quest.',    modifierSummary: '받는 피해 -15%, 모든 ATB 보조 +5%, 파티 오라 효과 적용.' },
];

export function getPartyRosterSizeNarrative(size: PartyRosterSize): PartyRosterSizeNarrative | undefined {
  return SCENARIO_PARTY_ROSTER_SIZES.find((s) => s.size === size);
}

export function listPartyRosterSizes(): readonly PartyRosterSize[] {
  return ['solo', 'duo', 'trio', 'full_party'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-225: 🎯 거래 오류 코드 SSOT — 5 코드
// ════════════════════════════════════════════════════════════════

export type TransactionErrorCode =
  | 'insufficient_funds' | 'item_locked' | 'inventory_full' | 'partner_offline' | 'rate_limit';

export interface TransactionErrorCodeNarrative {
  code: TransactionErrorCode;
  httpStatus: number;
  label: string;
  userMessage: string;
  recoveryHint: string;
}

export const SCENARIO_TRANSACTION_ERROR_CODES: readonly TransactionErrorCodeNarrative[] = [
  { code: 'insufficient_funds', httpStatus: 402, label: '자금 부족',     userMessage: '화폐가 부족합니다.',                     recoveryHint: '필요한 화폐를 채집/quest 로 확보 후 재시도.' },
  { code: 'item_locked',        httpStatus: 423, label: '아이템 잠금',  userMessage: '아이템이 잠금 상태입니다.',              recoveryHint: '평판/quest 잠금 해제 후 재시도.' },
  { code: 'inventory_full',     httpStatus: 409, label: '가방 가득',    userMessage: '가방이 가득 차 있습니다.',               recoveryHint: '가방 정리 또는 lower priority 자원 폐기 후 재시도.' },
  { code: 'partner_offline',    httpStatus: 410, label: '상대 오프라인', userMessage: '거래 상대가 오프라인 상태입니다.',       recoveryHint: '상대가 다시 온라인이 될 때까지 대기 / 다른 거래 상대.' },
  { code: 'rate_limit',         httpStatus: 429, label: '요청 과다',    userMessage: '거래 시도가 너무 많습니다.',             recoveryHint: '60초 후 재시도. 자동 거래 봇 의심 시 신고.' },
];

export function getTransactionErrorCodeNarrative(code: TransactionErrorCode): TransactionErrorCodeNarrative | undefined {
  return SCENARIO_TRANSACTION_ERROR_CODES.find((c) => c.code === code);
}

export function listTransactionErrorCodes(): readonly TransactionErrorCode[] {
  return ['insufficient_funds', 'item_locked', 'inventory_full', 'partner_offline', 'rate_limit'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-226: 인스턴스 던전 난이도 SSOT — 4 난이도
// ════════════════════════════════════════════════════════════════

export type InstanceDungeonDifficulty = 'story' | 'normal' | 'heroic' | 'mythic';

export interface InstanceDungeonDifficultyNarrative {
  difficulty: InstanceDungeonDifficulty;
  label: string;
  recommendedLevel: number;
  dailyEntryLimit: number;
  rewardHint: string;
}

export const SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES: readonly InstanceDungeonDifficultyNarrative[] = [
  { difficulty: 'story',  label: '스토리',  recommendedLevel: 10, dailyEntryLimit: 999, rewardHint: '스토리 진행 보상만 — 자원 적음.' },
  { difficulty: 'normal', label: '일반',    recommendedLevel: 20, dailyEntryLimit: 5,   rewardHint: 'uncommon 자원 ×3 + 일일 quest 진행.' },
  { difficulty: 'heroic', label: '영웅',    recommendedLevel: 25, dailyEntryLimit: 3,   rewardHint: 'rare 결정 ×1 + epic 장비 chance.' },
  { difficulty: 'mythic', label: '신화',    recommendedLevel: 30, dailyEntryLimit: 1,   rewardHint: 'epic 장비 ×1 + legendary 자원 chance.' },
];

export function getInstanceDungeonDifficultyNarrative(difficulty: InstanceDungeonDifficulty): InstanceDungeonDifficultyNarrative | undefined {
  return SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES.find((d) => d.difficulty === difficulty);
}

export function listInstanceDungeonDifficulties(): readonly InstanceDungeonDifficulty[] {
  return ['story', 'normal', 'heroic', 'mythic'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-227: 플레이어 칭호 카테고리 SSOT — 5 카테고리
// ════════════════════════════════════════════════════════════════

export type PlayerTitleCategory = 'achievement' | 'pvp' | 'seasonal' | 'lore' | 'special';

export interface PlayerTitleCategoryNarrative {
  category: PlayerTitleCategory;
  label: string;
  uiColor: string;
  source: string;
  permanent: boolean;
}

export const SCENARIO_PLAYER_TITLE_CATEGORIES: readonly PlayerTitleCategoryNarrative[] = [
  { category: 'achievement', label: '도전',     uiColor: '#ffb720', source: '도전과제 잠금 해제.',                       permanent: true },
  { category: 'pvp',         label: 'PvP',     uiColor: '#d04040', source: 'PvP 시즌 종료 시 랭크 기준.',                permanent: false },
  { category: 'seasonal',    label: '시즌',     uiColor: '#bf5fff', source: '시즌 이벤트 / 누적 challenge 완수.',         permanent: false },
  { category: 'lore',        label: '세계관',   uiColor: '#5fbf5f', source: '메인 quest / 엔딩 분기 / 4 파편 회수.',      permanent: true },
  { category: 'special',     label: '특수',     uiColor: '#40b0e0', source: '개발자 부여 / 한정 이벤트 / 베타 참가자.',   permanent: true },
];

export function getPlayerTitleCategoryNarrative(category: PlayerTitleCategory): PlayerTitleCategoryNarrative | undefined {
  return SCENARIO_PLAYER_TITLE_CATEGORIES.find((c) => c.category === category);
}

export function listPermanentTitleCategories(): readonly PlayerTitleCategoryNarrative[] {
  return SCENARIO_PLAYER_TITLE_CATEGORIES.filter((c) => c.permanent);
}

// ════════════════════════════════════════════════════════════════
// SYNC-228: 이모트 카테고리 SSOT — 4 카테고리
// ════════════════════════════════════════════════════════════════

export type EmoteCategory = 'greeting' | 'celebration' | 'taunt' | 'communication';

export interface EmoteCategoryNarrative {
  category: EmoteCategory;
  label: string;
  averageEmoteCount: number;
  allowedInPvp: boolean;
  description: string;
}

export const SCENARIO_EMOTE_CATEGORIES: readonly EmoteCategoryNarrative[] = [
  { category: 'greeting',      label: '인사',     averageEmoteCount: 6,  allowedInPvp: true,  description: '안녕 / 잘 가 / 손 흔들기 등 친근 표현.' },
  { category: 'celebration',   label: '축하',     averageEmoteCount: 8,  allowedInPvp: true,  description: '승리 / 박수 / 점프 — 도전 성공 시 표현.' },
  { category: 'taunt',         label: '도발',     averageEmoteCount: 4,  allowedInPvp: true,  description: '도발 / 비웃음 — PvP 매치에서 적에게 사용.' },
  { category: 'communication', label: '소통',     averageEmoteCount: 10, allowedInPvp: false, description: '도움 요청 / 집결 / 잠시 대기 등 협동 표현.' },
];

export function getEmoteCategoryNarrative(category: EmoteCategory): EmoteCategoryNarrative | undefined {
  return SCENARIO_EMOTE_CATEGORIES.find((c) => c.category === category);
}

export function listPvpAllowedEmoteCategories(): readonly EmoteCategoryNarrative[] {
  return SCENARIO_EMOTE_CATEGORIES.filter((c) => c.allowedInPvp);
}

// ════════════════════════════════════════════════════════════════
// SYNC-229: 포토 모드 필터 SSOT — 5 필터
// ════════════════════════════════════════════════════════════════

export type PhotoModeFilter = 'none' | 'sepia' | 'noir' | 'vintage' | 'neon';

export interface PhotoModeFilterNarrative {
  filter: PhotoModeFilter;
  label: string;
  cssFilter: string;
  moodHint: string;
}

export const SCENARIO_PHOTO_MODE_FILTERS: readonly PhotoModeFilterNarrative[] = [
  { filter: 'none',    label: '원본',     cssFilter: 'none',                                          moodHint: '원본 그대로 — 후보정 없이 자연스러운 결.' },
  { filter: 'sepia',   label: '세피아',   cssFilter: 'sepia(0.8)',                                    moodHint: '추억 / 회상 — 카일 전생을 환기하는 옛 결.' },
  { filter: 'noir',    label: '느와르',   cssFilter: 'grayscale(1) contrast(1.2)',                    moodHint: '어두운 분위기 — 에레보스 / 카타콤 등 음산한 zone.' },
  { filter: 'vintage', label: '빈티지',   cssFilter: 'sepia(0.4) saturate(0.7) contrast(1.1)',        moodHint: '따뜻한 회고 — 칸텔라 / 솔라리스 오아시스의 햇빛.' },
  { filter: 'neon',    label: '네온',     cssFilter: 'saturate(2) hue-rotate(15deg) contrast(1.3)',   moodHint: '미래/판타지 — 황금 에테르 탑 / 균열 zone.' },
];

export function getPhotoModeFilterNarrative(filter: PhotoModeFilter): PhotoModeFilterNarrative | undefined {
  return SCENARIO_PHOTO_MODE_FILTERS.find((f) => f.filter === filter);
}

export function listPhotoModeFilters(): readonly PhotoModeFilter[] {
  return ['none', 'sepia', 'noir', 'vintage', 'neon'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-230: 🎯 컷씬 재생 옵션 SSOT — 3 옵션
// ════════════════════════════════════════════════════════════════

export type CutscenePlaybackOption = 'auto' | 'manual' | 'skip';

export interface CutscenePlaybackOptionNarrative {
  option: CutscenePlaybackOption;
  label: string;
  autoAdvance: boolean;
  inputHandling: string;
}

export const SCENARIO_CUTSCENE_PLAYBACK_OPTIONS: readonly CutscenePlaybackOptionNarrative[] = [
  { option: 'auto',   label: '자동 재생', autoAdvance: true,  inputHandling: '대사가 자동 진행 — 키 입력으로 일시정지 가능.' },
  { option: 'manual', label: '수동 재생', autoAdvance: false, inputHandling: '대사마다 키 입력 필요 — 천천히 음미 가능.' },
  { option: 'skip',   label: '스킵',     autoAdvance: false, inputHandling: '컷씬 전체 스킵 — 처음 본 컷씬만 활성화.' },
];

export function getCutscenePlaybackOptionNarrative(option: CutscenePlaybackOption): CutscenePlaybackOptionNarrative | undefined {
  return SCENARIO_CUTSCENE_PLAYBACK_OPTIONS.find((o) => o.option === option);
}

export function listCutscenePlaybackOptions(): readonly CutscenePlaybackOption[] {
  return ['auto', 'manual', 'skip'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-231: 전투 진형 narrative SSOT — 4 진형
// ════════════════════════════════════════════════════════════════

export type BattleFormation = 'aggressive' | 'defensive' | 'balanced' | 'flanking';

export interface BattleFormationNarrative {
  formation: BattleFormation;
  label: string;
  modifierSummary: string;
  recommendedAgainst: string;
}

export const SCENARIO_BATTLE_FORMATIONS: readonly BattleFormationNarrative[] = [
  { formation: 'aggressive', label: '공세',     modifierSummary: '공격력 +15%, 받는 피해 +10%.',                     recommendedAgainst: '체력 낮은 적 다수 / 빠른 처치 필요.' },
  { formation: 'defensive',  label: '방어',     modifierSummary: '받는 피해 -20%, 공격력 -10%, 위협도 +30%.',         recommendedAgainst: '강한 단일 보스 / 광역 공격 보스.' },
  { formation: 'balanced',   label: '균형',     modifierSummary: '모든 modifier 기준값 — 가장 안정적.',               recommendedAgainst: '일반 전투 / 다양한 적 유형 혼합.' },
  { formation: 'flanking',   label: '측면 공격', modifierSummary: 'crit 확률 +15%, 적 회피 -10%, 받는 피해 +5%.',     recommendedAgainst: '엘리트 적 / 회피율 높은 보스.' },
];

export function getBattleFormationNarrative(formation: BattleFormation): BattleFormationNarrative | undefined {
  return SCENARIO_BATTLE_FORMATIONS.find((f) => f.formation === formation);
}

export function listBattleFormations(): readonly BattleFormation[] {
  return ['aggressive', 'defensive', 'balanced', 'flanking'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-232: 조우 환경 biome SSOT — 5 biome
// ════════════════════════════════════════════════════════════════

export type EncounterBiome = 'forest' | 'desert' | 'cave' | 'urban' | 'abyss';

export interface EncounterBiomeNarrative {
  biome: EncounterBiome;
  label: string;
  enemyDensityWeight: number;
  environmentModifier: string;
}

export const SCENARIO_ENCOUNTER_BIOMES: readonly EncounterBiomeNarrative[] = [
  { biome: 'forest', label: '숲',     enemyDensityWeight: 1.2, environmentModifier: '시야 -10%, 회피 +5%, 식물성 적 빈도 +30%.' },
  { biome: 'desert', label: '사막',   enemyDensityWeight: 0.8, environmentModifier: '시야 +15%, 모래 폭풍 시 ATB 시작값 -20%.' },
  { biome: 'cave',   label: '동굴',   enemyDensityWeight: 1.0, environmentModifier: '시야 -30%, 광원 아이템 권장, 그림자 직조사 +10%.' },
  { biome: 'urban',  label: '도시',   enemyDensityWeight: 1.5, environmentModifier: '엘리트 빈도 +20%, 잠입 동선 권장.' },
  { biome: 'abyss',  label: '심연',   enemyDensityWeight: 0.6, environmentModifier: '시야 -50%, 보스급 적 빈도 +40%, 회피 -10%.' },
];

export function getEncounterBiomeNarrative(biome: EncounterBiome): EncounterBiomeNarrative | undefined {
  return SCENARIO_ENCOUNTER_BIOMES.find((b) => b.biome === biome);
}

export function listEncounterBiomes(): readonly EncounterBiome[] {
  return ['forest', 'desert', 'cave', 'urban', 'abyss'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-233: 신전 종류 SSOT — 5 종
// ════════════════════════════════════════════════════════════════

export type ShrineType = 'memory' | 'healing' | 'combat_buff' | 'wisdom' | 'teleport';

export interface ShrineTypeNarrative {
  shrine: ShrineType;
  label: string;
  effectSummary: string;
  cooldownMinutes: number;
}

export const SCENARIO_SHRINE_TYPES: readonly ShrineTypeNarrative[] = [
  { shrine: 'memory',      label: '기억 신전',     effectSummary: '에리언의 기억 공명 +1 단계 (1전투 한정).', cooldownMinutes: 60 },
  { shrine: 'healing',     label: '치유 신전',     effectSummary: '파티 전체 HP/MP 100% 회복.',              cooldownMinutes: 30 },
  { shrine: 'combat_buff', label: '전투 신전',     effectSummary: '다음 전투 공격력/방어 +15% (1전투).',     cooldownMinutes: 45 },
  { shrine: 'wisdom',      label: '지혜 신전',     effectSummary: '경험치 +20% (다음 1시간).',                cooldownMinutes: 120 },
  { shrine: 'teleport',    label: '순간이동 신전', effectSummary: 'fast travel hub 일시 활성화 (1회).',       cooldownMinutes: 240 },
];

export function getShrineTypeNarrative(shrine: ShrineType): ShrineTypeNarrative | undefined {
  return SCENARIO_SHRINE_TYPES.find((s) => s.shrine === shrine);
}

export function listShrineTypes(): readonly ShrineType[] {
  return ['memory', 'healing', 'combat_buff', 'wisdom', 'teleport'];
}

// ════════════════════════════════════════════════════════════════
// SYNC-234: 길드 권한 역할 SSOT — 5 역할
// ════════════════════════════════════════════════════════════════

export type GuildPermissionRole = 'member' | 'officer' | 'raid_leader' | 'treasurer' | 'leader';

export interface GuildPermissionRoleNarrative {
  role: GuildPermissionRole;
  label: string;
  hierarchyLevel: number;
  permissions: readonly string[];
}

export const SCENARIO_GUILD_PERMISSION_ROLES: readonly GuildPermissionRoleNarrative[] = [
  { role: 'member',      label: '일반 회원',   hierarchyLevel: 1, permissions: ['길드 채팅', '일일 quest 참여'] },
  { role: 'officer',     label: '간부',       hierarchyLevel: 2, permissions: ['길드 채팅', '일일 quest', '회원 초대 / 추방'] },
  { role: 'raid_leader', label: '레이드 리더', hierarchyLevel: 3, permissions: ['길드 채팅', 'raid 일정 관리', '파티 구성'] },
  { role: 'treasurer',   label: '재무',       hierarchyLevel: 3, permissions: ['길드 채팅', '길드 창고 관리', '화폐 분배'] },
  { role: 'leader',      label: '길드장',     hierarchyLevel: 4, permissions: ['모든 권한 + 길드 해체 / 양도'] },
];

export function getGuildPermissionRoleNarrative(role: GuildPermissionRole): GuildPermissionRoleNarrative | undefined {
  return SCENARIO_GUILD_PERMISSION_ROLES.find((r) => r.role === role);
}

export function listGuildRolesByHierarchy(): readonly GuildPermissionRoleNarrative[] {
  return [...SCENARIO_GUILD_PERMISSION_ROLES].sort((a, b) => a.hierarchyLevel - b.hierarchyLevel);
}
