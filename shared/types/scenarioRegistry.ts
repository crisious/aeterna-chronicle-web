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
  /** 합계 */
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
  const totalEntities =
    companions + zones + bosses + chapters + endings + fragments +
    deities + timeline + milestones + dialogues + reputationRewards +
    mythicRelics + loreDocuments + zoneConnections + chapterRoutes;
  return {
    companions, zones, bosses, chapters, endings, fragments, deities,
    timeline, milestones, dialogues, reputationRewards, mythicRelics,
    loreDocuments, zoneConnections, chapterRoutes, totalEntities,
  };
}

/** 전체 obsidianId index — 빠른 entity lookup */
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
