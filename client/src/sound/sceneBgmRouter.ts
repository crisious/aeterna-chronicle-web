/**
 * sceneBgmRouter — 씬/지역/보스 → BGM 키 라우팅 SSOT
 *
 * 단계: Build (구현 완료)
 * 책임:
 *   1) Scene → BGM key 결정 (월드맵·필드·마을·던전)
 *   2) Boss/Event 발현 시 BGM 오버라이드
 *   3) 100% 매핑 보장 — fallback 안전장치
 *
 * 비고: 실제 BGM 키는 soundManifest.ts SSOT 참조. 이 모듈은 "어떤 씬에서 어떤 키를 쓸 것인가"만 결정.
 */

import type { SoundManager } from './SoundManager';

// ─── 씬/지역/이벤트 식별자 ──────────────────────────────────────
/** 챕터·지역 식별자 — DESIGN.md 10개 지역과 동기화 */
export type RegionId =
  | 'erebos'      // 에레보스 (망각의 폐허)
  | 'sylvanheim'  // 실반헤임 (기억의 숲)
  | 'solaris'     // 솔라리스 사막
  | 'argentium'   // 아르겐티움 제국
  | 'borealis'    // 북방 영원빙원
  | 'britannia'   // 브리탈리아 자유항
  | 'plateau'     // 망각의 고원
  | 'mistsea'     // 무한 안개해
  | 'abyss'       // 기억의 심연
  | 'rift';       // 시간의 균열

export const ALL_REGIONS: ReadonlyArray<RegionId> = [
  'erebos', 'sylvanheim', 'solaris', 'argentium', 'borealis',
  'britannia', 'plateau', 'mistsea', 'abyss', 'rift',
];

/** 씬 종류 */
export type SceneKind =
  | 'title'
  | 'town'
  | 'field'
  | 'dungeon'
  | 'battle'
  | 'boss'
  | 'event'
  | 'ending'
  | 'guild_hall';

export const ALL_SCENES: ReadonlyArray<SceneKind> = [
  'title', 'town', 'field', 'dungeon', 'battle', 'boss', 'event', 'ending', 'guild_hall',
];

/** 시간대(필드 BGM 분기) */
export type TimeOfDay = 'day' | 'night' | 'dusk' | 'dawn';

export const ALL_TIMES: ReadonlyArray<TimeOfDay> = ['day', 'night', 'dusk', 'dawn'];

/** 보스 식별자 — monster_data_table.md SSOT와 매핑 */
export type BossId =
  | 'memory_golem'
  | 'malatus'
  | 'lawar'
  | 'kain'
  | 'lethe'
  | 'oblivion_remnant'
  | (string & { readonly __boss?: never });

/** 이벤트 컷씬 식별자 */
export type EventId =
  | 'awakening'
  | 'farewell'
  | 'revelation'
  | 'fragment_collect'
  | (string & { readonly __event?: never });

// ─── 라우팅 컨텍스트 ────────────────────────────────────────────
export interface BgmRouteContext {
  scene: SceneKind;
  region?: RegionId;
  time?: TimeOfDay;
  bossId?: BossId;
  eventId?: EventId;
  /** 챕터 번호 (1~5) — 분기 BGM 결정용 */
  chapter?: number;
}

export interface BgmRouteResult {
  bgmKey: string;
  fadeMs: number;
  confidence: 'exact' | 'fallback';
}

// ─── SSOT 매핑 테이블 ──────────────────────────────────────────

/** 지역별 day/night BGM 키 — soundManifest 기반 */
const REGION_DAY: Record<RegionId, string> = {
  erebos: 'bgm_erb_01',
  sylvanheim: 'bgm_syl_01',
  solaris: 'bgm_sol_01',
  argentium: 'bgm_arg_01',
  borealis: 'bgm_bor_01',
  britannia: 'bgm_brt_01',
  plateau: 'bgm_plt_01',
  mistsea: 'bgm_aby_02',     // 안개해 — 심연 잔향
  abyss: 'bgm_aby_01',
  rift: 'bgm_aby_04',         // 시간 균열 — 시간의 끝
};

const REGION_NIGHT: Record<RegionId, string> = {
  erebos: 'bgm_erb_01',
  sylvanheim: 'bgm_syl_02',
  solaris: 'bgm_sol_02',
  argentium: 'bgm_arg_02',
  borealis: 'bgm_bor_02',
  britannia: 'bgm_brt_02',
  plateau: 'bgm_plt_01',
  mistsea: 'bgm_aby_02',
  abyss: 'bgm_aby_03',
  rift: 'bgm_aby_04',
};

