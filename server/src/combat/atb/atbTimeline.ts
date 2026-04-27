// ─── ATB 타임라인 (FF6 레퍼런스) ──────────────────────────────────
// 책임: 속도 스탯 → ATB 충전율 변환, tick 진행, ready 큐 관리.
// 본 파일은 stub(골격). 실제 수식/큐 처리는 Build 단계에서 구현.

import type {
  ATBGaugeValue,
  ATBMode,
  ATBSnapshot,
  ATBSpeedTier,
  CastReservation,
} from '../../../../shared/types/atb';

// ─── 상수 (FF6 레퍼런스) ──────────────────────────────────────────
// FF6: 대기치 = (96 - speed) * unitWait. 본작은 0~100 게이지 기준으로 재매핑.

/** ATB 게이지 최대치. 100 도달 시 행동 가능. */
export const ATB_MAX: ATBGaugeValue = 100;

/** 기준 속도(spd=50)에서 1초당 차는 게이지 %. */
export const ATB_BASE_CHARGE_PER_SEC = 25;

/** 속도 스탯 하한/상한 클램프. */
export const SPD_CLAMP = { min: 1, max: 255 } as const;

/** 배속 티어 → 스칼라 매핑. FF6 스위치 1~6 대응. */
export const SPEED_TIER_SCALAR: Record<ATBSpeedTier, number> = {
  1: 0.5,
  2: 0.7,
  3: 1.0,
  4: 1.3,
  5: 1.6,
  6: 2.0,
};

// ─── 초기화 / 엔트리 ───────────────────────────────────────────────

/** 참가자별 ATB 내부 상태. */
export interface ATBEntry {
  actorId: string;
  gauge: ATBGaugeValue;
  spd: number;
  /** 헤이스트/슬로우 등 속도 배율 (1.0 기본). */
  speedMultiplier: number;
  /** 스턴/슬립 등 게이지 정지. */
  frozen: boolean;
  /** 기절/행동불가 플래그. */
  alive: boolean;
  /** 최근 ready가 된 tick. null이면 미도달. */
  readyAtTick: number | null;
}

/** 엔트리 초기값 생성. */
export function createATBEntry(_actorId: string, _spd: number): ATBEntry {
  throw new Error('NOT_IMPLEMENTED: createATBEntry');
}

// ─── 충전율 계산 ───────────────────────────────────────────────────

/**
 * 속도 스탯 + 모드 + 배속 → 1 tick 당 충전량 계산.
 * FF6 공식 재매핑: delta = base * (spd/50) * speedMult * tierScalar * (tickMs/1000).
 */
export function computeChargeDelta(
  _spd: number,
  _speedMultiplier: number,
  _tier: ATBSpeedTier,
  _tickMs: number,
): ATBGaugeValue {
  throw new Error('NOT_IMPLEMENTED: computeChargeDelta');
}

// ─── Tick 진행 ─────────────────────────────────────────────────────

export interface TickAdvanceResult {
  /** 이번 tick에 ATB 100 도달한 actorId 목록 (도달 순). */
  newlyReady: string[];
  /** 이번 tick에 캐스트 완료된 예약 목록. */
  completedCasts: CastReservation[];
}

/**
 * 타임라인 1 tick 전진.
 * - frozen/dead는 스킵.
 * - 메뉴 열림(mode==WAIT 및 ui.menuOpen)이면 충전 정지.
 */
export function advanceTick(
  _entries: ATBEntry[],
  _casts: CastReservation[],
  _mode: ATBMode,
  _tier: ATBSpeedTier,
  _tickMs: number,
  _menuOpen: boolean,
): TickAdvanceResult {
  throw new Error('NOT_IMPLEMENTED: advanceTick');
}

// ─── 스냅샷 직렬화 ─────────────────────────────────────────────────

/** 네트워크 전송용 스냅샷 배열로 변환. */
export function toSnapshots(
  _entries: ATBEntry[],
  _casts: CastReservation[],
): ATBSnapshot[] {
  throw new Error('NOT_IMPLEMENTED: toSnapshots');
}

// ─── 행동 소비 ─────────────────────────────────────────────────────

/**
 * 행동 실행 후 게이지 소비 처리.
 * - 일반 공격: gauge = 0.
 * - 스킬: gauge = 0 + (재사용 대기 시 음수 오버슈트 가능).
 * - 방어: gauge = 50 (반틱 유지, FF6 Defend 유사).
 */
export function consumeGauge(
  _entry: ATBEntry,
  _commandKind: 'attack' | 'skill' | 'item' | 'defend' | 'flee',
): void {
  throw new Error('NOT_IMPLEMENTED: consumeGauge');
}
