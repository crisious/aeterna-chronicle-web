/**
 * 유닛 테스트 — SSOT-WIRE-01: 전투 도주 narration (BattleScene._attemptFlee)
 *
 * 게임 로직: BattleScene 의 도주 성공/실패 로그 문자열을 하드코딩 대신
 * SCENARIO_ESCAPE_NARRATIVES SSOT 에서 가져온다. emoji 는 scene 측,
 * 표시 텍스트(label)는 SSOT 단일 출처.
 *
 * 회귀 보호: 기존 화면 텍스트('🏃 도주 성공!' / '❌ 도주 실패!')가
 * SSOT wiring 후에도 그대로 유지되어야 한다 (무가시 변경).
 */
import { describe, expect, test } from 'vitest';

import {
  composeEscapeLog,
  escapeOutcomeFromResult,
  ESCAPE_LOG_EMOJI,
} from '../../client/src/combat/escapeNarration';
import {
  getEscapeNarrative,
  listEscapeOutcomes,
  type EscapeOutcome,
} from '../../shared/types/scenarioRegistry';

describe('SSOT-WIRE-01: 전투 도주 narration', () => {
  test('escapeOutcomeFromResult — boolean → EscapeOutcome', () => {
    expect(escapeOutcomeFromResult(true)).toBe('success');
    expect(escapeOutcomeFromResult(false)).toBe('fail');
  });

  test('composeEscapeLog — 기존 화면 텍스트 무가시 보존 (회귀 가드)', () => {
    // BattleScene._attemptFlee 가 쓰던 하드코딩과 100% 동일해야 한다
    expect(composeEscapeLog('success')).toBe('🏃 도주 성공!');
    expect(composeEscapeLog('fail')).toBe('❌ 도주 실패!');
  });

  test('composeEscapeLog — 텍스트는 SSOT label 단일 출처', () => {
    for (const outcome of listEscapeOutcomes()) {
      const narrative = getEscapeNarrative(outcome)!;
      // 로그 문자열이 SSOT label 을 포함해야 한다
      expect(composeEscapeLog(outcome)).toContain(narrative.label);
    }
  });

  test('composeEscapeLog — 모든 outcome 이 emoji 를 가진다', () => {
    for (const outcome of listEscapeOutcomes()) {
      expect(ESCAPE_LOG_EMOJI[outcome], outcome).toBeTruthy();
      // emoji 로 시작해야 한다
      expect(composeEscapeLog(outcome).startsWith(ESCAPE_LOG_EMOJI[outcome])).toBe(true);
    }
  });

  test('composeEscapeLog — 5 outcome 모두 비어있지 않은 로그', () => {
    const outcomes: readonly EscapeOutcome[] = listEscapeOutcomes();
    expect(outcomes.length).toBe(5);
    for (const outcome of outcomes) {
      const log = composeEscapeLog(outcome);
      expect(log.length, outcome).toBeGreaterThan(2);
    }
  });

  test('composeEscapeLog — 순수 함수 (동일 입력 → 동일 출력)', () => {
    expect(composeEscapeLog('success')).toBe(composeEscapeLog('success'));
    expect(composeEscapeLog('critical')).toBe(composeEscapeLog('critical'));
  });
});
