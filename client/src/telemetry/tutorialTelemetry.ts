// ── 튜토리얼·온보딩 텔레메트리 ───────────────────────────────────
// 5종 게이트 학습 보장(100%) + 30분 한도 추적 + 자동 조정 트리거
// 출처: docs/release/tutorial-onboarding-user-guide.md §8 지표 약속

import type { CoachGate, CoachState } from '../constants/tutorial_coach_messages';

export interface TutorialGateEvent {
  /** event_id — 멱등키 */
  eventId: string;
  /** ISO 8601 */
  eventTs: string;
  /** session 식별자 */
  sessionId: string;
  /** 해시된 player id (PII 차단) */
  playerIdHash: string;
  gate: CoachGate;
  state: CoachState;
  /** 게이트 진입 후 통과까지의 경과 시간 (ms) */
  elapsedMs: number;
  /** 누적 재시도 횟수 (BLOCK·WARN 회차) */
  retries: number;
  /** 튜토리얼 시작 후 누적 (ms) — 30분 게이트 추적용 */
  tutorialElapsedMs: number;
  /** 빌드 버전 — 회귀 추적 */
  buildVersion: string;
  platform: 'web' | 'unity' | 'ue5' | 'ps5' | 'xbox';
  /** 자동 조정 트리거 — 누적 32분 초과시 다음 회차 보스 HP -5% */
  triggeredOvertime?: boolean;
}

export interface TutorialSessionSummary {
  sessionId: string;
  totalDurationMs: number;
  gatesCompleted: CoachGate[];
  gatesBlocked: CoachGate[];
  /** 5종 모두 PASS 시 true — 100% 학습 보장 지표의 분자 */
  fiveCorePassed: boolean;
  /** 30분 한도 초과 여부 */
  overtime: boolean;
  /** 다음 회차 자동 조정 — 보스 HP 인하률 (0.0 ~ 0.05) */
  nextSessionBossHpDelta: number;
}

export interface TutorialTelemetrySink {
  emit(event: TutorialGateEvent): void;
  finalize(summary: TutorialSessionSummary): void;
}

/** 인메모리 기본 sink — 테스트/런타임에서 추후 NetworkManager로 flush */
export class InMemoryTutorialSink implements TutorialTelemetrySink {
  readonly events: TutorialGateEvent[] = [];
  readonly summaries: TutorialSessionSummary[] = [];

  emit(event: TutorialGateEvent): void {
    this.events.push(event);
  }
  finalize(summary: TutorialSessionSummary): void {
    this.summaries.push(summary);
  }
}

function cryptoRandomId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return `tut_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

export interface BuildTutorialEventInput {
  sessionId: string;
  playerId: string;
  gate: CoachGate;
  state: CoachState;
  elapsedMs: number;
  retries: number;
  tutorialElapsedMs: number;
  buildVersion: string;
  platform: TutorialGateEvent['platform'];
  triggeredOvertime?: boolean;
}

export function buildTutorialEvent(input: BuildTutorialEventInput): TutorialGateEvent {
  return {
    eventId: cryptoRandomId(),
    eventTs: new Date().toISOString(),
    sessionId: input.sessionId,
    playerIdHash: `fnv1a:${fnv1a32(input.playerId)}`,
    gate: input.gate,
    state: input.state,
    elapsedMs: input.elapsedMs,
    retries: input.retries,
    tutorialElapsedMs: input.tutorialElapsedMs,
    buildVersion: input.buildVersion,
    platform: input.platform,
    triggeredOvertime: input.triggeredOvertime,
  };
}
