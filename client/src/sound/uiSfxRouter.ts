/**
 * uiSfxRouter — UI 인터랙션 → SFX 디스패처
 *
 * 단계: Build (구현 완료)
 * 책임:
 *   1) 메뉴 인터랙션 (호버·클릭·확인·취소·열기·닫기) → SFX
 *   2) 인벤토리 이벤트 (아이템 획득·장착·해제·판매) → SFX
 *   3) 진행 이벤트 (레벨업·스킬 해금·기억 파편 획득·퀘스트 완료) → SFX
 *
 * 비고: UI 이벤트는 빈도가 높음. throttle로 풀 포화 방지.
 */

import type { SoundManager } from './SoundManager';

// ─── UI 이벤트 종류 ────────────────────────────────────────────
export type UiEventKind =
  // 메뉴
  | 'menu_hover'
  | 'menu_click'
  | 'menu_confirm'
  | 'menu_cancel'
  | 'menu_open'
  | 'menu_close'
  | 'menu_tab_switch'
  // 인벤토리
  | 'item_acquire'
  | 'item_equip'
  | 'item_unequip'
  | 'item_sell'
  | 'item_use'
  // 진행
  | 'level_up'
  | 'skill_unlock'
  | 'fragment_acquire'
  | 'quest_complete'
  | 'achievement'
  // 알림
  | 'notice_info'
  | 'notice_warn'
  | 'notice_error';

export const ALL_UI_EVENTS: ReadonlyArray<UiEventKind> = [
  'menu_hover', 'menu_click', 'menu_confirm', 'menu_cancel',
  'menu_open', 'menu_close', 'menu_tab_switch',
  'item_acquire', 'item_equip', 'item_unequip', 'item_sell', 'item_use',
  'level_up', 'skill_unlock', 'fragment_acquire', 'quest_complete', 'achievement',
  'notice_info', 'notice_warn', 'notice_error',
];

export interface UiEvent {
  kind: UiEventKind;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  refId?: string;
}

export interface UiSfxRouteResult {
  keys: string[];
  overrides?: Array<{ volume?: number; detune?: number; rate?: number } | undefined>;
  throttleMs: number;
  confidence: 'exact' | 'fallback';
}

// ─── SSOT 매핑 테이블 ───────────────────────────────────────────
export const UI_SFX_TABLE: Readonly<Record<UiEventKind, string[]>> = {
  // 메뉴
  menu_hover: ['sfx_ui_hover'],
  menu_click: ['sfx_ui_click'],
  menu_confirm: ['sfx_ui_confirm'],
  menu_cancel: ['sfx_ui_cancel'],
  menu_open: ['sfx_ui_open'],
  menu_close: ['sfx_ui_close'],
  menu_tab_switch: ['sfx_ui_click'],
  // 인벤토리
  item_acquire: ['sfx_ui_item_pickup'],
  item_equip: ['sfx_ui_item_equip'],
  item_unequip: ['sfx_ui_click'],
  item_sell: ['sfx_ui_gold_gain'],
  item_use: ['sfx_ui_confirm'],
  // 진행
  level_up: ['sfx_ui_level_up'],
  skill_unlock: ['sfx_ui_achievement'],
  fragment_acquire: ['sfx_mem_fragment_collect', 'sfx_mem_resonance_burst'],
  quest_complete: ['sfx_ui_quest_complete'],
  achievement: ['sfx_ui_achievement'],
  // 알림
  notice_info: ['sfx_ui_notification'],
  notice_warn: ['sfx_ui_notification'],
  notice_error: ['sfx_ui_error'],
};

/** 등급별 보이스 합성 임계 — 레전더리/미식 등급에서만 voice 추가 */
export const RARITY_VOICE_THRESHOLD: ReadonlyArray<UiEvent['rarity']> = ['legendary', 'mythic'];

/** 이벤트별 throttle (ms) — 풀 포화·청각 피로 방지 */
const THROTTLE_MS: Partial<Record<UiEventKind, number>> = {
  menu_hover: 80,        // 연속 호버 디바운스
  menu_tab_switch: 50,
  menu_click: 30,
};

// ─── throttle 상태 (모듈 스코프) ────────────────────────────────
const lastFiredAt: Map<string, number> = new Map();

