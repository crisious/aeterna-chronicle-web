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
