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
    plannedGameQuestZoneTarget: 'zone_erebos_city',
    plannedGameZoneId: 'erebos_ruins',
  },
  {
    obsidianId: 'cantela_village',
    name: '칸텔라 마을',
    chapter: 1,
    plannedGameQuestZoneTarget: 'zone_cantela_village',
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
    plannedGameQuestZoneTarget: 'zone_solaris_desert',
    plannedGameZoneId: 'solaris_dunes',
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
    plannedGameQuestBossId: 'boss_rawar',
    plannedGameChronoBossId: 'rawar_ancient_king',
  },
  {
    obsidianId: 'kane',
    name: '케인 (기억 사냥꾼 간부)',
    chapter: 4,
    plannedGameQuestBossId: 'boss_kane_corrupted',
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
}

export const SCENARIO_FRAGMENTS: readonly ScenarioFragment[] = [
  {
    obsidianId: 'fragment_erebos',
    name: '에레보스 파편 (대망각 진원지의 기억)',
    chapter: 1,
    zoneObsidianId: 'erebos',
    sealer: '카일 (주인공의 전생)',
  },
  {
    obsidianId: 'fragment_silvanheim',
    name: '실반헤임 파편 (말라투스의 기억)',
    chapter: 2,
    zoneObsidianId: 'silvanheim',
    sealer: '세라핀의 먼 선조 (엘파리스 기억 수호자)',
  },
  {
    obsidianId: 'fragment_solaris',
    name: '솔라리스 파편 (라와르 왕의 기억)',
    chapter: 3,
    zoneObsidianId: 'solaris',
    sealer: '라와르 (솔리안의 마지막 왕)',
  },
  {
    obsidianId: 'fragment_argentium',
    name: '아르겐티움 파편 (제국 황궁 지하)',
    chapter: 4,
    zoneObsidianId: 'argentium',
    sealer: '12인 중 1명 (이름 미공개)',
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
 * orphan = sync 안 됐고 planned ID 도 없는 항목 (장기 작업 미정의).
 */
export function getSyncCompletionReport(): SyncCompletionReport {
  const companionsSync = listSyncedCompanions().length;
  const companionsPlanned = listPlannedCompanions().length;
  const companionsTotal = SCENARIO_COMPANIONS.length;

  const zonesSync = listSyncedZones().length;
  const zonesPlanned = listPlannedZones().length;
  const zonesTotal = SCENARIO_ZONES.length;

  const bossesSync = listSyncedBosses().length;
  const bossesPlanned = listPlannedBosses().length;
  const bossesTotal = SCENARIO_BOSSES.length;

  const totalEntities = companionsTotal + zonesTotal + bossesTotal;
  const covered = companionsSync + companionsPlanned + zonesSync + zonesPlanned + bossesSync + bossesPlanned;

  return {
    companions: {
      total: companionsTotal,
      synced: companionsSync,
      planned: companionsPlanned,
      orphan: companionsTotal - companionsSync - companionsPlanned,
    },
    zones: {
      total: zonesTotal,
      synced: zonesSync,
      planned: zonesPlanned,
      orphan: zonesTotal - zonesSync - zonesPlanned,
    },
    bosses: {
      total: bossesTotal,
      synced: bossesSync,
      planned: bossesPlanned,
      orphan: bossesTotal - bossesSync - bossesPlanned,
    },
    coveragePercent: Math.round((covered / totalEntities) * 100),
  };
}