function makeThrottleKey(event: UiEvent): string {
  return event.refId ? `${event.kind}:${event.refId}` : event.kind;
}

/** throttle 체크 — true면 통과(재생), false면 차단 */
function checkThrottle(event: UiEvent, throttleMs: number): boolean {
  if (throttleMs <= 0) return true;
  const key = makeThrottleKey(event);
  const now = Date.now();
  const last = lastFiredAt.get(key) ?? 0;
  if (now - last < throttleMs) return false;
  lastFiredAt.set(key, now);
  return true;
}

// ─── 라우터 ────────────────────────────────────────────────────
export function resolveUiSfx(event: UiEvent): UiSfxRouteResult {
  const baseKeys = UI_SFX_TABLE[event.kind];
  const throttleMs = THROTTLE_MS[event.kind] ?? 0;

  if (!baseKeys || baseKeys.length === 0) {
    reportFallback('ui.sfx.route.fallback', event);
    return {
      keys: ['sfx_ui_click'],
      throttleMs,
      confidence: 'fallback',
    };
  }

  const keys: string[] = [...baseKeys];
  const overrides: Array<{ volume?: number; detune?: number; rate?: number } | undefined> =
    new Array(keys.length).fill(undefined);

  // 레전더리/미식 등급 — voice 합성
  if (
    event.kind === 'item_acquire' &&
    event.rarity &&
    RARITY_VOICE_THRESHOLD.includes(event.rarity)
  ) {
    keys.push('sfx_ui_achievement');
    overrides.push({ volume: 0.85 });
  }

  // 등급별 detune 변형 — 레어↑ 음정 살짝 올림 (장엄함)
  if (event.kind === 'item_acquire' && event.rarity) {
    const detuneMap: Record<NonNullable<UiEvent['rarity']>, number> = {
      common: 0,
      rare: 50,
      epic: 100,
      legendary: 150,
      mythic: 200,
    };
    overrides[0] = { detune: detuneMap[event.rarity] };
  }

  return {
    keys,
    overrides,
    throttleMs,
    confidence: 'exact',
  };
}

export function applyUiSfx(sm: SoundManager, route: UiSfxRouteResult, event?: UiEvent): void {
  // throttle 검사 (이벤트 정보 있을 때만)
  if (event && !checkThrottle(event, route.throttleMs)) {
    return;
  }

  for (let i = 0; i < route.keys.length; i++) {
    sm.playSfx(route.keys[i], route.overrides?.[i]);
  }
}

/** 한 줄 헬퍼 */
export function dispatchUi(sm: SoundManager, event: UiEvent): UiSfxRouteResult {
  const route = resolveUiSfx(event);
  applyUiSfx(sm, route, event);
  return route;
}

// ─── 커버리지 ──────────────────────────────────────────────────
export interface UiSfxCoverageReport {
  totalEvents: number;
  coveredEvents: number;
  missing: UiEventKind[];
  coveragePct: number;
}

export function auditUiSfxCoverage(): UiSfxCoverageReport {
  const missing: UiEventKind[] = [];
  let covered = 0;

  for (const kind of ALL_UI_EVENTS) {
    const list = UI_SFX_TABLE[kind];
    if (list && list.length > 0) {
      covered++;
    } else {
      missing.push(kind);
    }
  }

  return {
    totalEvents: ALL_UI_EVENTS.length,
    coveredEvents: covered,
    missing,
    coveragePct: ALL_UI_EVENTS.length === 0 ? 0 : (covered / ALL_UI_EVENTS.length) * 100,
  };
}

// ─── 테스트 헬퍼 ───────────────────────────────────────────────
/** throttle 상태 초기화 — 단위 테스트용 */
export function _resetUiSfxThrottle(): void {
  lastFiredAt.clear();
}

// ─── 텔레메트리 ────────────────────────────────────────────────
function reportFallback(channel: string, payload: unknown): void {
  try {
    const w = typeof window !== 'undefined' ? (window as { __aeterna_telemetry?: { warn?: (c: string, p: unknown) => void } }) : null;
    if (w?.__aeterna_telemetry?.warn) {
      w.__aeterna_telemetry.warn(channel, payload);
    } else {
      console.warn(`[${channel}]`, payload);
    }
  } catch {
    // ignore
  }
}
