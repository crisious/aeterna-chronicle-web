/**
 * escapeNarration.ts — 전투 도주 로그 narration (SSOT wiring)
 *
 * BattleScene._attemptFlee 의 도주 성공/실패 로그 문자열을 하드코딩 대신
 * SCENARIO_ESCAPE_NARRATIVES SSOT(shared/types/scenarioRegistry) 에서 가져온다.
 *
 * - 표시 텍스트(label): SSOT 단일 출처
 * - emoji: scene/표현 계층 책임 → 여기서 outcome 별 매핑
 * - 순수 함수 (Phaser/DOM 비의존) → 단위 테스트 가능
 *
 * 기존 화면 텍스트('🏃 도주 성공!' / '❌ 도주 실패!')는 무가시로 보존된다.
 */
import { getEscapeNarrative, type EscapeOutcome } from '../../../shared/types/scenarioRegistry';

/** outcome 별 로그 emoji (표현 계층 — SSOT 텍스트와 분리) */
export const ESCAPE_LOG_EMOJI: Record<EscapeOutcome, string> = {
  success: '🏃',
  fail: '❌',
  blocked: '🚧',
  forbidden: '🔒',
  critical: '🆘',
};

/** 도주 판정 boolean → EscapeOutcome (현재 BattleScene 은 success/fail 2분기) */
export function escapeOutcomeFromResult(succeeded: boolean): EscapeOutcome {
  return succeeded ? 'success' : 'fail';
}

/**
 * 도주 결과 → 전투 로그 한 줄.
 * `{emoji} {SSOT label}!` 형태. SSOT 미정의 시 emoji 만으로 안전 fallback.
 */
export function composeEscapeLog(outcome: EscapeOutcome): string {
  const emoji = ESCAPE_LOG_EMOJI[outcome] ?? '•';
  const narrative = getEscapeNarrative(outcome);
  if (!narrative) {
    return `${emoji} 도주`;
  }
  return `${emoji} ${narrative.label}!`;
}