/** 지역별 전투 BGM */
const REGION_BATTLE: Record<RegionId, string> = {
  erebos: 'bgm_erb_02',
  sylvanheim: 'bgm_btl_01',
  solaris: 'bgm_btl_01',
  argentium: 'bgm_btl_01',
  borealis: 'bgm_btl_01',
  britannia: 'bgm_btl_03',
  plateau: 'bgm_btl_02',
  mistsea: 'bgm_btl_02',
  abyss: 'bgm_btl_02',
  rift: 'bgm_btl_02',
};

/** 지역별 던전 BGM */
const REGION_DUNGEON: Record<RegionId, string> = {
  erebos: 'bgm_aby_01',
  sylvanheim: 'bgm_aby_02',
  solaris: 'bgm_aby_01',
  argentium: 'bgm_aby_03',
  borealis: 'bgm_aby_02',
  britannia: 'bgm_aby_01',
  plateau: 'bgm_aby_03',
  mistsea: 'bgm_aby_02',
  abyss: 'bgm_aby_03',
  rift: 'bgm_aby_04',
};

/** 지역별 마을 BGM */
const REGION_TOWN: Record<RegionId, string> = {
  erebos: 'bgm_village',
  sylvanheim: 'bgm_syl_01',
  solaris: 'bgm_sol_01',
  argentium: 'bgm_arg_01',
  borealis: 'bgm_village',
  britannia: 'bgm_brt_01',
  plateau: 'bgm_plt_01',
  mistsea: 'bgm_brt_01',
  abyss: 'bgm_aby_01',
  rift: 'bgm_sys_01',
};

function pickRegionBgm(region: RegionId, scene: SceneKind, time: TimeOfDay): string {
  switch (scene) {
    case 'town':
    case 'guild_hall':
      return REGION_TOWN[region];
    case 'dungeon':
      return REGION_DUNGEON[region];
    case 'battle':
      return REGION_BATTLE[region];
    case 'field':
    default:
      return time === 'night' || time === 'dusk' ? REGION_NIGHT[region] : REGION_DAY[region];
  }
}

/**
 * 지역 + 씬 + 시간대 → BGM 키 (전체 셀 100% 커버)
 * 외부 노출용 SSOT.
 */
export const REGION_BGM_TABLE: Readonly<
  Record<RegionId, Record<SceneKind, Record<TimeOfDay, string>>>
> = (() => {
  const table = {} as Record<RegionId, Record<SceneKind, Record<TimeOfDay, string>>>;
  for (const region of ALL_REGIONS) {
    table[region] = {} as Record<SceneKind, Record<TimeOfDay, string>>;
    for (const scene of ALL_SCENES) {
      table[region][scene] = {} as Record<TimeOfDay, string>;
      for (const time of ALL_TIMES) {
        table[region][scene][time] = pickRegionBgm(region, scene, time);
      }
    }
  }
  return table;
})();

/** 보스 → 전투 BGM 키 — monster_data_table SSOT 매핑 */
export const BOSS_BGM_TABLE: Readonly<Record<string, string>> = {
  memory_golem: 'bgm_erb_03',
  malatus: 'bgm_syl_03',
  lawar: 'bgm_sol_03',
  kain: 'bgm_arg_03',
  lethe: 'bgm_plt_02',
  oblivion_remnant: 'bgm_plt_03',
};

/** 이벤트 → BGM 키 */
export const EVENT_BGM_TABLE: Readonly<Record<string, string>> = {
  awakening: 'bgm_evt_01',
  farewell: 'bgm_evt_02',
  revelation: 'bgm_evt_03',
  fragment_collect: 'bgm_aby_05',
};

/** 매핑 실패 시 안전장치 — 모든 SceneKind 커버 */
export const FALLBACK_BGM: Readonly<Record<SceneKind, string>> = {
  title: 'bgm_sys_02',
  town: 'bgm_village',
  field: 'bgm_sys_01',
  dungeon: 'bgm_aby_01',
  battle: 'bgm_btl_01',
  boss: 'bgm_btl_02',
  event: 'bgm_evt_01',
  ending: 'bgm_evt_02',
  guild_hall: 'bgm_sys_03',
};

// ─── 페이드 정책 ────────────────────────────────────────────────
const FADE_FAST = 600;    // 보스/전투 진입 — 긴장감
const FADE_NORMAL = 1500; // 평시 전환
const FADE_SLOW = 2500;   // 마을·이벤트 — 정서적 전환

