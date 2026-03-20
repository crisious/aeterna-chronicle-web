/**
 * 엔딩 테스트 헬퍼 — 멀티엔딩 판정 회귀 테스트용 팩토리
 *
 * judgeEnding() 테스트를 위한 EndingFlags 생성 유틸리티.
 * 정확한 경계값, 임계 미달값, 우선순위 충돌 시나리오를 제공한다.
 */

import type { EndingFlags } from '../../server/src/ending/endingJudge';

// ── 기본값 ───────────────────────────────────────────────────

/** 모든 플래그 초기 상태 (패배 엔딩) */
export function defaultFlags(): EndingFlags {
  return {
    sacredArtifacts: 0,
    betrayalScore: 0,
    fragmentCount: 0,
    allPartyAlive: false,
    endingAScore: 0,
    sealVisitedCount: 0,
    emperorSaved: false,
    letheUnderstood: false,
  };
}

/** 부분 오버라이드로 플래그 생성 */
export function makeFlags(overrides: Partial<EndingFlags> = {}): EndingFlags {
  return { ...defaultFlags(), ...overrides };
}

// ── 정확한 엔딩 조건 팩토리 ─────────────────────────────────

/** Ending D (신들의 귀환) — sacredArtifacts=12 */
export function makeEndingDState(overrides: Partial<EndingFlags> = {}): EndingFlags {
  return makeFlags({
    sacredArtifacts: 12,
    sealVisitedCount: 6,
    ...overrides,
  });
}

/** Ending C (망각의 선택) — betrayalScore>=70 */
export function makeEndingCState(overrides: Partial<EndingFlags> = {}): EndingFlags {
  return makeFlags({
    betrayalScore: 70,
    ...overrides,
  });
}

/** Ending A (기억의 수호자) — fragmentCount=4, allPartyAlive=true */
export function makeEndingAState(overrides: Partial<EndingFlags> = {}): EndingFlags {
  return makeFlags({
    fragmentCount: 4,
    allPartyAlive: true,
    endingAScore: 80,
    letheUnderstood: true,
    ...overrides,
  });
}

/** Ending B (마지막 증인의 선택) — fragmentCount>=3, 기본 엔딩 */
export function makeEndingBState(overrides: Partial<EndingFlags> = {}): EndingFlags {
  return makeFlags({
    fragmentCount: 3,
    ...overrides,
  });
}

/** Defeat (패배 엔딩) — fragmentCount<3 */
export function makeDefeatState(overrides: Partial<EndingFlags> = {}): EndingFlags {
  return makeFlags({
    fragmentCount: 2,
    ...overrides,
  });
}

// ── 임계 미달 (경계값 -1) 팩토리 ────────────────────────────

/** sacredArtifacts=11 → DIVINE_RETURN 미달 */
export function makeAlmostEndingD(): EndingFlags {
  return makeFlags({ sacredArtifacts: 11, sealVisitedCount: 6 });
}

/** betrayalScore=69 → BETRAYAL 미달 */
export function makeAlmostEndingC(): EndingFlags {
  return makeFlags({ betrayalScore: 69 });
}

/** fragmentCount=4, allPartyAlive=false → TRUE_GUARDIAN 미달 */
export function makeAlmostEndingA_partyDead(): EndingFlags {
  return makeFlags({ fragmentCount: 4, allPartyAlive: false });
}

/** fragmentCount=3, allPartyAlive=true → TRUE_GUARDIAN 미달 (파편 부족) */
export function makeAlmostEndingA_fragmentShort(): EndingFlags {
  return makeFlags({ fragmentCount: 3, allPartyAlive: true });
}

/** fragmentCount=2 → LAST_WITNESS 미달 */
export function makeAlmostEndingB(): EndingFlags {
  return makeFlags({ fragmentCount: 2 });
}

// ── 우선순위 충돌 팩토리 ─────────────────────────────────────

/** D + C 동시 충족 → D 우선 */
export function makeDAndCConflict(): EndingFlags {
  return makeFlags({ sacredArtifacts: 12, betrayalScore: 100 });
}

/** D + A 동시 충족 → D 우선 */
export function makeDAndAConflict(): EndingFlags {
  return makeFlags({
    sacredArtifacts: 12,
    fragmentCount: 4,
    allPartyAlive: true,
  });
}

/** C + A 동시 충족 → C 우선 */
export function makeCAndAConflict(): EndingFlags {
  return makeFlags({
    betrayalScore: 70,
    fragmentCount: 4,
    allPartyAlive: true,
  });
}

/** D + C + A + B 모두 충족 → D 우선 */
export function makeAllEndingsConflict(): EndingFlags {
  return makeFlags({
    sacredArtifacts: 12,
    betrayalScore: 100,
    fragmentCount: 4,
    allPartyAlive: true,
    endingAScore: 100,
    sealVisitedCount: 6,
    emperorSaved: true,
    letheUnderstood: true,
  });
}

// ── 매트릭스 테스트 유틸 ─────────────────────────────────────

/** party_alive 비트마스크 → allPartyAlive 변환 (63 = 모두 생존) */
export function bitmaskToAllPartyAlive(bitmask: number): boolean {
  return bitmask === 63;
}

/**
 * 매트릭스 조합에서 기대 엔딩을 계산.
 * judgeEnding 우선순위 로직과 동일.
 */
export function expectedEnding(params: {
  sacredArtifacts: number;
  fragmentCount: number;
  allPartyAlive: boolean;
  betrayalScore: number;
}): string {
  if (params.sacredArtifacts === 12) return 'DIVINE_RETURN';
  if (params.betrayalScore >= 70) return 'BETRAYAL';
  if (params.fragmentCount === 4 && params.allPartyAlive) return 'TRUE_GUARDIAN';
  if (params.fragmentCount >= 3) return 'LAST_WITNESS';
  return 'DEFEAT';
}
