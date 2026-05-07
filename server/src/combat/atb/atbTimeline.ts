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
export function createATBEntry(actorId: string, spd: number): ATBEntry {
  return {
    actorId,
    gauge: 0,
    spd: clampSpeed(spd),
    speedMultiplier: 1,
    frozen: false,
    alive: true,
    readyAtTick: null,
  };
}

// ─── 충전율 계산 ───────────────────────────────────────────────────

/**
 * 속도 스탯 + 모드 + 배속 → 1 tick 당 충전량 계산.
 * FF6 공식 재매핑: delta = base * (spd/50) * speedMult * tierScalar * (tickMs/1000).
 */
export function computeChargeDelta(
  spd: number,
  speedMultiplier: number,
  tier: ATBSpeedTier,
  tickMs: number,
): ATBGaugeValue {
  if (!Number.isFinite(tickMs) || tickMs <= 0) {
    return 0;
  }

  const clampedSpd = clampSpeed(spd);
  const safeSpeedMultiplier = Number.isFinite(speedMultiplier)
    ? Math.max(0, speedMultiplier)
    : 1;
  const scalar = SPEED_TIER_SCALAR[tier] ?? SPEED_TIER_SCALAR[3];
  const delta = ATB_BASE_CHARGE_PER_SEC
    * (clampedSpd / 50)
    * safeSpeedMultiplier
    * scalar
    * (tickMs / 1000);

  return roundGauge(Math.min(ATB_MAX, Math.max(0, delta)));
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
  entries: ATBEntry[],
  casts: CastReservation[],
  mode: ATBMode,
  tier: ATBSpeedTier,
  tickMs: number,
  menuOpen: boolean,
): TickAdvanceResult {
  const completedCasts = collectCompletedCasts(casts);
  if (mode === 'WAIT' && menuOpen) {
    return { newlyReady: [], completedCasts: [] };
  }

  const newlyReady: string[] = [];
  let nextReadyTick = getNextReadyTick(entries);

  for (const entry of entries) {
    if (!entry.alive || entry.frozen || entry.gauge >= ATB_MAX) {
      continue;
    }

    entry.gauge = roundGauge(Math.min(
      ATB_MAX,
      entry.gauge + computeChargeDelta(entry.spd, entry.speedMultiplier, tier, tickMs),
    ));

    if (entry.gauge >= ATB_MAX && entry.readyAtTick === null) {
      entry.readyAtTick = nextReadyTick;
      nextReadyTick += 1;
      newlyReady.push(entry.actorId);
    }
  }

  return { newlyReady, completedCasts };
}

// ─── 스냅샷 직렬화 ─────────────────────────────────────────────────

/** 네트워크 전송용 스냅샷 배열로 변환. */
export function toSnapshots(
  entries: ATBEntry[],
  casts: CastReservation[],
): ATBSnapshot[] {
  const queueIndexByActor = new Map<string, number>();
  entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.gauge >= ATB_MAX && entry.readyAtTick !== null)
    .sort((a, b) => {
      const tickDelta = (a.entry.readyAtTick ?? Number.MAX_SAFE_INTEGER)
        - (b.entry.readyAtTick ?? Number.MAX_SAFE_INTEGER);
      return tickDelta !== 0 ? tickDelta : a.index - b.index;
    })
    .forEach(({ entry }, queueIndex) => {
      queueIndexByActor.set(entry.actorId, queueIndex);
    });

  return entries.map((entry) => {
    const cast = casts.find((c) => c.actorId === entry.actorId);
    return {
      actorId: entry.actorId,
      gauge: roundGauge(entry.gauge),
      ready: entry.gauge >= ATB_MAX,
      queueIndex: queueIndexByActor.get(entry.actorId) ?? null,
      castingRemainMs: cast
        ? Math.max(0, cast.completesAtTick - cast.startedAtTick)
        : null,
    };
  });
}

// ─── 행동 소비 ─────────────────────────────────────────────────────

/**
 * 행동 실행 후 게이지 소비 처리.
 * - 일반 공격: gauge = 0.
 * - 스킬: gauge = 0 + (재사용 대기 시 음수 오버슈트 가능).
 * - 방어: gauge = 50 (반틱 유지, FF6 Defend 유사).
 */
export function consumeGauge(
  entry: ATBEntry,
  commandKind: 'attack' | 'skill' | 'item' | 'defend' | 'flee',
): void {
  entry.gauge = commandKind === 'defend' ? ATB_MAX / 2 : 0;
  entry.readyAtTick = null;
}

function clampSpeed(spd: number): number {
  if (!Number.isFinite(spd)) {
    return 50;
  }
  return Math.min(SPD_CLAMP.max, Math.max(SPD_CLAMP.min, Math.round(spd)));
}

function roundGauge(value: number): ATBGaugeValue {
  return Math.round(value * 10000) / 10000;
}

function getNextReadyTick(entries: ATBEntry[]): number {
  let maxReadyTick = 0;
  for (const entry of entries) {
    if (entry.readyAtTick !== null && entry.readyAtTick > maxReadyTick) {
      maxReadyTick = entry.readyAtTick;
    }
  }
  return maxReadyTick + 1;
}

function collectCompletedCasts(casts: CastReservation[]): CastReservation[] {
  return casts.filter((cast) => cast.completesAtTick <= cast.startedAtTick + 1);
}