function pickFade(scene: SceneKind, hasOverride: boolean): number {
  if (scene === 'boss' || scene === 'battle') return FADE_FAST;
  if (scene === 'event' || scene === 'ending' || hasOverride) return FADE_SLOW;
  return FADE_NORMAL;
}

// ─── 라우터 인터페이스 ──────────────────────────────────────────
/**
 * 우선순위:
 *   1) ctx.eventId  → EVENT_BGM_TABLE
 *   2) ctx.bossId   → BOSS_BGM_TABLE (scene 'boss'/'battle' 가정)
 *   3) region+scene+time → REGION_BGM_TABLE
 *   4) FALLBACK_BGM[scene]
 */
export function resolveBgm(ctx: BgmRouteContext): BgmRouteResult {
  // 1) Event 우선
  if (ctx.eventId && EVENT_BGM_TABLE[ctx.eventId]) {
    return {
      bgmKey: EVENT_BGM_TABLE[ctx.eventId],
      fadeMs: pickFade(ctx.scene, true),
      confidence: 'exact',
    };
  }

  // 2) Boss
  if (ctx.bossId && BOSS_BGM_TABLE[ctx.bossId]) {
    return {
      bgmKey: BOSS_BGM_TABLE[ctx.bossId],
      fadeMs: FADE_FAST,
      confidence: 'exact',
    };
  }

  // 3) Region + Scene + Time
  if (ctx.region) {
    const time = ctx.time ?? 'day';
    const key = REGION_BGM_TABLE[ctx.region]?.[ctx.scene]?.[time];
    if (key) {
      return {
        bgmKey: key,
        fadeMs: pickFade(ctx.scene, false),
        confidence: 'exact',
      };
    }
  }

  // 4) Fallback
  const fallbackKey = FALLBACK_BGM[ctx.scene] ?? FALLBACK_BGM.title;
  reportFallback('bgm.route.fallback', ctx);
  return {
    bgmKey: fallbackKey,
    fadeMs: pickFade(ctx.scene, false),
    confidence: 'fallback',
  };
}

/**
 * 결정된 BGM을 SoundManager에 송출.
 * 라우팅·재생 결합도 격리 — 테스트 용이.
 */
export function applyBgmRoute(sm: SoundManager, route: BgmRouteResult): void {
  sm.playBgm(route.bgmKey, route.fadeMs);
}

/** 한 줄 헬퍼 — 컨텍스트로 즉시 재생 */
export function routeAndPlay(sm: SoundManager, ctx: BgmRouteContext): BgmRouteResult {
  const route = resolveBgm(ctx);
  applyBgmRoute(sm, route);
  return route;
}

// ─── 커버리지 검증 ──────────────────────────────────────────────
export interface BgmCoverageReport {
  totalCells: number;
  coveredCells: number;
  missing: Array<{ region: RegionId; scene: SceneKind; time?: TimeOfDay }>;
  coveragePct: number;
}

/**
 * REGION × SCENE × TIME 전수 검사 — 모든 셀이 채워져 있어야 100%.
 */
export function auditBgmCoverage(): BgmCoverageReport {
  const missing: Array<{ region: RegionId; scene: SceneKind; time?: TimeOfDay }> = [];
  let total = 0;
  let covered = 0;

  for (const region of ALL_REGIONS) {
    for (const scene of ALL_SCENES) {
      for (const time of ALL_TIMES) {
        total++;
        const key = REGION_BGM_TABLE[region]?.[scene]?.[time];
        if (key && key.length > 0) {
          covered++;
        } else {
          missing.push({ region, scene, time });
        }
      }
    }
  }

  return {
    totalCells: total,
    coveredCells: covered,
    missing,
    coveragePct: total === 0 ? 0 : (covered / total) * 100,
  };
}

// ─── 텔레메트리 (지연 import — 순환 의존 방지) ────────────────
function reportFallback(channel: string, payload: unknown): void {
  try {
    const w = typeof window !== 'undefined'
      ? (window as unknown as { __aeterna_telemetry?: { warn?: (c: string, p: unknown) => void } })
      : null;
    if (w?.__aeterna_telemetry?.warn) {
      w.__aeterna_telemetry.warn(channel, payload);
    } else {
      console.warn(`[${channel}]`, payload);
    }
  } catch {
    // 텔레메트리 실패는 무시 — 재생 차단 금지
  }
}
